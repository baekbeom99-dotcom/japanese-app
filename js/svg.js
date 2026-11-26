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

  /**
   * 시바견 닌자 마스코트 "킨타" Parametric SVG
   * @param {'idle'|'happy'|'encourage'} [mood='idle']
   * @param {number} [size=132]
   */
  function mascot(mood = 'idle', size = 132) {
    const W = 160;
    const H = 160;
    const cx = W / 2;
    const cy = 86;
    const headR = 46;
    const ink = 'var(--color-ink, #1E1B2E)';
    const furMain = '#F59E0B';
    const furLight = '#FEF3C7';
    const bandColor = mood === 'happy' ? '#E11D48' : '#2563EB';
    const titleId = _nextId('mascot-title');
    const bgGradId = _nextId('mascot-bg');
    const furGradId = _nextId('mascot-fur');

    // 귀 좌표 (중심 대칭 계산)
    const earOuterOffset = 34;
    const earTopY = 20;
    const earBaseY = 58;
    const leftEar = `${cx - earOuterOffset - 12},${earBaseY} ${cx - earOuterOffset + 4},${earTopY} ${cx - 12},${earBaseY - 12}`;
    const rightEar = `${cx + earOuterOffset + 12},${earBaseY} ${cx + earOuterOffset - 4},${earTopY} ${cx + 12},${earBaseY - 12}`;

    // 스카프 날리는 매듭 (스플라인 곡선)
    const scarfCurve = smoothSplinePath([
      { x: cx + 40, y: 122 },
      { x: cx + 56, y: 112 },
      { x: cx + 68, y: 120 },
    ], 0.3, false);

    // 눈/입 표정 계산
    const eyeY = cy - 4;
    const eyeDX = 17;
    let eyesMarkup = '';
    let mouthMarkup = '';

    if (mood === 'happy') {
      const leftArc = smoothSplinePath([
        { x: cx - eyeDX - 7, y: eyeY + 2 },
        { x: cx - eyeDX, y: eyeY - 6 },
        { x: cx - eyeDX + 7, y: eyeY + 2 },
      ], 0.35, false);
      const rightArc = smoothSplinePath([
        { x: cx + eyeDX - 7, y: eyeY + 2 },
        { x: cx + eyeDX, y: eyeY - 6 },
        { x: cx + eyeDX + 7, y: eyeY + 2 },
      ], 0.35, false);
      eyesMarkup = `
        <path d="${leftArc}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
        <path d="${rightArc}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
      `;
      mouthMarkup = `
        <path d="M ${cx - 10} ${cy + 15} Q ${cx} ${cy + 29} ${cx + 10} ${cy + 15} Z" fill="#FB7185" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
      `;
    } else if (mood === 'encourage') {
      eyesMarkup = `
        <line x1="${cx - eyeDX - 6}" y1="${eyeY - 4}" x2="${cx - eyeDX + 5}" y2="${eyeY + 3}" stroke="${ink}" stroke-width="3.8" stroke-linecap="round"/>
        <line x1="${cx - eyeDX - 6}" y1="${eyeY + 4}" x2="${cx - eyeDX + 5}" y2="${eyeY - 2}" stroke="${ink}" stroke-width="3.8" stroke-linecap="round"/>
        <circle cx="${cx + eyeDX}" cy="${eyeY}" r="5.5" fill="${ink}"/>
        <circle cx="${cx + eyeDX + 1.8}" cy="${eyeY - 1.8}" r="2" fill="#FFFFFF"/>
      `;
      mouthMarkup = `
        <path d="${smoothSplinePath([
          { x: cx - 9, y: cy + 19 },
          { x: cx - 3, y: cy + 16 },
          { x: cx + 3, y: cy + 20 },
          { x: cx + 9, y: cy + 17 },
        ], 0.3, false)}" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>
      `;
    } else {
      eyesMarkup = `
        <circle cx="${cx - eyeDX}" cy="${eyeY}" r="5.8" fill="${ink}"/>
        <circle cx="${cx - eyeDX - 1.8}" cy="${eyeY - 2}" r="2.1" fill="#FFFFFF"/>
        <circle cx="${cx + eyeDX}" cy="${eyeY}" r="5.8" fill="${ink}"/>
        <circle cx="${cx + eyeDX - 1.8}" cy="${eyeY - 2}" r="2.1" fill="#FFFFFF"/>
      `;
      mouthMarkup = `
        <path d="M ${cx - 8} ${cy + 16} Q ${cx - 4} ${cy + 22} ${cx} ${cy + 16} Q ${cx + 4} ${cy + 22} ${cx + 8} ${cy + 16}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    }

    const starBadge = createStarPoints(cx, cy - 28, 5, 8.5, 3.8, 0);
    const moodTitle = mood === 'happy'
      ? '기뻐하는 시바 닌자 마스코트 킨타'
      : mood === 'encourage'
        ? '응원하는 시바 닌자 마스코트 킨타'
        : '시바 닌자 마스코트 킨타';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${size}" height="${size}" role="img" aria-labelledby="${titleId}" class="mascot-svg mascot-svg--${mood}">
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
          <circle cx="${cx}" cy="${cy - 4}" r="66" fill="url(#${bgGradId})" stroke="${ink}" stroke-width="3" stroke-dasharray="6 4"/>
        </g>
        <g id="mascot-scarf">
          <path d="${scarfCurve}" fill="none" stroke="${bandColor}" stroke-width="10" stroke-linecap="round"/>
          <path d="${scarfCurve}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
          <rect x="${cx - 32}" y="120" width="64" height="18" rx="9" fill="${bandColor}" stroke="${ink}" stroke-width="3.2"/>
        </g>
        <g id="mascot-ears">
          <polygon points="${leftEar}" fill="${furMain}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
          <polygon points="${rightEar}" fill="${furMain}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>
          <polygon points="${cx - earOuterOffset - 4},${earBaseY - 4} ${cx - earOuterOffset + 4},${earTopY + 11} ${cx - 19},${earBaseY - 12}" fill="#FDA4AF"/>
          <polygon points="${cx + earOuterOffset + 4},${earBaseY - 4} ${cx + earOuterOffset - 4},${earTopY + 11} ${cx + 19},${earBaseY - 12}" fill="#FDA4AF"/>
        </g>
        <g id="mascot-head">
          <ellipse cx="${cx}" cy="${cy}" rx="${headR}" ry="${headR - 4}" fill="url(#${furGradId})" stroke="${ink}" stroke-width="3.5"/>
          <ellipse cx="${cx}" cy="${cy + 14}" rx="34" ry="24" fill="${furLight}"/>
          <ellipse cx="${cx - 25}" cy="${cy + 8}" rx="7" ry="4.2" fill="#FB7185" opacity="0.65"/>
          <ellipse cx="${cx + 25}" cy="${cy + 8}" rx="7" ry="4.2" fill="#FB7185" opacity="0.65"/>
        </g>
        <g id="mascot-headband">
          <path d="M ${cx - 43} ${cy - 22} Q ${cx} ${cy - 34} ${cx + 43} ${cy - 22} L ${cx + 44} ${cy - 34} Q ${cx} ${cy - 45} ${cx - 44} ${cy - 34} Z" fill="${bandColor}" stroke="${ink}" stroke-width="3.2" stroke-linejoin="round"/>
          <rect x="${cx - 14}" y="${cy - 39}" width="28" height="20" rx="6" fill="#E2E8F0" stroke="${ink}" stroke-width="2.8"/>
          <polygon points="${starBadge}" fill="#FACC15" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>
        </g>
        <g id="mascot-face">
          ${eyesMarkup}
          <ellipse cx="${cx}" cy="${cy + 7}" rx="5.5" ry="4" fill="${ink}"/>
          ${mouthMarkup}
        </g>
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
    stampBadge,
    speedLines,
    quizStageBackdrop,
    sakuraStageShadow,
    starIcon,
  };
})();
