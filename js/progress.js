'use strict';
// ============================================================
// progress.js — 도장북 · 전적 대시보드 · 북마크 단어장 (#progress)
// ============================================================

const ProgressModule = (() => {
  let _kanaTab = 'hiragana'; // 'hiragana' | 'katakana'

  function _notifyStateChanged() {
    document.dispatchEvent(new CustomEvent('jp:state-changed'));
  }

  function _findWordEntry(wordText) {
    for (const [key, list] of Object.entries(WORDS)) {
      const found = list.find(w => w.word === wordText);
      if (found) return { ...found, key };
    }
    return null;
  }

  function render() {
    const root = document.getElementById('app-root');
    const state = Storage.load();
    const levelInfo = Storage.getLevelInfo(state.stars);
    const ac = new AbortController();
    Router.onCleanup(() => {
      ac.abort();
      SpeechHelper.stop();
    });

    const kanaSource = _kanaTab === 'hiragana' ? HIRAGANA : KATAKANA;
    const kanaRows = Object.keys(kanaSource);
    const unlockedSet = new Set(state.stamps);

    root.innerHTML = `
      <section class="progress-screen">
        <!-- 도전자 프로필 배너 -->
        <div class="profile-banner">
          <div style="display:flex;align-items:center;gap:14px">
            ${AnimeSVG.mascot('happy', 84)}
            <div>
              <span class="hero-badge">LV.${levelInfo.level} ${levelInfo.badge}</span>
              <h2 class="section-title" style="margin-top:6px">${levelInfo.title}</h2>
              <p style="font-size:0.88rem;color:var(--color-muted);font-weight:700">
                ${levelInfo.nextLevel ? `다음 칭호(${levelInfo.nextLevel.title})까지 별 ${levelInfo.starsToNext}개!` : '최고 등급 달성! 도장의 전설이 되었어!'}
              </p>
            </div>
          </div>
          <div class="profile-stats">
            <span class="pill-badge pill-badge--gold">★ 별 ${state.stars}개</span>
            <span class="pill-badge">🔥 최고 ${state.bestCombo} 콤보</span>
            <span class="pill-badge">🏅 도장 ${state.stamps.length} / ${STAMP_DEFINITIONS.length}</span>
          </div>
        </div>

        <!-- 참 잘했어요 스탬프북 -->
        <div class="comic-panel">
          <div class="panel-header">
            <h3 class="section-title" style="font-size:1.35rem">🏅 참 잘했어요 도장북</h3>
            <span class="pill-badge">${state.stamps.length}개 모음</span>
          </div>
          <div class="stamp-grid">
            ${STAMP_DEFINITIONS.map(stamp => {
              const unlocked = unlockedSet.has(stamp.id);
              return `
                <div class="stamp-card ${unlocked ? '' : 'stamp-card--locked'}">
                  ${AnimeSVG.stampBadge(stamp, unlocked)}
                  <div class="stamp-card__title">${stamp.title}</div>
                  <div class="stamp-card__desc">${stamp.desc}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 단어 카테고리별 정답률 -->
        <div class="comic-panel">
          <h3 class="section-title" style="font-size:1.35rem">📚 단어 정답률 기록</h3>
          <div class="stat-bars-grid">
            ${WORD_CATEGORIES.map(cat => {
              const s = state.words[cat.key] || { correct: 0, total: 0 };
              const rate = s.total ? Math.round((s.correct / s.total) * 100) : 0;
              return `
                <div class="stat-row">
                  <div class="stat-row__top">
                    <span>${cat.icon} ${cat.label}</span>
                    <span>${s.total ? `${rate}% (${s.correct}/${s.total})` : '도전 전'}</span>
                  </div>
                  <div class="arcade-meter">
                    <div class="bar-fill bar-fill--success" style="width:${rate}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 가나 행별 정답률 -->
        <div class="comic-panel">
          <div class="panel-header">
            <h3 class="section-title" style="font-size:1.35rem">✏️ 가나 행별 정답률</h3>
            <div class="tab-group">
              <button type="button" class="tab ${_kanaTab === 'hiragana' ? 'tab--active' : ''}" data-ptab="hiragana">히라가나</button>
              <button type="button" class="tab tab--katakana ${_kanaTab === 'katakana' ? 'tab--active' : ''}" data-ptab="katakana">카타카나</button>
            </div>
          </div>
          <div class="stat-bars-grid">
            ${kanaRows.map(row => {
              const s = state.kana[row] || { correct: 0, total: 0 };
              const rate = s.total ? Math.round((s.correct / s.total) * 100) : 0;
              return `
                <div class="stat-row">
                  <div class="stat-row__top">
                    <span>${row}</span>
                    <span>${s.total ? `${rate}% (${s.correct}/${s.total})` : '도전 전'}</span>
                  </div>
                  <div class="arcade-meter">
                    <div class="bar-fill" style="width:${rate}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 나만의 북마크 단어장 -->
        <div class="comic-panel">
          <div class="panel-header">
            <h3 class="section-title" style="font-size:1.35rem">★ 내 북마크 단어장 (${state.bookmarks.length})</h3>
            ${state.bookmarks.length > 0 ? `
              <div class="kana-actions">
                <button type="button" class="btn btn--primary btn--sm" id="btn-prog-bm-study">카드 복습</button>
                <button type="button" class="btn btn--secondary btn--sm" id="btn-prog-bm-quiz">북마크 퀴즈</button>
              </div>
            ` : ''}
          </div>
          ${state.bookmarks.length === 0 ? `
            <p style="color:var(--color-muted);font-weight:600">
              아직 북마크한 단어가 없어요. 단어 카드에서 ☆ 북마크를 눌러 저장해 보세요!
            </p>
          ` : `
            <div class="bookmark-list">
              ${state.bookmarks.map(word => {
                const entry = _findWordEntry(word);
                return `
                  <div class="bookmark-item">
                    <div>
                      <div class="bookmark-item__word">${word}</div>
                      <div class="bookmark-item__meaning">${entry ? `${entry.meaning} · ${SpeechHelper.formatReading(word, entry.roma)}` : ''}</div>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button type="button" class="btn btn--accent btn--sm" data-speak-word="${word}" aria-label="${word} 듣기">🔊</button>
                      <button type="button" class="btn btn--ghost btn--sm" data-remove-bm="${word}" aria-label="${word} 북마크 해제">✕</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 기록 초기화 -->
        <div style="display:flex;justify-content:flex-end">
          <button type="button" class="btn btn--danger btn--sm" id="btn-open-reset">🗑 기록 처음부터 다시하기</button>
        </div>
      </section>
    `;

    root.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-ptab]');
      if (tabBtn) {
        _kanaTab = tabBtn.dataset.ptab;
        render();
        return;
      }

      const speakBtn = e.target.closest('[data-speak-word]');
      if (speakBtn) {
        SpeechHelper.speak(speakBtn.dataset.speakWord);
        return;
      }

      const removeBtn = e.target.closest('[data-remove-bm]');
      if (removeBtn) {
        Storage.toggleBookmark(removeBtn.dataset.removeBm);
        _notifyStateChanged();
        render();
        return;
      }

      if (e.target.closest('#btn-prog-bm-study')) {
        WordsModule.startBookmarkStudy();
        return;
      }
      if (e.target.closest('#btn-prog-bm-quiz')) {
        WordsModule.startBookmarkQuiz();
        return;
      }
      if (e.target.closest('#btn-open-reset')) {
        _openResetModal();
      }
    }, { signal: ac.signal });
  }

  function _openResetModal() {
    const root = document.getElementById('app-root');
    document.getElementById('reset-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'reset-overlay';
    overlay.className = 'overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="overlay-box">
        ${AnimeSVG.mascot('encourage', 92)}
        <h3>정말 처음부터 다시 할까요?</h3>
        <p style="font-size:0.9rem;color:var(--color-muted)">
          모은 별, 도장, 퀴즈 기록과 북마크가 모두 초기화돼요.
        </p>
        <button type="button" class="btn btn--danger" id="btn-confirm-reset">네, 초기화할게요</button>
        <button type="button" class="btn btn--ghost" id="btn-cancel-reset">아니요, 계속할래요</button>
      </div>
    `;
    root.appendChild(overlay);

    const modalAc = new AbortController();
    const close = () => {
      modalAc.abort();
      overlay.remove();
    };
    Router.onCleanup(close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    }, { signal: modalAc.signal });
    document.getElementById('btn-cancel-reset').addEventListener('click', close, { signal: modalAc.signal });
    document.getElementById('btn-confirm-reset').addEventListener('click', () => {
      Storage.reset();
      _notifyStateChanged();
      close();
      render();
    }, { signal: modalAc.signal });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    }, { signal: modalAc.signal });
  }

  return { render };
})();
