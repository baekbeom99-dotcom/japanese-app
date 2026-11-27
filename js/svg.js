'use strict';
// ============================================================
// svg.js — Parametric SVG 생성기 (마스코트, 도장, 집중선, 별)
// ============================================================

const AnimeSVG = (() => {
  let _uid = 0;
  function _nextId(prefix) {
    _uid += 1;
    return `${prefix}-${_uid}`;
  }

  /** 극좌표 → 직교좌표 변환 (12시 방향 0도 기준) */
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: Number((cx + r * Math.cos(rad)).toFixed(2)),
      y: Number((cy + r * Math.sin(rad)).toFixed(2)),
    };
  }

  /** 다각형/별/도장 톱니 포인트 문자열 생성 */
  function createStarPoints(cx, cy, points, outerR, innerR, rotationDeg = 0) {
    const step = Math.PI / points;
    const rot = ((rotationDeg - 90) * Math.PI) / 180;
    return Array.from({ length: points * 2 }, (_, i) => {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step + rot;
      const x = (cx + r * Math.cos(angle)).toFixed(2);
      const y = (cy + r * Math.sin(angle)).toFixed(2);
      return `${x},${y}`;
    }).join(' ');
  }

  /** Catmull-Rom 점 배열을 매끄러운 Cubic Bezier 경로 문자열로 변환 */
  function smoothSplinePath(points, tension = 0.25, closed = false) {
    if (points.length < 2) return '';
    const pts = closed
      ? [points[points.length - 1], ...points, points[0], points[1]]
      : [points[0], ...points, points[points.length - 1]];

    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2];

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return closed ? `${d} Z` : d;
  }

  function _resolveAvatar(equippedArg) {
    let eq = equippedArg;
    if (!eq && typeof Storage !== 'undefined' && typeof Storage.getEquippedAvatar === 'function') {
      eq = Storage.getEquippedAvatar();
    }
    const defaults = {
      outfit: 'outfit_basic',
      headband: 'headband_basic',
      shuriken: 'shuriken_classic',
      weapon: 'weapon_stick',
    };
    const merged = { ...defaults, ...(eq || {}) };
    const catalog = typeof AVATAR_ITEMS !== 'undefined' ? AVATAR_ITEMS : [];
    const find = (id, fb) => catalog.find(i => i.id === id) || catalog.find(i => i.id === fb) || {};
    return {
      outfit:   { primary: '#2563EB', trim: '#FACC15', id: merged.outfit, ...find(merged.outfit, 'outfit_basic') },
      headband: { color: '#2563EB', emblem: 'star', id: merged.headband, ...find(merged.headband, 'headband_basic') },
      shuriken: { color: '#94A3B8', rim: '#1E1B2E', shape: 'four', id: merged.shuriken, ...find(merged.shuriken, 'shuriken_classic') },
      weapon:   { color: '#B45309', accent: '#FDE68A', kind: 'bokken', id: merged.weapon, ...find(merged.weapon, 'weapon_stick') },
    };
  }

  /** 표창 도형 내부 SVG 그룹 (중심 0, 0) */
  function _shurikenShapeGroup(shape, color, rim, radius = 22) {
    const ink = 'var(--color-ink, #1E1B2E)';
    if (shape === 'sakura') {
      const petals = _sakuraBlossomPaths(0, 0, radius, 0);
      return `
        <path d="${petals}" fill="${color}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="0" cy="0" r="${(radius * 0.24).toFixed(2)}" fill="#FFFDF5" stroke="${rim}" stroke-width="2"/>
      `;
    }
    if (shape === 'ice') {
      const pts = createStarPoints(0, 0, 6, radius, radius * 0.42, 0);
      return `
        <polygon points="${pts}" fill="${color}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="0" cy="0" r="${(radius * 0.22).toFixed(2)}" fill="#E0F2FE" stroke="${rim}" stroke-width="1.8"/>
      `;
    }
    if (shape === 'flame') {
      const blades = Array.from({ length: 6 }, (_, i) => {
        const deg = i * 60;
        const tip = polarToCartesian(0, 0, radius, deg);
        const ctrl = polarToCartesian(0, 0, radius * 0.65, deg + 24);
        const base = polarToCartesian(0, 0, radius * 0.28, deg + 36);
        const base0 = polarToCartesian(0, 0, radius * 0.28, deg - 12);
        return `M ${base0.x} ${base0.y} Q ${ctrl.x} ${ctrl.y} ${tip.x} ${tip.y} L ${base.x} ${base.y} Z`;
      }).join(' ');
      return `
        <path d="${blades}" fill="${color}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="0" cy="0" r="${(radius * 0.24).toFixed(2)}" fill="#FEF08A" stroke="${rim}" stroke-width="2"/>
      `;
    }
    if (shape === 'fuma') {
      const pts = createStarPoints(0, 0, 4, radius * 1.05, radius * 0.34, 45);
      return `
        <circle cx="0" cy="0" r="${(radius * 0.56).toFixed(2)}" fill="none" stroke="${rim}" stroke-width="3"/>
        <polygon points="${pts}" fill="${color}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
        <circle cx="0" cy="0" r="${(radius * 0.20).toFixed(2)}" fill="#FFFDF5" stroke="${ink}" stroke-width="2"/>
      `;
    }
    // 기본 4날 표창
    return `
      <path d="${_shurikenPath(0, 0, radius, radius * 0.34, 0)}" fill="${color}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="0" cy="0" r="${(radius * 0.20).toFixed(2)}" fill="#FFFDF5" stroke="${ink}" stroke-width="2"/>
    `;
  }

  /** 표창 아이템 독립 Parametric SVG */
  function shurikenItem(shurikenId = 'shuriken_classic', size = 44) {
    const resolved = _resolveAvatar({ shuriken: shurikenId }).shuriken;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 60 60" width="${size}" height="${size}" aria-hidden="true" focusable="false" class="shuriken-svg">
        <g id="shuriken-body">${_shurikenShapeGroup(resolved.shape, resolved.color, resolved.rim, 23)}</g>
      </svg>
    `.trim();
  }

  /** 무기 SVG 그룹 (좌표 원점은 손잡이 근처) */
  function _weaponGroup(weapon, x, y, angleDeg = -25) {
    const ink = 'var(--color-ink, #1E1B2E)';
    const { kind, color, accent } = weapon;
    let body = '';

    if (kind === 'kunai') {
      body = `
        <circle cx="0" cy="14" r="5" fill="none" stroke="${ink}" stroke-width="2.6"/>
        <path d="M 0 18 Q 7 24 3 30" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
        <rect x="-2.5" y="0" width="5" height="10" rx="2" fill="${accent}" stroke="${ink}" stroke-width="2.2"/>
        <polygon points="0,-28 8,-4 0,1 -8,-4" fill="${color}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      `;
    } else if (kind === 'scroll') {
      body = `
        <rect x="-9" y="-20" width="18" height="36" rx="4" fill="${color}" stroke="${ink}" stroke-width="2.6"/>
        <rect x="-11" y="-23" width="22" height="6" rx="3" fill="${accent}" stroke="${ink}" stroke-width="2.2"/>
        <rect x="-11" y="13" width="22" height="6" rx="3" fill="${accent}" stroke="${ink}" stroke-width="2.2"/>
        <line x1="-9" y1="-2" x2="9" y2="-2" stroke="${accent}" stroke-width="3.5"/>
      `;
    } else if (kind === 'fan') {
      const fanPts = [
        'M 0 8',
        ...Array.from({ length: 7 }, (_, i) => {
          const p = polarToCartesian(0, 8, 28, -50 + i * (100 / 6));
          return `L ${p.x} ${p.y}`;
        }),
        'Z',
      ].join(' ');
      body = `
        <path d="${fanPts}" fill="${color}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
        <circle cx="0" cy="-6" r="5" fill="${accent}" stroke="${ink}" stroke-width="1.8"/>
        <rect x="-3" y="8" width="6" height="10" rx="2" fill="${accent}" stroke="${ink}" stroke-width="2.2"/>
      `;
    } else if (kind === 'katana') {
      body = `
        <path d="M -3 -36 Q 5 -18 2 4 L -3 4 Z" fill="${color}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <line x1="-1" y1="-30" x2="0" y2="2" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
        <rect x="-8" y="3" width="16" height="4.5" rx="2" fill="${accent}" stroke="${ink}" stroke-width="2"/>
        <rect x="-2.8" y="7.5" width="5.6" height="12" rx="2" fill="#1E1B2E"/>
      `;
    } else {
      // 기본 목검 (bokken)
      body = `
        <path d="M -3 -32 Q 4 -16 2 4 L -3 4 Z" fill="${color}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <rect x="-7" y="3" width="14" height="4" rx="2" fill="${accent}" stroke="${ink}" stroke-width="2"/>
        <rect x="-2.6" y="7" width="5.2" height="11" rx="2" fill="${color}" stroke="${ink}" stroke-width="2"/>
      `;
    }

    return `<g id="mascot-weapon" transform="translate(${x}, ${y}) rotate(${angleDeg})">${body}</g>`;
  }

  /**
   * 시바견 닌자 마스코트 "킨타" Parametric SVG (레퍼런스 기반 실감나는 도복 + 아바타 장비 + 포즈)
   * @param {'idle'|'happy'|'encourage'} [mood='idle']
   * @param {number} [size=132]
   * @param {{ equipped?:Object, pose?:string, flipX?:boolean }} [options={}]
   */
  function mascot(mood = 'idle', size = 132, options = {}) {
    const W = 200;
    const H = 200;
    const cx = 92;
    const cy = 74;
    const ink = 'var(--color-ink, #1E1B2E)';
    const furMain = '#EA7317';
    const furTop = '#FB923C';
    const furLight = '#FFF7ED';

    const eq = _resolveAvatar(options.equipped);
    const pose = options.pose || 'idle';
    const flipX = Boolean(options.flipX);

    const titleId = _nextId('mascot-title');
    const bgGradId = _nextId('mascot-bg');
    const furGradId = _nextId('mascot-fur');
    const giGradId = _nextId('mascot-gi');

    // 귀 (시바견 특유 삼각 귀 + 안쪽 살구색)
    const leftEar = `${cx - 38},54 ${cx - 30},16 ${cx - 10},40`;
    const rightEar = `${cx + 38},54 ${cx + 30},16 ${cx + 10},40`;
    const leftEarIn = `${cx - 32},50 ${cx - 28},25 ${cx - 15},41`;
    const rightEarIn = `${cx + 32},50 ${cx + 28},25 ${cx + 15},41`;

    // 말린 시바견 꼬리 (우측 엉덩이 뒤)
    const tailOuter = smoothSplinePath([
      { x: cx + 26, y: 152 },
      { x: cx + 50, y: 146 },
      { x: cx + 56, y: 126 },
      { x: cx + 40, y: 118 },
      { x: cx + 32, y: 132 },
    ], 0.35, false);

    // 펄럭이는 두 가닥 헤어밴드 리본 (우측으로 휘날림)
    const ribbonTop = `M ${cx + 36} ${cy - 26} Q ${cx + 66} ${cy - 30} ${cx + 88} ${cy - 48} Q ${cx + 84} ${cy - 36} ${cx + 78} ${cy - 32} Q ${cx + 58} ${cy - 20} ${cx + 36} ${cy - 19} Z`;
    const ribbonBot = `M ${cx + 36} ${cy - 20} Q ${cx + 68} ${cy - 22} ${cx + 94} ${cy - 16} Q ${cx + 86} ${cy - 10} ${cx + 78} ${cy - 7} Q ${cx + 56} ${cy - 12} ${cx + 35} ${cy - 15} Z`;

    // 눈/입/눈썹 표정
    const eyeY = cy + 2;
    const eyeDX = 16;
    let eyesMarkup = '';
    let mouthMarkup = '';

    if (mood === 'happy') {
      eyesMarkup = `
        <circle cx="${cx - eyeDX}" cy="${eyeY}" r="6.4" fill="${ink}"/>
        <circle cx="${cx - eyeDX - 2}" cy="${eyeY - 2.2}" r="2.3" fill="#FFFFFF"/>
        <circle cx="${cx - eyeDX + 2}" cy="${eyeY + 2}" r="1.1" fill="#FFFFFF"/>
        <circle cx="${cx + eyeDX}" cy="${eyeY}" r="6.4" fill="${ink}"/>
        <circle cx="${cx + eyeDX - 2}" cy="${eyeY - 2.2}" r="2.3" fill="#FFFFFF"/>
        <circle cx="${cx + eyeDX + 2}" cy="${eyeY + 2}" r="1.1" fill="#FFFFFF"/>
      `;
      mouthMarkup = `
        <path d="M ${cx - 8} ${cy + 15} Q ${cx - 4} ${cy + 20} ${cx} ${cy + 15} Q ${cx + 4} ${cy + 20} ${cx + 8} ${cy + 15}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M ${cx - 6.5} ${cy + 17} Q ${cx} ${cy + 29} ${cx + 6.5} ${cy + 17} Z" fill="#FB7185" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
      `;
    } else if (mood === 'encourage') {
      eyesMarkup = `
        <line x1="${cx - eyeDX - 5}" y1="${eyeY - 4}" x2="${cx - eyeDX + 5}" y2="${eyeY + 3}" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="${cx - eyeDX - 5}" y1="${eyeY + 4}" x2="${cx - eyeDX + 5}" y2="${eyeY - 2}" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="${cx + eyeDX}" cy="${eyeY}" r="5.6" fill="${ink}"/>
        <circle cx="${cx + eyeDX + 1.8}" cy="${eyeY - 1.8}" r="2" fill="#FFFFFF"/>
      `;
      mouthMarkup = `
        <path d="M ${cx - 8} ${cy + 18} Q ${cx} ${cy + 14} ${cx + 8} ${cy + 18}" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
      `;
    } else {
      eyesMarkup = `
        <circle cx="${cx - eyeDX}" cy="${eyeY}" r="5.8" fill="${ink}"/>
        <circle cx="${cx - eyeDX - 1.8}" cy="${eyeY - 2}" r="2.1" fill="#FFFFFF"/>
        <circle cx="${cx - eyeDX + 1.8}" cy="${eyeY + 1.8}" r="1" fill="#FFFFFF"/>
        <circle cx="${cx + eyeDX}" cy="${eyeY}" r="5.8" fill="${ink}"/>
        <circle cx="${cx + eyeDX - 1.8}" cy="${eyeY - 2}" r="2.1" fill="#FFFFFF"/>
        <circle cx="${cx + eyeDX + 1.8}" cy="${eyeY + 1.8}" r="1" fill="#FFFFFF"/>
      `;
      mouthMarkup = `
        <path d="M ${cx - 7} ${cy + 15} Q ${cx - 3.5} ${cy + 21} ${cx} ${cy + 15} Q ${cx + 3.5} ${cy + 21} ${cx + 7} ${cy + 15}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
      `;
    }

    // 헤어밴드 문양/장식
    let emblemMarkup = '';
    if (eq.headband.emblem === 'bolt') {
      emblemMarkup = `<polygon points="${cx + 2},${cy - 31} ${cx - 4},${cy - 23} ${cx + 1},${cy - 23} ${cx - 2},${cy - 15} ${cx + 5},${cy - 24} ${cx},${cy - 24}" fill="#FACC15" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
    } else if (eq.headband.emblem === 'sakura') {
      emblemMarkup = `<path d="${_sakuraBlossomPaths(cx, cy - 23, 7, 0)}" fill="#FBCFE8" stroke="#BE123C" stroke-width="1.2"/>`;
    } else if (eq.headband.emblem === 'horns') {
      emblemMarkup = `
        <polygon points="${cx - 20},${cy - 30} ${cx - 30},${cy - 50} ${cx - 10},${cy - 33}" fill="#FACC15" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <polygon points="${cx + 20},${cy - 30} ${cx + 30},${cy - 50} ${cx + 10},${cy - 33}" fill="#FACC15" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
      `;
    } else if (eq.headband.emblem === 'crown') {
      emblemMarkup = `
        <polygon points="${cx - 18},${cy - 32} ${cx - 20},${cy - 50} ${cx - 8},${cy - 41} ${cx},${cy - 54} ${cx + 8},${cy - 41} ${cx + 20},${cy - 50} ${cx + 18},${cy - 32}" fill="#FACC15" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      `;
    } else if (eq.headband.id !== 'headband_basic') {
      emblemMarkup = `<polygon points="${createStarPoints(cx, cy - 23, 5, 6.8, 3, 0)}" fill="#FACC15" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
    }

    // 포즈별 변환 & 팔/무기 배치
    let bodyTransform = '';
    let weaponAngle = -44;
    let weaponX = cx - 44;
    let weaponY = 122;
    let poseFx = '';
    let rightArmRaised = true;

    if (pose === 'slash') {
      bodyTransform = 'rotate(8 92 126)';
      weaponAngle = 32;
      weaponX = cx + 48;
      weaponY = 114;
      poseFx = `<path d="M 124 62 Q 174 96 138 158" fill="none" stroke="#FACC15" stroke-width="5.5" stroke-linecap="round" opacity="0.88"/>`;
    } else if (pose === 'kick') {
      bodyTransform = 'rotate(-10 92 126)';
      weaponAngle = -52;
      poseFx = `<polygon points="${createStarPoints(162, 134, 6, 13, 5, 12)}" fill="#FACC15" stroke="${ink}" stroke-width="2"/>`;
    } else if (pose === 'jump') {
      bodyTransform = 'translate(0, -10)';
      weaponAngle = -65;
      poseFx = `<line x1="54" y1="186" x2="132" y2="186" stroke="${ink}" stroke-width="3" stroke-dasharray="8 6" opacity="0.5"/>`;
    } else if (pose === 'throw') {
      bodyTransform = 'rotate(9 92 126)';
      weaponAngle = -68;
      weaponX = cx - 46;
      weaponY = 128;
      rightArmRaised = false;
      poseFx = `
        <line x1="138" y1="108" x2="178" y2="104" stroke="#FACC15" stroke-width="4" stroke-linecap="round"/>
        <line x1="142" y1="120" x2="174" y2="118" stroke="#E11D48" stroke-width="3" stroke-linecap="round"/>
      `;
    } else if (pose === 'meditate') {
      bodyTransform = 'translate(0, -4)';
      weaponAngle = 0;
      weaponX = cx + 48;
      weaponY = 136;
      rightArmRaised = false;
      poseFx = `<circle cx="${cx}" cy="${cy + 14}" r="80" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-dasharray="4 6" opacity="0.65"/>`;
    } else if (pose === 'poof') {
      poseFx = `
        <circle cx="34" cy="154" r="14" fill="#FFFFFF" stroke="${ink}" stroke-width="2.4" opacity="0.92"/>
        <circle cx="48" cy="160" r="10" fill="#FFFFFF" stroke="${ink}" stroke-width="2.4" opacity="0.92"/>
        <circle cx="152" cy="156" r="12" fill="#FFFFFF" stroke="${ink}" stroke-width="2.4" opacity="0.92"/>
      `;
    }

    const beltColor = eq.headband.color || eq.outfit.trim;
    const wrapColor = '#334155';

    const bodyMarkup = `
      <g id="mascot-pose-layer" transform="${bodyTransform}">
        <!-- 말린 꼬리 -->
        <g id="mascot-tail">
          <path d="${tailOuter}" fill="none" stroke="${furMain}" stroke-width="14" stroke-linecap="round"/>
          <path d="${tailOuter}" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>
          <circle cx="${cx + 42}" cy="120" r="6" fill="${furLight}"/>
        </g>

        <!-- 닌자 바지 & 각반 & 발 -->
        <g id="mascot-legs">
          <path d="M ${cx - 28} 152 L ${cx - 32} 170 L ${cx - 12} 170 L ${cx - 8} 152 Z" fill="${eq.outfit.primary}" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
          <line x1="${cx - 30}" y1="160" x2="${cx - 12}" y2="167" stroke="${ink}" stroke-width="1.8"/>
          <line x1="${cx - 12}" y1="160" x2="${cx - 30}" y2="167" stroke="${ink}" stroke-width="1.8"/>
          <ellipse cx="${cx - 22}" cy="174" rx="9" ry="6" fill="${furMain}" stroke="${ink}" stroke-width="2.6"/>
          <path d="M ${cx + 8} 152 L ${cx + 12} 175 L ${cx + 32} 175 L ${cx + 28} 152 Z" fill="${eq.outfit.primary}" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
          <line x1="${cx + 12}" y1="162" x2="${cx + 30}" y2="170" stroke="${ink}" stroke-width="1.8"/>
          <line x1="${cx + 30}" y1="162" x2="${cx + 12}" y2="170" stroke="${ink}" stroke-width="1.8"/>
          <ellipse cx="${cx + 22}" cy="179" rx="10" ry="6.5" fill="${furMain}" stroke="${ink}" stroke-width="2.6"/>
        </g>

        <!-- 실감나는 닌자 도복 (겹침 옷깃 + 팔 토시 + 허리띠 매듭) -->
        <g id="mascot-outfit">
          <path d="M ${cx - 30} 112 L ${cx - 50} 126 L ${cx - 40} 140 L ${cx - 24} 130 Z" fill="${eq.outfit.primary}" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
          <path d="M ${cx - 46} 124 L ${cx - 37} 136" stroke="${eq.outfit.trim}" stroke-width="2" opacity="0.8"/>
          <line x1="${cx - 46}" y1="126" x2="${cx - 34}" y2="132" stroke="${ink}" stroke-width="1.8"/>
          <circle cx="${cx - 47}" cy="126" r="8" fill="${furMain}" stroke="${ink}" stroke-width="2.6"/>

          ${rightArmRaised ? `
            <path d="M ${cx + 26} 116 L ${cx + 46} 96 L ${cx + 56} 106 L ${cx + 34} 130 Z" fill="${eq.outfit.primary}" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
            <line x1="${cx + 38}" y1="104" x2="${cx + 49}" y2="113" stroke="${ink}" stroke-width="1.8"/>
            <line x1="${cx + 42}" y1="115" x2="${cx + 46}" y2="100" stroke="${ink}" stroke-width="1.8"/>
            <circle cx="${cx + 52}" cy="98" r="8" fill="${furLight}" stroke="${ink}" stroke-width="2.6"/>
          ` : `
            <path d="M ${cx + 28} 114 L ${cx + 54} 116 L ${cx + 52} 130 L ${cx + 26} 128 Z" fill="${eq.outfit.primary}" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
            <circle cx="${cx + 56}" cy="122" r="8" fill="${furLight}" stroke="${ink}" stroke-width="2.6"/>
          `}

          <path d="M ${cx - 32} 108 L ${cx + 32} 108 L ${cx + 37} 154 L ${cx - 37} 154 Z" fill="url(#${giGradId})" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
          <path d="M ${cx + 16} 108 L ${cx - 10} 138 L ${cx - 2} 142 L ${cx + 22} 110 Z" fill="${wrapColor}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M ${cx - 20} 108 L ${cx + 14} 142 L ${cx + 20} 138 L ${cx - 12} 108 Z" fill="${eq.outfit.trim}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
          <line x1="${cx - 18}" y1="146" x2="${cx - 22}" y2="154" stroke="${ink}" stroke-width="1.8" opacity="0.45"/>
          <line x1="${cx + 18}" y1="146" x2="${cx + 22}" y2="154" stroke="${ink}" stroke-width="1.8" opacity="0.45"/>

          <path d="M ${cx - 35} 135 Q ${cx} 141 ${cx + 35} 135 L ${cx + 36} 144 Q ${cx} 150 ${cx - 36} 144 Z" fill="${beltColor}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
          <polygon points="${cx - 2},144 ${cx - 14},160 ${cx - 6},162 ${cx + 2},146" fill="${beltColor}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
          <polygon points="${cx + 2},144 ${cx + 15},160 ${cx + 7},162 ${cx - 2},146" fill="${beltColor}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/>
          <ellipse cx="${cx}" cy="142" rx="7" ry="5.5" fill="${beltColor}" stroke="${ink}" stroke-width="2.4"/>
        </g>

        <!-- 귀 -->
        <g id="mascot-ears">
          <polygon points="${leftEar}" fill="${furMain}" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
          <polygon points="${rightEar}" fill="${furMain}" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
          <polygon points="${leftEarIn}" fill="#FDBA74"/>
          <polygon points="${rightEarIn}" fill="#FDBA74"/>
        </g>

        <!-- 시바견 머리 + 우라지로 + 눈썹 점 -->
        <g id="mascot-head">
          <path d="M ${cx - 43} ${cy + 4} C ${cx - 44} ${cy - 28}, ${cx - 26} ${cy - 36}, ${cx} ${cy - 36} C ${cx + 26} ${cy - 36}, ${cx + 44} ${cy - 28}, ${cx + 43} ${cy + 4} C ${cx + 44} ${cy + 26}, ${cx + 26} ${cy + 34}, ${cx} ${cy + 34} C ${cx - 26} ${cy + 34}, ${cx - 44} ${cy + 26}, ${cx - 43} ${cy + 4} Z" fill="url(#${furGradId})" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
          <path d="M ${cx - 40} ${cy + 8} Q ${cx - 22} ${cy + 2} ${cx - 8} ${cy + 8} Q ${cx} ${cy - 2} ${cx + 8} ${cy + 8} Q ${cx + 22} ${cy + 2} ${cx + 40} ${cy + 8} C ${cx + 38} ${cy + 26}, ${cx + 22} ${cy + 32}, ${cx} ${cy + 32} C ${cx - 22} ${cy + 32}, ${cx - 38} ${cy + 26}, ${cx - 40} ${cy + 8} Z" fill="${furLight}"/>
          <ellipse cx="${cx - 14}" cy="${cy - 10}" rx="5" ry="2.8" fill="${furLight}" transform="rotate(-12 ${cx - 14} ${cy - 10})"/>
          <ellipse cx="${cx + 14}" cy="${cy - 10}" rx="5" ry="2.8" fill="${furLight}" transform="rotate(12 ${cx + 14} ${cy - 10})"/>
        </g>

        <!-- 흐르는 닌자 헤어밴드 + 리본 -->
        <g id="mascot-headband">
          <path d="${ribbonTop}" fill="${eq.headband.color}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
          <path d="${ribbonBot}" fill="${eq.headband.color}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
          <path d="M ${cx - 39} ${cy - 18} Q ${cx} ${cy - 24} ${cx + 39} ${cy - 18} L ${cx + 40} ${cy - 28} Q ${cx} ${cy - 34} ${cx - 40} ${cy - 28} Z" fill="${eq.headband.color}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
          <line x1="${cx - 34}" y1="${cy - 23}" x2="${cx + 34}" y2="${cy - 23}" stroke="${ink}" stroke-width="1.3" opacity="0.35"/>
          <circle cx="${cx + 38}" cy="${cy - 22}" r="4.5" fill="${eq.headband.color}" stroke="${ink}" stroke-width="2.4"/>
          ${emblemMarkup}
        </g>

        <!-- 얼굴 표정 -->
        <g id="mascot-face">
          ${eyesMarkup}
          <ellipse cx="${cx}" cy="${cy + 9}" rx="5.2" ry="3.8" fill="${ink}"/>
          <ellipse cx="${cx - 1.5}" cy="${cy + 7.8}" rx="1.6" ry="1" fill="#FFFFFF" opacity="0.7"/>
          ${mouthMarkup}
        </g>

        <!-- 착용 무기 -->
        ${_weaponGroup(eq.weapon, weaponX, weaponY, weaponAngle)}
      </g>
    `;

    const moodTitle = mood === 'happy'
      ? '기뻐하는 시바 닌자 마스코트 킨타'
      : mood === 'encourage'
        ? '응원하는 시바 닌자 마스코트 킨타'
        : '시바 닌자 마스코트 킨타';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-labelledby="${titleId}" class="mascot-svg mascot-svg--${mood} mascot-pose--${pose}">
        <title id="${titleId}">${moodTitle}</title>
        <defs>
          <radialGradient id="${bgGradId}" cx="50%" cy="48%" r="50%">
            <stop offset="0%" stop-color="#FEF08A"/>
            <stop offset="100%" stop-color="#FDE047" stop-opacity="0.16"/>
          </radialGradient>
          <linearGradient id="${furGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${furTop}"/>
            <stop offset="100%" stop-color="${furMain}"/>
          </linearGradient>
          <linearGradient id="${giGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${eq.outfit.primary}"/>
            <stop offset="100%" stop-color="${eq.outfit.primary}" stop-opacity="0.88"/>
          </linearGradient>
        </defs>
        <g id="mascot-backdrop">
          <circle cx="${cx}" cy="${cy + 20}" r="78" fill="url(#${bgGradId})" stroke="${ink}" stroke-width="2.6" stroke-dasharray="6 4"/>
        </g>
        <g id="mascot-root" ${flipX ? `transform="translate(${W}, 0) scale(-1, 1)"` : ''}>
          ${bodyMarkup}
          ${poseFx}
        </g>
      </svg>
    `.trim();
  }

  /**
   * 퀴즈 배틀 표적 Parametric SVG (짚 인형·과녁·사과·수박·달마·분재화분·선인장)
   * @param {'straw_doll'|'bullseye'|'apple'|'watermelon'|'daruma'|'bonsai'|'cactus'} kind
   * @param {'idle'|'hit'|'miss'} [state='idle']
   * @param {number} [size=86]
   */
  function quizTarget(kind = 'straw_doll', state = 'idle', size = 86) {
    const W = 120;
    const H = 120;
    const cx = 60;
    const ink = 'var(--color-ink, #1E1B2E)';
    const titleId = _nextId('target-title');
    const gradId = _nextId('target-grad');
    let defsExtra = '';
    let body = '';

    if (kind === 'bullseye') {
      body = `
        <line x1="36" y1="108" x2="52" y2="70" stroke="#92400E" stroke-width="6.5" stroke-linecap="round"/>
        <line x1="84" y1="108" x2="68" y2="70" stroke="#92400E" stroke-width="6.5" stroke-linecap="round"/>
        <line x1="60" y1="106" x2="60" y2="76" stroke="#78350F" stroke-width="5" stroke-linecap="round"/>
        <circle cx="${cx}" cy="52" r="38" fill="#D97706" stroke="${ink}" stroke-width="3"/>
        <circle cx="${cx}" cy="52" r="33" fill="#FFFFFF" stroke="${ink}" stroke-width="2.6"/>
        <circle cx="${cx}" cy="52" r="24" fill="#E11D48" stroke="${ink}" stroke-width="2.4"/>
        <circle cx="${cx}" cy="52" r="14" fill="#FFFFFF" stroke="${ink}" stroke-width="2"/>
        <circle cx="${cx}" cy="52" r="6" fill="#FACC15" stroke="${ink}" stroke-width="2"/>
      `;
    } else if (kind === 'apple') {
      defsExtra = `
        <radialGradient id="${gradId}" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stop-color="#FCA5A5"/>
          <stop offset="45%" stop-color="#EF4444"/>
          <stop offset="100%" stop-color="#B91C1C"/>
        </radialGradient>
      `;
      if (state === 'hit') {
        body = `
          <rect x="24" y="94" width="72" height="12" rx="4" fill="#B45309" stroke="${ink}" stroke-width="2.8"/>
          <path d="M 52 44 C 34 38, 22 56, 28 74 C 32 88, 44 92, 54 88 Z" fill="url(#${gradId})" stroke="${ink}" stroke-width="2.8" transform="rotate(-14 42 68)"/>
          <path d="M 68 44 C 86 38, 98 56, 92 74 C 88 88, 76 92, 66 88 Z" fill="#FEF3C7" stroke="${ink}" stroke-width="2.8" transform="rotate(14 78 68)"/>
          <circle cx="74" cy="68" r="2" fill="#78350F"/>
          <circle cx="80" cy="72" r="2" fill="#78350F"/>
          <circle cx="58" cy="30" r="4" fill="#EF4444"/>
          <circle cx="72" cy="34" r="3" fill="#FCA5A5"/>
        `;
      } else {
        body = `
          <rect x="26" y="94" width="68" height="12" rx="4" fill="#B45309" stroke="${ink}" stroke-width="2.8"/>
          <line x1="34" y1="100" x2="86" y2="100" stroke="#78350F" stroke-width="1.6"/>
          <path d="M 60 28 Q 74 14 79 25 Q 68 32 60 28 Z" fill="#10B981" stroke="${ink}" stroke-width="2.4"/>
          <line x1="60" y1="28" x2="60" y2="38" stroke="#78350F" stroke-width="4.2" stroke-linecap="round"/>
          <path d="M 60 39 C 37 30, 24 52, 30 74 C 35 90, 50 95, 60 90 C 70 95, 85 90, 90 74 C 96 52, 83 30, 60 39 Z" fill="url(#${gradId})" stroke="${ink}" stroke-width="3"/>
          <ellipse cx="45" cy="54" rx="5.5" ry="10" fill="#FFFFFF" opacity="0.45" transform="rotate(-18 45 54)"/>
        `;
      }
    } else if (kind === 'watermelon') {
      if (state === 'hit') {
        body = `
          <rect x="24" y="94" width="72" height="12" rx="4" fill="#B45309" stroke="${ink}" stroke-width="2.8"/>
          <path d="M 24 68 A 36 36 0 0 0 96 68 Z" fill="#16A34A" stroke="${ink}" stroke-width="3"/>
          <path d="M 30 68 A 30 30 0 0 0 90 68 Z" fill="#FB7185" stroke="${ink}" stroke-width="2"/>
          <circle cx="48" cy="76" r="2.2" fill="${ink}"/>
          <circle cx="60" cy="82" r="2.2" fill="${ink}"/>
          <circle cx="72" cy="75" r="2.2" fill="${ink}"/>
          <circle cx="54" cy="40" r="4" fill="#FB7185"/>
          <circle cx="68" cy="44" r="3" fill="#F43F5E"/>
        `;
      } else {
        body = `
          <rect x="26" y="94" width="68" height="12" rx="4" fill="#B45309" stroke="${ink}" stroke-width="2.8"/>
          <path d="M 60 28 Q 66 16 74 20" fill="none" stroke="#15803D" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="${cx}" cy="60" r="33" fill="#22C55E" stroke="${ink}" stroke-width="3"/>
          <path d="M 44 31 Q 52 60 44 89" fill="none" stroke="#14532D" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M 60 27 L 60 93" fill="none" stroke="#14532D" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M 76 31 Q 68 60 76 89" fill="none" stroke="#14532D" stroke-width="4.5" stroke-linecap="round"/>
          <ellipse cx="46" cy="44" rx="5" ry="9" fill="#FFFFFF" opacity="0.35" transform="rotate(-24 46 44)"/>
        `;
      }
    } else if (kind === 'daruma') {
      body = `
        <ellipse cx="${cx}" cy="64" rx="36" ry="38" fill="#E11D48" stroke="${ink}" stroke-width="3.2"/>
        <ellipse cx="${cx}" cy="49" rx="23" ry="15" fill="#FEF3C7" stroke="${ink}" stroke-width="2.4"/>
        <path d="M 42 42 Q 49 38 55 43" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M 65 43 Q 71 38 78 42" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
        <circle cx="49" cy="49" r="4.5" fill="${ink}"/>
        <circle cx="71" cy="49" r="4.5" fill="${ink}"/>
        <path d="M 48 58 Q 60 54 72 58" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M 38 78 Q 60 88 82 78" fill="none" stroke="#FACC15" stroke-width="5.5" stroke-linecap="round"/>
        <text x="${cx}" y="82" text-anchor="middle" font-family="var(--font-ja)" font-size="14" font-weight="800" fill="#FACC15">勝</text>
      `;
    } else if (kind === 'bonsai') {
      const trunk = smoothSplinePath([
        { x: 56, y: 80 },
        { x: 48, y: 62 },
        { x: 68, y: 46 },
        { x: 60, y: 30 },
      ], 0.35, false);
      body = `
        <rect x="34" y="102" width="10" height="6" rx="2" fill="#1E3A8A" stroke="${ink}" stroke-width="2.2"/>
        <rect x="76" y="102" width="10" height="6" rx="2" fill="#1E3A8A" stroke="${ink}" stroke-width="2.2"/>
        <path d="M 28 80 L 92 80 L 86 102 L 34 102 Z" fill="#1D4ED8" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
        <rect x="24" y="75" width="72" height="8" rx="3" fill="#3B82F6" stroke="${ink}" stroke-width="2.6"/>
        <ellipse cx="60" cy="76" rx="28" ry="3.5" fill="#78350F"/>
        <path d="${trunk}" fill="none" stroke="#78350F" stroke-width="10" stroke-linecap="round"/>
        <path d="${trunk}" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M 55 56 Q 38 50 32 42" fill="none" stroke="#78350F" stroke-width="6" stroke-linecap="round"/>
        <ellipse cx="32" cy="40" rx="16" ry="10" fill="#15803D" stroke="${ink}" stroke-width="2.5"/>
        <ellipse cx="86" cy="48" rx="15" ry="9" fill="#16A34A" stroke="${ink}" stroke-width="2.5"/>
        <ellipse cx="60" cy="26" rx="22" ry="13" fill="#22C55E" stroke="${ink}" stroke-width="2.6"/>
        <ellipse cx="56" cy="22" rx="10" ry="5" fill="#86EFAC" opacity="0.6"/>
        ${state === 'hit' ? `
          <ellipse cx="26" cy="22" rx="5" ry="2.5" fill="#22C55E" transform="rotate(-30 26 22)"/>
          <ellipse cx="94" cy="26" rx="5" ry="2.5" fill="#16A34A" transform="rotate(35 94 26)"/>
        ` : ''}
      `;
    } else if (kind === 'cactus') {
      const needles = [
        { x: 48, y: 40, dx: -6, dy: -2 }, { x: 48, y: 58, dx: -6, dy: 0 },
        { x: 72, y: 40, dx: 6, dy: -2 },  { x: 72, y: 58, dx: 6, dy: 0 },
        { x: 30, y: 48, dx: -5, dy: -3 }, { x: 90, y: 44, dx: 5, dy: -3 },
      ].map(n => `<line x1="${n.x}" y1="${n.y}" x2="${n.x + n.dx}" y2="${n.y + n.dy}" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`).join('');
      const flower = _sakuraBlossomPaths(cx, 22, 9.5, 0);
      body = `
        <path d="M 34 80 L 86 80 L 80 108 L 40 108 Z" fill="#EA580C" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
        <rect x="30" y="73" width="60" height="9" rx="3" fill="#F97316" stroke="${ink}" stroke-width="2.6"/>
        <path d="M 48 64 L 35 64 Q 27 64 27 54 L 27 46 A 6 6 0 0 1 39 46 L 39 54 L 48 54 Z" fill="#16A34A" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="M 72 60 L 85 60 Q 93 60 93 50 L 93 42 A 6 6 0 0 0 81 42 L 81 50 L 72 50 Z" fill="#16A34A" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
        <rect x="48" y="26" width="24" height="50" rx="12" fill="#22C55E" stroke="${ink}" stroke-width="2.8"/>
        <line x1="55" y1="30" x2="55" y2="74" stroke="#15803D" stroke-width="2" stroke-linecap="round"/>
        <line x1="65" y1="30" x2="65" y2="74" stroke="#15803D" stroke-width="2" stroke-linecap="round"/>
        ${needles}
        <path d="${flower}" fill="#FB7185" stroke="${ink}" stroke-width="1.8" ${state === 'hit' ? 'transform="translate(14, -10) rotate(25 60 22)"' : ''}/>
        <circle cx="${cx}" cy="${state === 'hit' ? 12 : 22}" r="3" fill="#FACC15" ${state === 'hit' ? 'transform="translate(14, 0)"' : ''}/>
      `;
    } else {
      body = `
        <line x1="60" y1="90" x2="60" y2="110" stroke="#78350F" stroke-width="6" stroke-linecap="round"/>
        <line x1="48" y1="110" x2="72" y2="110" stroke="#78350F" stroke-width="5" stroke-linecap="round"/>
        <rect x="20" y="48" width="80" height="15" rx="7" fill="#FDE68A" stroke="${ink}" stroke-width="2.8"/>
        <line x1="25" y1="53" x2="16" y2="50" stroke="#B45309" stroke-width="2"/>
        <line x1="25" y1="58" x2="16" y2="61" stroke="#B45309" stroke-width="2"/>
        <line x1="95" y1="53" x2="104" y2="50" stroke="#B45309" stroke-width="2"/>
        <line x1="95" y1="58" x2="104" y2="61" stroke="#B45309" stroke-width="2"/>
        <rect x="47" y="44" width="26" height="48" rx="11" fill="#FCD34D" stroke="${ink}" stroke-width="2.8"/>
        <line x1="54" y1="48" x2="54" y2="88" stroke="#D97706" stroke-width="1.6" stroke-dasharray="4 3"/>
        <line x1="66" y1="48" x2="66" y2="88" stroke="#D97706" stroke-width="1.6" stroke-dasharray="4 3"/>
        <line x1="47" y1="62" x2="73" y2="62" stroke="#92400E" stroke-width="4"/>
        <line x1="47" y1="73" x2="73" y2="73" stroke="#92400E" stroke-width="4"/>
        <path d="M 52 14 L 56 6 M 60 13 L 60 4 M 68 14 L 64 6" stroke="#B45309" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="${cx}" cy="30" r="17" fill="#FDE68A" stroke="${ink}" stroke-width="2.8"/>
        <line x1="51" y1="26" x2="56" y2="31" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="56" y1="26" x2="51" y2="31" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="64" y1="26" x2="69" y2="31" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="69" y1="26" x2="64" y2="31" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M 55 38 Q 60 35 65 38" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
      `;
    }

    let stateFx = '';
    if (state === 'hit') {
      const burstPts = createStarPoints(cx, 54, 8, 25, 11, 15);
      stateFx = `
        <g id="target-hit-fx">
          <polygon points="${burstPts}" fill="#FACC15" stroke="${ink}" stroke-width="2.4" opacity="0.95"/>
          <text x="${cx}" y="59" text-anchor="middle" font-family="var(--font-display)" font-size="15" fill="#E11D48">명중!</text>
        </g>
      `;
    } else if (state === 'miss') {
      stateFx = `
        <g id="target-miss-fx">
          <path d="M 96 22 Q 105 32 96 38 Q 87 32 96 22 Z" fill="#38BDF8" stroke="${ink}" stroke-width="2"/>
          <text x="${cx}" y="114" text-anchor="middle" font-family="var(--font-display)" font-size="13" fill="#2563EB">휴~ 피했다!</text>
        </g>
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-labelledby="${titleId}" class="target-svg target-svg--${state}">
        <title id="${titleId}">표적 (${kind})</title>
        <defs>${defsExtra}</defs>
        <g id="target-body" ${state === 'hit' ? 'transform="rotate(9 60 65)"' : ''}>${body}</g>
        ${stateFx}
      </svg>
    `.trim();
  }

  /** 아바타 상점 카드용 아이템 미리보기 SVG */
  function avatarItemPreview(item, size = 60) {
    const ink = 'var(--color-ink, #1E1B2E)';
    if (item.category === 'shuriken') {
      return shurikenItem(item.id, size);
    }
    if (item.category === 'weapon') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-35 -42 70 76" width="${size}" height="${size}" aria-hidden="true" focusable="false">
          ${_weaponGroup(item, 0, 8, 20)}
        </svg>
      `.trim();
    }
    if (item.category === 'headband') {
      return mascot('idle', size, { equipped: { headband: item.id, outfit: 'outfit_basic', weapon: 'weapon_stick', shuriken: 'shuriken_classic' } });
    }
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" width="${size}" height="${size}" aria-hidden="true" focusable="false">
        <path d="M 18 16 L 70 16 L 76 74 L 12 74 Z" fill="${item.primary}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 52 16 L 34 44 L 40 48 L 58 18 Z" fill="#334155" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M 28 16 L 52 46 L 57 42 L 35 16 Z" fill="${item.trim}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <rect x="14" y="50" width="60" height="9" rx="3" fill="${item.trim}" stroke="${ink}" stroke-width="2.4"/>
        <ellipse cx="44" cy="54.5" rx="6.5" ry="4.5" fill="${item.trim}" stroke="${ink}" stroke-width="2.2"/>
      </svg>
    `.trim();
  }

  /**
   * "참 잘했어요" 도장 배지 Parametric SVG
   * @param {{ id:string, title:string, kanji:string, color:string }} stamp
   * @param {boolean} unlocked
   */
  function stampBadge(stamp, unlocked) {
    const titleId = _nextId('stamp-title');
    const ink = 'var(--color-ink, #1E1B2E)';
    const sealPoints = createStarPoints(0, 0, 14, 44, 38, 0);
    const fillMain = unlocked ? (stamp.color || '#2563EB') : '#E2E8F0';
    const fillInner = unlocked ? '#FFFDF5' : '#F1F5F9';
    const textColor = unlocked ? fillMain : '#94A3B8';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" width="84" height="84" role="img" aria-labelledby="${titleId}" class="stamp-svg ${unlocked ? 'stamp-svg--unlocked' : 'stamp-svg--locked'}">
        <title id="${titleId}">${stamp.title} (${unlocked ? '획득함' : '미획득'})</title>
        <g id="stamp-seal-outer">
          <polygon points="${sealPoints}" fill="${fillMain}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="0" cy="0" r="30" fill="${fillInner}" stroke="${ink}" stroke-width="2.5"/>
          <circle cx="0" cy="0" r="24" fill="none" stroke="${textColor}" stroke-width="2" stroke-dasharray="4 3"/>
        </g>
        <g id="stamp-seal-symbol">
          <text x="0" y="9" text-anchor="middle" font-family="var(--font-ja)" font-size="28" font-weight="800" fill="${textColor}">${unlocked ? stamp.kanji : '?'}</text>
        </g>
      </svg>
    `.trim();
  }

  /**
   * 소년만화 집중선(Speed Lines) 배경 장식 SVG
   */
  function speedLines() {
    const rayCount = 24;
    const innerR = 88;
    const outerR = 196;
    const halfAngle = 2.4;
    const wedges = [];

    for (let i = 0; i < rayCount; i++) {
      const deg = (360 / rayCount) * i;
      const p1 = polarToCartesian(0, 0, innerR + (i % 2) * 18, deg);
      const p2 = polarToCartesian(0, 0, outerR, deg - halfAngle);
      const p3 = polarToCartesian(0, 0, outerR, deg + halfAngle);
      wedges.push(`<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="#1E1B2E" opacity="${i % 2 === 0 ? '0.12' : '0.07'}"/>`);
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" class="speed-lines-svg">
        <g id="speed-rays">${wedges.join('')}</g>
      </svg>
    `.trim();
  }

  /**
   * 별 아이콘 Parametric SVG
   * @param {boolean} [filled=true]
   * @param {number} [size=20]
   */
  function starIcon(filled = true, size = 20) {
    const pts = createStarPoints(12, 12, 5, 10, 4.4, 0);
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false" class="star-icon">
        <polygon points="${pts}" fill="${filled ? '#FACC15' : '#E2E8F0'}" stroke="#1E1B2E" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `.trim();
  }

  /** 결정적 의사난수 생성기 (문제별 무늬 변주용) */
  function _createRng(seed = 0) {
    let s = (Math.floor(seed) + 1) * 2654435761 >>> 0;
    return () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /**
   * 4날 닌자 표창(수리검) 경로 생성
   */
  function _shurikenPath(cx, cy, rOuter, rInner, rotDeg = 0) {
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const aTip = rotDeg + i * 90;
      const aMid = aTip + 45;
      const tip = polarToCartesian(cx, cy, rOuter, aTip);
      const mid = polarToCartesian(cx, cy, rInner, aMid);
      pts.push(`${i === 0 ? 'M' : 'L'} ${tip.x} ${tip.y} L ${mid.x} ${mid.y}`);
    }
    return `${pts.join(' ')} Z`;
  }

  /**
   * 타원형 영역에서 가장자리 밀집·중앙 희소 좌표 샘플링
   */
  function _sampleBorderBiasedPoint(rng, cx, cy, rx, ry, minNorm, maxNorm) {
    const angle = rng() * Math.PI * 2;
    // 제곱근 대신 선형/제곱 편향으로 테두리 쪽 빈도를 높임
    const t = minNorm + (maxNorm - minNorm) * Math.pow(rng(), 0.6);
    return {
      x: Number((cx + rx * t * Math.cos(angle)).toFixed(2)),
      y: Number((cy + ry * t * Math.sin(angle)).toFixed(2)),
      norm: t,
    };
  }

  /**
   * 5잎 사쿠라 꽃잎 1개 경로 생성 (끝부분 V자 노치 포함)
   */
  function _sakuraPetalPath(cx, cy, rOuter, rNotch, rBase, angleDeg, spreadDeg = 30) {
    const baseL = polarToCartesian(cx, cy, rBase, angleDeg - 16);
    const ctrlL = polarToCartesian(cx, cy, rOuter * 0.72, angleDeg - spreadDeg);
    const tipL  = polarToCartesian(cx, cy, rOuter, angleDeg - 8.5);
    const notch = polarToCartesian(cx, cy, rNotch, angleDeg);
    const tipR  = polarToCartesian(cx, cy, rOuter, angleDeg + 8.5);
    const ctrlR = polarToCartesian(cx, cy, rOuter * 0.72, angleDeg + spreadDeg);
    const baseR = polarToCartesian(cx, cy, rBase, angleDeg + 16);

    return [
      `M ${baseL.x} ${baseL.y}`,
      `Q ${ctrlL.x} ${ctrlL.y} ${tipL.x} ${tipL.y}`,
      `L ${notch.x} ${notch.y}`,
      `L ${tipR.x} ${tipR.y}`,
      `Q ${ctrlR.x} ${ctrlR.y} ${baseR.x} ${baseR.y}`,
      'Z',
    ].join(' ');
  }

  /**
   * 5잎 사쿠라 꽃 전체 실루엣 경로 생성
   */
  function _sakuraBlossomPaths(cx, cy, rOuter, rotationDeg = 0) {
    const rNotch = rOuter * 0.78;
    const rBase  = rOuter * 0.13;
    return Array.from({ length: 5 }, (_, i) =>
      _sakuraPetalPath(cx, cy, rOuter, rNotch, rBase, rotationDeg + i * 72)
    ).join(' ');
  }

  /**
   * 문제 박스(#quiz-stage) 내부 전용 일본풍 배경 무늬 Parametric SVG
   * 문제마다 표창·흩날리는 벚꽃잎·전통 기하 무늬를 테두리 밀집 / 중앙 희소 배치
   * @param {number} [seed=0]
   */
  function quizStageBackdrop(seed = 0) {
    const W = 800;
    const H = 320;
    const cx = W / 2;
    const cy = H / 2;
    const rng = _createRng(seed + 17);
    const patId = _nextId('jp-pattern');
    const maskId = _nextId('jp-border-mask');
    const theme = Math.abs(seed) % 3;

    let patternMarkup = '';
    if (theme === 0) {
      // 청해파(青海波) 물결 무늬
      patternMarkup = `
        <pattern id="${patId}" width="40" height="24" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="24" r="18" fill="none" stroke="#2563EB" stroke-opacity="0.14" stroke-width="1.6"/>
          <circle cx="20" cy="24" r="11" fill="none" stroke="#2563EB" stroke-opacity="0.11" stroke-width="1.4"/>
          <circle cx="0" cy="12" r="18" fill="none" stroke="#2563EB" stroke-opacity="0.10" stroke-width="1.4"/>
          <circle cx="40" cy="12" r="18" fill="none" stroke="#2563EB" stroke-opacity="0.10" stroke-width="1.4"/>
        </pattern>
      `;
    } else if (theme === 1) {
      // 마름모(아사노하풍) 기하 무늬
      patternMarkup = `
        <pattern id="${patId}" width="36" height="36" patternUnits="userSpaceOnUse">
          <polygon points="18,2 34,18 18,34 2,18" fill="none" stroke="#1E1B2E" stroke-opacity="0.11" stroke-width="1.3"/>
          <line x1="18" y1="2" x2="18" y2="34" stroke="#E11D48" stroke-opacity="0.10" stroke-width="1.1"/>
          <line x1="2" y1="18" x2="34" y2="18" stroke="#E11D48" stroke-opacity="0.10" stroke-width="1.1"/>
        </pattern>
      `;
    } else {
      // 표창 바람결 사선 무늬
      patternMarkup = `
        <pattern id="${patId}" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
          <line x1="0" y1="8" x2="32" y2="8" stroke="#1E1B2E" stroke-opacity="0.09" stroke-width="1.6" stroke-dasharray="10 6"/>
          <line x1="0" y1="24" x2="32" y2="24" stroke="#F59E0B" stroke-opacity="0.16" stroke-width="1.6" stroke-dasharray="6 8"/>
        </pattern>
      `;
    }

    // 표창 무늬 (테두리 영역 중심)
    const shurikenNodes = [];
    for (let i = 0; i < 8; i++) {
      const p = _sampleBorderBiasedPoint(rng, cx, cy, 385, 145, 0.68, 0.98);
      const rOut = 12 + rng() * 14;
      const rot = rng() * 90;
      const opacity = (0.12 + (p.norm - 0.65) * 0.25).toFixed(2);
      shurikenNodes.push(`
        <g transform="translate(${p.x}, ${p.y})">
          <path d="${_shurikenPath(0, 0, rOut, rOut * 0.36, rot)}" fill="#1E1B2E" opacity="${opacity}"/>
          <circle cx="0" cy="0" r="${(rOut * 0.18).toFixed(2)}" fill="#FFFDF5" opacity="0.8"/>
        </g>
      `);
    }

    // 흩날리는 벚꽃 잎 낱장들 (테두리에 많고 중앙으로 갈수록 희소)
    const petalNodes = [];
    const petalZones = [
      { count: 12, minN: 0.72, maxN: 0.99, minR: 12, maxR: 22, opBase: 0.28 },
      { count: 5,  minN: 0.52, maxN: 0.70, minR: 9,  maxR: 15, opBase: 0.16 },
      { count: 2,  minN: 0.38, maxN: 0.49, minR: 7,  maxR: 10, opBase: 0.10 },
    ];
    for (const z of petalZones) {
      for (let i = 0; i < z.count; i++) {
        const p = _sampleBorderBiasedPoint(rng, cx, cy, 390, 150, z.minN, z.maxN);
        const r = z.minR + rng() * (z.maxR - z.minR);
        const rot = rng() * 360;
        const d = _sakuraPetalPath(p.x, p.y, r, r * 0.76, r * 0.14, rot, 29);
        petalNodes.push(`<path d="${d}" fill="#FB7185" stroke="#E11D48" stroke-opacity="0.22" stroke-width="1" opacity="${z.opBase}"/>`);
      }
    }

    // 테두리 쪽 작은 사쿠라 꽃송이 윤곽
    const blossomNodes = [];
    for (let i = 0; i < 6; i++) {
      const p = _sampleBorderBiasedPoint(rng, cx, cy, 385, 145, 0.74, 0.98);
      const r = 14 + rng() * 18;
      const rot = rng() * 72;
      blossomNodes.push(`<path d="${_sakuraBlossomPaths(p.x, p.y, r, rot)}" fill="#FDA4AF" fill-opacity="0.24" stroke="#E11D48" stroke-opacity="0.22" stroke-width="1.2"/>`);
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" class="stage-motif-svg">
        <defs>
          ${patternMarkup}
          <radialGradient id="${maskId}-grad" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#000000"/>
            <stop offset="52%" stop-color="#222222"/>
            <stop offset="100%" stop-color="#FFFFFF"/>
          </radialGradient>
          <mask id="${maskId}">
            <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${maskId}-grad)"/>
          </mask>
        </defs>
        <g id="stage-pattern-border" mask="url(#${maskId})">
          <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${patId})"/>
        </g>
        <g id="stage-shurikens">${shurikenNodes.join('')}</g>
        <g id="stage-sakura-blossoms">${blossomNodes.join('')}</g>
        <g id="stage-sakura-petals">${petalNodes.join('')}</g>
      </svg>
    `.trim();
  }

  /**
   * 정답 시 문제 박스(#quiz-stage) 내부에만 나타나는 사쿠라 음영 Parametric SVG
   * 크기가 다양한 사쿠라가 테두리에 많이, 중앙으로 갈수록 적게 배치됨
   * @param {number} [seed=0]
   */
  function sakuraStageShadow(seed = 0) {
    const W = 800;
    const H = 320;
    const cx = W / 2;
    const cy = H / 2;
    const rng = _createRng(seed + 91);

    const vignetteId = _nextId('sakura-stage-vignette');
    const petalGradId = _nextId('sakura-stage-grad');
    const shadowFilterId = _nextId('sakura-stage-blur');

    const zones = [
      // 테두리 밀집 영역 (큰 사쿠라 + 중간 사쿠라 다수)
      { count: 14, minN: 0.74, maxN: 0.99, minR: 22, maxR: 54, op: 0.85, kind: 'blossom' },
      { count: 10, minN: 0.72, maxN: 0.98, minR: 13, maxR: 24, op: 0.78, kind: 'petal' },
      // 중간 영역 (빈도 감소, 크기 중간)
      { count: 5,  minN: 0.52, maxN: 0.71, minR: 14, maxR: 28, op: 0.52, kind: 'blossom' },
      { count: 4,  minN: 0.50, maxN: 0.69, minR: 10, maxR: 16, op: 0.45, kind: 'petal' },
      // 중앙 인접 희소 영역 (작은 꽃잎 소수만)
      { count: 2,  minN: 0.36, maxN: 0.48, minR: 9,  maxR: 13, op: 0.26, kind: 'petal' },
    ];

    const shadowShapes = [];
    const mainShapes = [];

    for (const z of zones) {
      for (let i = 0; i < z.count; i++) {
        const p = _sampleBorderBiasedPoint(rng, cx, cy, 388, 148, z.minN, z.maxN);
        const r = z.minR + rng() * (z.maxR - z.minR);
        const rot = rng() * 360;
        const d = z.kind === 'blossom'
          ? _sakuraBlossomPaths(p.x, p.y, r, rot)
          : _sakuraPetalPath(p.x, p.y, r, r * 0.76, r * 0.14, rot, 29);

        shadowShapes.push(`<path d="${d}" fill="#881337" opacity="${(z.op * 0.30).toFixed(2)}"/>`);
        mainShapes.push(`<path d="${d}" fill="url(#${petalGradId})" stroke="#BE123C" stroke-opacity="${(z.op * 0.35).toFixed(2)}" stroke-width="1.5" stroke-linejoin="round" opacity="${z.op}"/>`);
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" class="sakura-shadow-svg">
        <defs>
          <radialGradient id="${vignetteId}" cx="50%" cy="50%" r="62%">
            <stop offset="0%" stop-color="#FDA4AF" stop-opacity="0"/>
            <stop offset="55%" stop-color="#FB7185" stop-opacity="0.10"/>
            <stop offset="100%" stop-color="#E11D48" stop-opacity="0.30"/>
          </radialGradient>
          <radialGradient id="${petalGradId}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#9F1239" stop-opacity="0.34"/>
            <stop offset="65%" stop-color="#E11D48" stop-opacity="0.24"/>
            <stop offset="100%" stop-color="#FB7185" stop-opacity="0.10"/>
          </radialGradient>
          <filter id="${shadowFilterId}" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="5"/>
          </filter>
        </defs>
        <g id="sakura-vignette-layer">
          <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${vignetteId})"/>
        </g>
        <g id="sakura-cast-shadow" transform="translate(6, 8)" filter="url(#${shadowFilterId})">
          ${shadowShapes.join('')}
        </g>
        <g id="sakura-main-shadow">
          ${mainShapes.join('')}
        </g>
      </svg>
    `.trim();
  }

  return {
    polarToCartesian,
    createStarPoints,
    smoothSplinePath,
    mascot,
    shurikenItem,
    quizTarget,
    avatarItemPreview,
    stampBadge,
    speedLines,
    quizStageBackdrop,
    sakuraStageShadow,
    starIcon,
  };
})();
