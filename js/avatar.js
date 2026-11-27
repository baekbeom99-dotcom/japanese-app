'use strict';
// ============================================================
// avatar.js — 별로 꾸미는 시바 닌자 아바타 상점 & 탈의실 (#avatar)
// ============================================================

const AvatarModule = (() => {
  let _activeCat = 'outfit';
  let _previewPose = 'idle';
  let _noticeMsg = '퀴즈에서 모은 별로 옷·헤어밴드·표창·무기를 모아 꾸며 보자!';

  function _notifyStateChanged() {
    document.dispatchEvent(new CustomEvent('jp:state-changed'));
  }

  function render() {
    const root = document.getElementById('app-root');
    const state = Storage.load();
    const equipped = state.avatar.equipped;
    const ownedSet = new Set(state.avatar.owned);
    const items = AVATAR_ITEMS.filter(i => i.category === _activeCat);
    const ac = new AbortController();
    Router.onCleanup(() => ac.abort());

    const equippedOutfit   = AVATAR_ITEMS.find(i => i.id === equipped.outfit);
    const equippedHeadband = AVATAR_ITEMS.find(i => i.id === equipped.headband);
    const equippedShuriken = AVATAR_ITEMS.find(i => i.id === equipped.shuriken);
    const equippedWeapon   = AVATAR_ITEMS.find(i => i.id === equipped.weapon);

    root.innerHTML = `
      <section class="avatar-screen">
        <div class="panel-header">
          <h2 class="section-title">🎨 시바 닌자 아바타 상점</h2>
          <span class="pill-badge pill-badge--gold">★ 보유 별: ${state.stars}개</span>
        </div>

        <div class="avatar-stage-card">
          <div class="avatar-preview-box">
            <div class="avatar-preview-mascot">
              ${AnimeSVG.mascot('happy', 176, { equipped, pose: _previewPose })}
            </div>
            <div class="avatar-preview-shuriken" title="장착 중인 표창">
              ${AnimeSVG.shurikenItem(equipped.shuriken, 54)}
            </div>
          </div>

          <div class="avatar-preview-info">
            <div class="speech-bubble" id="avatar-notice">${_noticeMsg}</div>
            <div class="avatar-equipped-list">
              <span class="pill-badge">🥋 ${equippedOutfit?.name || ''}</span>
              <span class="pill-badge">🎀 ${equippedHeadband?.name || ''}</span>
              <span class="pill-badge">✴️ ${equippedShuriken?.name || ''}</span>
              <span class="pill-badge">⚔️ ${equippedWeapon?.name || ''}</span>
            </div>
            <div class="mode-toggle-group">
              <span style="font-size:0.85rem;font-weight:800;color:var(--color-muted)">포즈 미리보기:</span>
              ${[
                { id: 'idle', label: '기본' },
                { id: 'slash', label: '베기' },
                { id: 'kick', label: '발차기' },
                { id: 'jump', label: '점프' },
                { id: 'meditate', label: '명상' },
              ].map(p => `
                <button type="button" class="btn btn--sm ${_previewPose === p.id ? 'btn--accent' : 'btn--ghost'}" data-pose="${p.id}">
                  ${p.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="tab-group" role="tablist" aria-label="아바타 아이템 분류">
          ${AVATAR_CATEGORIES.map(cat => `
            <button type="button" role="tab" aria-selected="${_activeCat === cat.key}"
              class="tab ${_activeCat === cat.key ? 'tab--active' : ''}" data-avatar-cat="${cat.key}">
              ${cat.icon} ${cat.label}
            </button>
          `).join('')}
        </div>

        <div class="avatar-shop-grid">
          ${items.map(item => {
            const isOwned = ownedSet.has(item.id);
            const isEquipped = equipped[item.category] === item.id;
            const canAfford = state.stars >= item.price;

            let btnHtml = '';
            if (isEquipped) {
              btnHtml = `<button type="button" class="btn btn--accent btn--sm" disabled>✅ 착용 중</button>`;
            } else if (isOwned) {
              btnHtml = `<button type="button" class="btn btn--primary btn--sm" data-equip-id="${item.id}">착용하기</button>`;
            } else if (canAfford) {
              btnHtml = `<button type="button" class="btn btn--secondary btn--sm" data-buy-id="${item.id}">★ ${item.price} 구매</button>`;
            } else {
              btnHtml = `<button type="button" class="btn btn--ghost btn--sm" data-buy-id="${item.id}">★ ${item.price} (부족)</button>`;
            }

            return `
              <article class="avatar-item-card ${isEquipped ? 'avatar-item-card--equipped' : ''}">
                <div class="avatar-item-card__preview">
                  ${AnimeSVG.avatarItemPreview(item, 68)}
                </div>
                <div class="avatar-item-card__body">
                  <div class="avatar-item-card__top">
                    <h3 class="avatar-item-card__name">${item.name}</h3>
                    <span class="pill-badge ${item.price === 0 ? '' : 'pill-badge--gold'}">
                      ${item.price === 0 ? '기본' : `★ ${item.price}`}
                    </span>
                  </div>
                  <p class="avatar-item-card__desc">${item.desc}</p>
                  <div class="avatar-item-card__actions">
                    ${btnHtml}
                  </div>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    `;

    root.addEventListener('click', (e) => {
      const catBtn = e.target.closest('[data-avatar-cat]');
      if (catBtn) {
        _activeCat = catBtn.dataset.avatarCat;
        render();
        return;
      }

      const poseBtn = e.target.closest('[data-pose]');
      if (poseBtn) {
        _previewPose = poseBtn.dataset.pose;
        render();
        return;
      }

      const equipBtn = e.target.closest('[data-equip-id]');
      if (equipBtn) {
        const res = Storage.equipAvatarItem(equipBtn.dataset.equipId);
        if (res.ok) {
          _noticeMsg = `"${res.item.name}" 장착 완료! 정말 멋지다!`;
          _notifyStateChanged();
          render();
        }
        return;
      }

      const buyBtn = e.target.closest('[data-buy-id]');
      if (buyBtn) {
        const res = Storage.buyAvatarItem(buyBtn.dataset.buyId);
        if (res.ok) {
          _noticeMsg = `"${res.item.name}" 구매 & 착용 완료! 다음 퀴즈에서 뽐내 보자!`;
          _notifyStateChanged();
        } else if (res.reason === 'insufficient_stars') {
          _noticeMsg = `별이 ${res.needed}개 더 필요해요! 가나·단어 퀴즈를 풀고 별을 모아 오자!`;
        }
        render();
      }
    }, { signal: ac.signal });
  }

  const QUIZ_TARGETS = ['bonsai', 'straw_doll', 'cactus', 'bullseye', 'apple', 'watermelon', 'daruma'];

  const CARD_ACTIONS = [
    { id: 'slash',    label: '⚡ 질풍 쌍검 베기!',   leftPose: 'slash',    rightPose: 'guard' },
    { id: 'kick',     label: '🦵 회오리 발차기!',    leftPose: 'kick',     rightPose: 'slash' },
    { id: 'jump',     label: '🦅 공중 회전 점프!',   leftPose: 'jump',     rightPose: 'jump' },
    { id: 'poof',     label: '💨 인술 분신술 펑!',   leftPose: 'poof',     rightPose: 'poof' },
    { id: 'dash',     label: '🌪️ 번개 질주 자세!',   leftPose: 'throw',    rightPose: 'kick' },
    { id: 'meditate', label: '🧘 차크라 집중!',      leftPose: 'meditate', rightPose: 'meditate' },
  ];

  const PARTNER_EQUIPPED = {
    outfit: 'outfit_shadow',
    headband: 'headband_thunder',
    shuriken: 'shuriken_sakura',
    weapon: 'weapon_kunai',
  };

  /**
   * 퀴즈 배틀 바 HTML 생성 (시바견 아바타 + 말풍선 + 표창 궤적 + 변화하는 표적)
   * @param {number} stepSeed
   * @param {'idle'|'happy'|'encourage'} [mood='idle']
   * @param {string} [mascotMsg='']
   */
  function renderQuizArena(stepSeed = 0, mood = 'idle', mascotMsg = '') {
    const equipped = Storage.getEquippedAvatar();
    const targetKind = QUIZ_TARGETS[Math.abs(stepSeed) % QUIZ_TARGETS.length];
    return `
      <div class="quiz-arena" id="quiz-arena" data-target-kind="${targetKind}">
        <div class="quiz-arena__ninja" id="arena-ninja">
          ${AnimeSVG.mascot(mood, 88, { equipped, pose: 'idle' })}
        </div>
        <div class="quiz-arena__center">
          <div class="speech-bubble" id="quiz-mascot-msg">${mascotMsg}</div>
          <div class="quiz-arena__lane">
            <div class="quiz-arena__trail" id="arena-trail" aria-hidden="true"></div>
            <div class="quiz-arena__shuriken" id="arena-shuriken" aria-hidden="true">
              ${AnimeSVG.shurikenItem(equipped.shuriken, 40)}
            </div>
            <div class="quiz-arena__impact" id="arena-impact" aria-hidden="true"></div>
          </div>
        </div>
        <div class="quiz-arena__target" id="arena-target">
          ${AnimeSVG.quizTarget(targetKind, 'idle', 88)}
        </div>
      </div>
    `;
  }

  /**
   * 퀴즈 정답/오답 시 시바견 표창 투척 + 표적 명중/빗나감 애니메이션 실행
   * @param {boolean} isCorrect
   */
  function triggerQuizThrow(isCorrect) {
    const arena = document.getElementById('quiz-arena');
    const ninjaEl = document.getElementById('arena-ninja');
    const targetEl = document.getElementById('arena-target');
    if (!arena || !ninjaEl || !targetEl) return;

    const equipped = Storage.getEquippedAvatar();
    const targetKind = arena.dataset.targetKind || 'straw_doll';

    ninjaEl.innerHTML = AnimeSVG.mascot(isCorrect ? 'happy' : 'encourage', 90, {
      equipped,
      pose: 'throw',
    });

    arena.classList.remove('arena--hit', 'arena--miss');
    // 강제 리플로우로 연속 문제에서도 애니메이션 재생 보장
    void arena.offsetWidth;
    arena.classList.add(isCorrect ? 'arena--hit' : 'arena--miss');

    setTimeout(() => {
      if (!document.body.contains(targetEl)) return;
      targetEl.innerHTML = AnimeSVG.quizTarget(targetKind, isCorrect ? 'hit' : 'miss', 88);
    }, 280);
  }

  /**
   * 카드 학습 좌우 닌자 시바견 + 페이지 넘김 액션 HTML 생성
   * @param {number} actionStep
   * @param {boolean} animateAction
   */
  function getCardActionData(actionStep = 0) {
    return CARD_ACTIONS[Math.abs(actionStep) % CARD_ACTIONS.length];
  }

  function renderCardGuards(actionStep = 0, animateAction = false) {
    const equipped = Storage.getEquippedAvatar();
    const action = getCardActionData(actionStep);
    const animCls = animateAction ? `ninja-action--${action.id}` : '';
    return {
      action,
      leftHtml: `
        <div class="ninja-guard ninja-guard--left ${animCls}" id="ninja-guard-left">
          ${AnimeSVG.mascot('happy', 102, { equipped, pose: action.leftPose })}
        </div>
      `,
      rightHtml: `
        <div class="ninja-guard ninja-guard--right ${animCls}" id="ninja-guard-right">
          ${AnimeSVG.mascot('idle', 102, { equipped: PARTNER_EQUIPPED, pose: action.rightPose, flipX: true })}
        </div>
      `,
    };
  }

  return {
    render,
    renderQuizArena,
    triggerQuizThrow,
    renderCardGuards,
    getCardActionData,
  };
})();
