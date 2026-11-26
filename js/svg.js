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
   * 시바견 닌자 마스코트 "킨타" Parametric SVG (아바타 장비 + 포즈 지원)
   * @param {'idle'|'happy'|'encourage'} [mood='idle']
   * @param {number} [size=132]
   * @param {{ equipped?:Object, pose?:string, flipX?:boolean }} [options={}]
   */
  function mascot(mood = 'idle', size = 132, options = {}) {
    const W = 180;
    const H = 180;
    const cx = W / 2;
    const cy = 78;
    const headR = 42;
    const ink = 'var(--color-ink, #1E1B2E)';
    const furMain = '#F59E0B';
    const furLight = '#FEF3C7';

    const eq = _resolveAvatar(options.equipped);
    const pose = options.pose || 'idle';
    const flipX = Boolean(options.flipX);

    const titleId = _nextId('mascot-title');
    const bgGradId = _nextId('mascot-bg');
    const furGradId = _nextId('mascot-fur');

    const earOuterOffset = 31;
    const earTopY = 16;
    const earBaseY = 52;
    const leftEar = `${cx - earOuterOffset - 11},${earBaseY} ${cx - earOuterOffset + 4},${earTopY} ${cx - 11},${earBaseY - 11}`;
    const rightEar = `${cx + earOuterOffset + 11},${earBaseY} ${cx + earOuterOffset - 4},${earTopY} ${cx + 11},${earBaseY - 11}`;

    const scarfCurve = smoothSplinePath([
      { x: cx + 30, y: 112 },
      { x: cx + 48, y: 104 },
      { x: cx + 62, y: 112 },
    ], 0.3, false);

    // 눈/입 표정 계산
    const eyeY = cy - 4;
    const eyeDX = 16;
    let eyesMarkup = '';
    let mouthMarkup = '';

    if (mood === 'happy') {
      const leftArc = smoothSplinePath([
        { x: cx - eyeDX - 6, y: eyeY + 2 },
        { x: cx - eyeDX, y: eyeY - 5 },
        { x: cx - eyeDX + 6, y: eyeY + 2 },
      ], 0.35, false);
      const rightArc = smoothSplinePath([
        { x: cx + eyeDX - 6, y: eyeY + 2 },
        { x: cx + eyeDX, y: eyeY - 5 },
        { x: cx + eyeDX + 6, y: eyeY + 2 },
      ], 0.35, false);
      eyesMarkup = `
        <path d="${leftArc}" fill="none" stroke="${ink}" stroke-width="3.8" stroke-linecap="round"/>
        <path d="${rightArc}" fill="none" stroke="${ink}" stroke-width="3.8" stroke-linecap="round"/>
      `;
      mouthMarkup = `
        <path d="M ${cx - 9} ${cy + 14} Q ${cx} ${cy + 27} ${cx + 9} ${cy + 14} Z" fill="#FB7185" stroke="${ink}" stroke-width="2.8" stroke-linejoin="round"/>
      `;
    } else if (mood === 'encourage') {
      eyesMarkup = `
        <line x1="${cx - eyeDX - 5}" y1="${eyeY - 4}" x2="${cx - eyeDX + 5}" y2="${eyeY + 3}" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="${cx - eyeDX - 5}" y1="${eyeY + 4}" x2="${cx - eyeDX + 5}" y2="${eyeY - 2}" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="${cx + eyeDX}" cy="${eyeY}" r="5.2" fill="${ink}"/>
        <circle cx="${cx + eyeDX + 1.6}" cy="${eyeY - 1.6}" r="1.9" fill="#FFFFFF"/>
      `;
      mouthMarkup = `
        <path d="${smoothSplinePath([
          { x: cx - 8, y: cy + 17 },
          { x: cx - 3, y: cy + 14 },
          { x: cx + 3, y: cy + 18 },
          { x: cx + 8, y: cy + 15 },
        ], 0.3, false)}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
      `;
    } else {
      eyesMarkup = `
        <circle cx="${cx - eyeDX}" cy="${eyeY}" r="5.4" fill="${ink}"/>
        <circle cx="${cx - eyeDX - 1.6}" cy="${eyeY - 1.8}" r="2" fill="#FFFFFF"/>
        <circle cx="${cx + eyeDX}" cy="${eyeY}" r="5.4" fill="${ink}"/>
        <circle cx="${cx + eyeDX - 1.6}" cy="${eyeY - 1.8}" r="2" fill="#FFFFFF"/>
      `;
      mouthMarkup = `
        <path d="M ${cx - 7} ${cy + 14} Q ${cx - 3.5} ${cy + 20} ${cx} ${cy + 14} Q ${cx + 3.5} ${cy + 20} ${cx + 7} ${cy + 14}" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    }

    // 헤어밴드 문양 & 상단 장식
    let emblemMarkup = '';
    if (eq.headband.emblem === 'bolt') {
      emblemMarkup = `<polygon points="${cx + 2},${cy - 34} ${cx - 4},${cy - 26} ${cx + 1},${cy - 26} ${cx - 2},${cy - 18} ${cx + 5},${cy - 27} ${cx},${cy - 27}" fill="#FACC15" stroke="${ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
    } else if (eq.headband.emblem === 'sakura') {
      emblemMarkup = `<path d="${_sakuraBlossomPaths(cx, cy - 26, 7.5, 0)}" fill="#FBCFE8" stroke="#BE123C" stroke-width="1.2"/>`;
    } else if (eq.headband.emblem === 'horns') {
      emblemMarkup = `
        <polygon points="${cx - 22},${cy - 33} ${cx - 32},${cy - 54} ${cx - 12},${cy - 36}" fill="#FACC15" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <polygon points="${cx + 22},${cy - 33} ${cx + 32},${cy - 54} ${cx + 12},${cy - 36}" fill="#FACC15" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
        <polygon points="${createStarPoints(cx, cy - 26, 4, 7, 3, 0)}" fill="#F97316" stroke="${ink}" stroke-width="1.5"/>
      `;
    } else if (eq.headband.emblem === 'crown') {
      emblemMarkup = `
        <polygon points="${cx - 20},${cy - 35} ${cx - 22},${cy - 54} ${cx - 9},${cy - 44} ${cx},${cy - 58} ${cx + 9},${cy - 44} ${cx + 22},${cy - 54} ${cx + 20},${cy - 35}" fill="#FACC15" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>
        <circle cx="${cx}" cy="${cy - 26}" r="4.5" fill="#E11D48" stroke="${ink}" stroke-width="1.5"/>
      `;
    } else {
      emblemMarkup = `<polygon points="${createStarPoints(cx, cy - 26, 5, 7.5, 3.4, 0)}" fill="#FACC15" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
    }

    // 포즈별 몸/팔/이펙트 변환
    let bodyTransform = '';
    let weaponAngle = -24;
    let weaponX = cx + 44;
    let weaponY = 126;
    let poseFx = '';

    if (pose === 'slash') {
      bodyTransform = 'rotate(8 90 120)';
      weaponAngle = 38;
      weaponX = cx + 52;
      weaponY = 114;
      poseFx = `<path d="M 122 68 Q 160 100 132 146" fill="none" stroke="#FACC15" stroke-width="5" stroke-linecap="round" opacity="0.85"/>`;
    } else if (pose === 'kick') {
      bodyTransform = 'rotate(-10 90 120)';
      weaponAngle = -45;
      poseFx = `<polygon points="${createStarPoints(148, 128, 6, 13, 5, 12)}" fill="#FACC15" stroke="${ink}" stroke-width="2"/>`;
    } else if (pose === 'jump') {
      bodyTransform = 'translate(0, -10)';
      weaponAngle = -60;
      poseFx = `<line x1="60" y1="166" x2="120" y2="166" stroke="${ink}" stroke-width="3" stroke-dasharray="8 6" opacity="0.5"/>`;
    } else if (pose === 'throw') {
      bodyTransform = 'rotate(6 90 120)';
      weaponAngle = -55;
      weaponX = cx - 42;
      weaponY = 128;
    } else if (pose === 'meditate') {
      bodyTransform = 'translate(0, -4)';
      weaponAngle = 0;
      weaponX = cx + 46;
      weaponY = 136;
      poseFx = `<circle cx="${cx}" cy="${cy - 4}" r="74" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-dasharray="4 6" opacity="0.65"/>`;
    } else if (pose === 'poof') {
      poseFx = `
        <circle cx="34" cy="142" r="14" fill="#FFFFFF" stroke="${ink}" stroke-width="2.4" opacity="0.9"/>
        <circle cx="48" cy="148" r="10" fill="#FFFFFF" stroke="${ink}" stroke-width="2.4" opacity="0.9"/>
        <circle cx="144" cy="144" r="12" fill="#FFFFFF" stroke="${ink}" stroke-width="2.4" opacity="0.9"/>
      `;
    }

    const bodyMarkup = `
      <g id="mascot-pose-layer" transform="${bodyTransform}">
        <g id="mascot-outfit">
          <path d="M ${cx - 34} 118 L ${cx + 34} 118 L ${cx + 42} 162 L ${cx - 42} 162 Z" fill="${eq.outfit.primary}" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
          <path d="M ${cx - 18} 118 L ${cx} 142 L ${cx + 18} 118" fill="none" stroke="${eq.outfit.trim}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="${cx - 36}" y="142" width="72" height="10" rx="4" fill="${eq.outfit.trim}" stroke="${ink}" stroke-width="2.5"/>
          <ellipse cx="${cx - 34}" cy="134" rx="11" ry="8" fill="${furLight}" stroke="${ink}" stroke-width="2.8"/>
          <ellipse cx="${cx + 34}" cy="134" rx="11" ry="8" fill="${furLight}" stroke="${ink}" stroke-width="2.8"/>
        </g>
        <g id="mascot-scarf">
          <path d="${scarfCurve}" fill="none" stroke="${eq.headband.color}" stroke-width="9" stroke-linecap="round"/>
          <path d="${scarfCurve}" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
          <rect x="${cx - 28}" y="109" width="56" height="14" rx="7" fill="${eq.headband.color}" stroke="${ink}" stroke-width="3"/>
        </g>
        <g id="mascot-ears">
          <polygon points="${leftEar}" fill="${furMain}" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>
          <polygon points="${rightEar}" fill="${furMain}" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>
          <polygon points="${cx - earOuterOffset - 3},${earBaseY - 4} ${cx - earOuterOffset + 4},${earTopY + 10} ${cx - 18},${earBaseY - 11}" fill="#FDA4AF"/>
          <polygon points="${cx + earOuterOffset + 3},${earBaseY - 4} ${cx + earOuterOffset - 4},${earTopY + 10} ${cx + 18},${earBaseY - 11}" fill="#FDA4AF"/>
        </g>
        <g id="mascot-head">
          <ellipse cx="${cx}" cy="${cy}" rx="${headR}" ry="${headR - 4}" fill="url(#${furGradId})" stroke="${ink}" stroke-width="3.4"/>
          <ellipse cx="${cx}" cy="${cy + 13}" rx="31" ry="22" fill="${furLight}"/>
          <ellipse cx="${cx - 23}" cy="${cy + 7}" rx="6.5" ry="3.8" fill="#FB7185" opacity="0.65"/>
          <ellipse cx="${cx + 23}" cy="${cy + 7}" rx="6.5" ry="3.8" fill="#FB7185" opacity="0.65"/>
        </g>
        <g id="mascot-headband">
          <path d="M ${cx - 40} ${cy - 20} Q ${cx} ${cy - 31} ${cx + 40} ${cy - 20} L ${cx + 41} ${cy - 31} Q ${cx} ${cy - 41} ${cx - 41} ${cy - 31} Z" fill="${eq.headband.color}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
          <rect x="${cx - 13}" y="${cy - 35}" width="26" height="18" rx="5" fill="#E2E8F0" stroke="${ink}" stroke-width="2.5"/>
          ${emblemMarkup}
        </g>
        <g id="mascot-face">
          ${eyesMarkup}
          <ellipse cx="${cx}" cy="${cy + 6}" rx="5" ry="3.6" fill="${ink}"/>
          ${mouthMarkup}
        </g>
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
          <radialGradient id="${bgGradId}" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stop-color="#FEF08A"/>
            <stop offset="100%" stop-color="#FDE047" stop-opacity="0.18"/>
          </radialGradient>
          <linearGradient id="${furGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FBBF24"/>
            <stop offset="100%" stop-color="${furMain}"/>
          </linearGradient>
        </defs>
        <g id="mascot-backdrop">
          <circle cx="${cx}" cy="${cy + 8}" r="72" fill="url(#${bgGradId})" stroke="${ink}" stroke-width="3" stroke-dasharray="6 4"/>
        </g>
        <g id="mascot-root" ${flipX ? `transform="translate(${W}, 0) scale(-1, 1)"` : ''}>
          ${bodyMarkup}
          ${poseFx}
        </g>
      </svg>
    `.trim();
  }

  /**
   * 퀴즈 배틀 표적 Parametric SVG (짚 인형·과녁·사과·수박·달마)
   * @param {'straw_doll'|'bullseye'|'apple'|'watermelon'|'daruma'} kind
   * @param {'idle'|'hit'|'miss'} [state='idle']
   * @param {number} [size=86]
   */
  function quizTarget(kind = 'straw_doll', state = 'idle', size = 86) {
    const W = 110;
    const H = 110;
    const cx = 55;
    const ink = 'var(--color-ink, #1E1B2E)';
    const titleId = _nextId('target-title');
    let body = '';

    if (kind === 'bullseye') {
      body = `
        <line x1="34" y1="98" x2="48" y2="66" stroke="#92400E" stroke-width="6" stroke-linecap="round"/>
        <line x1="76" y1="98" x2="62" y2="66" stroke="#92400E" stroke-width="6" stroke-linecap="round"/>
        <circle cx="${cx}" cy="50" r="34" fill="#FFFFFF" stroke="${ink}" stroke-width="3"/>
        <circle cx="${cx}" cy="50" r="24" fill="#E11D48" stroke="${ink}" stroke-width="2.5"/>
        <circle cx="${cx}" cy="50" r="14" fill="#FFFFFF" stroke="${ink}" stroke-width="2"/>
        <circle cx="${cx}" cy="50" r="6" fill="#FACC15" stroke="${ink}" stroke-width="2"/>
      `;
    } else if (kind === 'apple') {
      body = `
        <rect x="26" y="84" width="58" height="12" rx="4" fill="#B45309" stroke="${ink}" stroke-width="2.8"/>
        <path d="M 55 24 Q 68 12 72 22 Q 62 28 55 24 Z" fill="#10B981" stroke="${ink}" stroke-width="2.2"/>
        <line x1="55" y1="24" x2="55" y2="33" stroke="#78350F" stroke-width="4" stroke-linecap="round"/>
        <path d="M 55 34 C 34 26, 22 46, 28 66 C 32 82, 46 86, 55 82 C 64 86, 78 82, 82 66 C 88 46, 76 26, 55 34 Z" fill="#EF4444" stroke="${ink}" stroke-width="3"/>
        <ellipse cx="42" cy="48" rx="5" ry="9" fill="#FCA5A5" opacity="0.6" transform="rotate(-18 42 48)"/>
      `;
    } else if (kind === 'watermelon') {
      body = `
        <rect x="26" y="84" width="58" height="12" rx="4" fill="#B45309" stroke="${ink}" stroke-width="2.8"/>
        <circle cx="${cx}" cy="54" r="31" fill="#16A34A" stroke="${ink}" stroke-width="3"/>
        <path d="M 41 26 Q 48 54 41 82" fill="none" stroke="#14532D" stroke-width="4" stroke-linecap="round"/>
        <path d="M 55 23 L 55 85" fill="none" stroke="#14532D" stroke-width="4" stroke-linecap="round"/>
        <path d="M 69 26 Q 62 54 69 82" fill="none" stroke="#14532D" stroke-width="4" stroke-linecap="round"/>
      `;
    } else if (kind === 'daruma') {
      body = `
        <ellipse cx="${cx}" cy="58" rx="34" ry="36" fill="#E11D48" stroke="${ink}" stroke-width="3.2"/>
        <ellipse cx="${cx}" cy="46" rx="22" ry="15" fill="#FEF3C7" stroke="${ink}" stroke-width="2.4"/>
        <circle cx="46" cy="46" r="4.5" fill="${ink}"/>
        <circle cx="64" cy="46" r="4.5" fill="${ink}"/>
        <path d="M 44 55 Q 55 51 66 55" fill="none" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M 38 72 Q 55 80 72 72" fill="none" stroke="#FACC15" stroke-width="5" stroke-linecap="round"/>
      `;
    } else {
      // 짚으로 만든 인형 (straw_doll)
      body = `
        <line x1="55" y1="84" x2="55" y2="102" stroke="#78350F" stroke-width="5" stroke-linecap="round"/>
        <rect x="22" y="46" width="66" height="14" rx="7" fill="#FDE68A" stroke="${ink}" stroke-width="2.8"/>
        <rect x="43" y="42" width="24" height="44" rx="10" fill="#FCD34D" stroke="${ink}" stroke-width="2.8"/>
        <line x1="43" y1="58" x2="67" y2="58" stroke="#B45309" stroke-width="3.5"/>
        <line x1="43" y1="68" x2="67" y2="68" stroke="#B45309" stroke-width="3.5"/>
        <circle cx="${cx}" cy="28" r="16" fill="#FDE68A" stroke="${ink}" stroke-width="2.8"/>
        <line x1="47" y1="24" x2="51" y2="28" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="51" y1="24" x2="47" y2="28" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="59" y1="24" x2="63" y2="28" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="63" y1="24" x2="59" y2="28" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
      `;
    }

    let stateFx = '';
    if (state === 'hit') {
      const burstPts = createStarPoints(cx, 50, 8, 22, 10, 15);
      stateFx = `
        <g id="target-hit-fx">
          <polygon points="${burstPts}" fill="#FACC15" stroke="${ink}" stroke-width="2.2" opacity="0.92"/>
          <text x="${cx}" y="55" text-anchor="middle" font-family="var(--font-display)" font-size="14" fill="#E11D48">명중!</text>
        </g>
      `;
    } else if (state === 'miss') {
      stateFx = `
        <g id="target-miss-fx">
          <path d="M 88 22 Q 96 32 88 38 Q 80 32 88 22 Z" fill="#38BDF8" stroke="${ink}" stroke-width="2"/>
          <text x="${cx}" y="102" text-anchor="middle" font-family="var(--font-display)" font-size="13" fill="#2563EB">휴~ 피했다!</text>
        </g>
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-labelledby="${titleId}" class="target-svg target-svg--${state}">
        <title id="${titleId}">표적 (${kind})</title>
        <g id="target-body" ${state === 'hit' ? 'transform="rotate(9 55 60)"' : ''}>${body}</g>
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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="${size}" height="${size}" aria-hidden="true" focusable="false">
        <path d="M 18 18 L 62 18 L 68 68 L 12 68 Z" fill="${item.primary}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 28 18 L 40 42 L 52 18" fill="none" stroke="${item.trim}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="16" y="48" width="48" height="9" rx="3" fill="${item.trim}" stroke="${ink}" stroke-width="2.5"/>
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
