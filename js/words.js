'use strict';
// ============================================================
// words.js — 초등학생용 단어 학습 & 퀴즈 배틀
// ============================================================

const WordsModule = (() => {
  let _selectedKey = null;
  let _studyPool   = [];
  let _cardIndex   = 0;
  let _quizTimer   = null;
  let _activeQuiz  = false;
  let _quizConfig  = null; // { key, pool, label }
  let _quizRound   = 0;

  function _bindSpeechStatus(signal) {
    const el = document.getElementById('speech-feedback');
    if (!el) return;
    document.addEventListener('jp:speech-status', (e) => {
      const { mode, text, hangul } = e.detail || {};
      if (!text) return;
      if (mode === 'ja') {
        el.textContent = `🔊 일본어 발음: ${text} [${hangul}]`;
      } else if (mode === 'ko-fallback') {
        el.textContent = `🔊 안내 발음: [${hangul}] (기기 일본어 음성 미설치로 한국어 안내 음성 재생)`;
      } else {
        el.textContent = `🔔 발음 표기: [${hangul}] (브라우저 음성 출력 불가 환경)`;
      }
      el.hidden = false;
    }, { signal });
  }

  function _notifyStateChanged() {
    document.dispatchEvent(new CustomEvent('jp:state-changed'));
  }

  function _allWordItems() {
    return Object.entries(WORDS).flatMap(([key, list]) =>
      list.map(w => ({ ...w, key }))
    );
  }

  function _findBookmarkedItems() {
    const bookmarks = Storage.load().bookmarks;
    const byWord = new Map();
    for (const [key, list] of Object.entries(WORDS)) {
      for (const w of list) {
        if (bookmarks.includes(w.word) && !byWord.has(w.word)) {
          byWord.set(w.word, { ...w, key });
        }
      }
    }
    return Array.from(byWord.values());
  }

  // ── 카테고리 선택 화면 (#words) ───────────────────────────
  function renderSelectScreen() {
    const root = document.getElementById('app-root');
    const state = Storage.load();
    const ac = new AbortController();
    Router.onCleanup(() => ac.abort());

    const bookmarkCount = state.bookmarks.length;

    root.innerHTML = `
      <section class="words-select">
        <div class="panel-header">
          <h2 class="section-title">단어 모험 도장</h2>
          ${bookmarkCount > 0 ? `
            <div class="kana-actions">
              <button type="button" class="btn btn--accent btn--sm" id="btn-bm-study">★ 북마크 카드 (${bookmarkCount})</button>
              <button type="button" class="btn btn--secondary btn--sm" id="btn-bm-quiz">★ 북마크 퀴즈</button>
            </div>
          ` : ''}
        </div>

        <div class="mascot-row">
          ${AnimeSVG.mascot('idle', 86)}
          <div class="speech-bubble">
            궁금한 주제를 누르면 카드 연습과 퀴즈 배틀을 고를 수 있어!
          </div>
        </div>

        <div class="category-grid">
          ${WORD_CATEGORIES.map(cat => {
            const list = WORDS[cat.key] || [];
            const s = state.words[cat.key] || { correct: 0, total: 0 };
            const rate = s.total ? Math.round((s.correct / s.total) * 100) : 0;
            return `
              <button type="button" class="category-card" data-key="${cat.key}">
                <div class="category-card__head">
                  <span class="category-card__icon">${cat.icon}</span>
                  <span class="category-card__count">${list.length}단어</span>
                </div>
                <div class="category-card__label">${cat.label}</div>
                <div class="category-card__tagline">${cat.tagline}</div>
                <div class="category-card__bar">
                  <div class="bar-fill bar-fill--success" style="width:${rate}%"></div>
                </div>
                <div class="category-card__rate">정답률 ${rate}%</div>
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;

    root.addEventListener('click', (e) => {
      if (e.target.closest('#btn-bm-study')) {
        startBookmarkStudy();
        return;
      }
      if (e.target.closest('#btn-bm-quiz')) {
        startBookmarkQuiz();
        return;
      }
      const card = e.target.closest('.category-card');
      if (card) _showMenu(card.dataset.key);
    }, { signal: ac.signal });
  }

  function _showMenu(key) {
    _selectedKey = key;
    const cat = WORD_CATEGORIES.find(c => c.key === key);
    if (!cat) return;

    const root = document.getElementById('app-root');
    document.getElementById('cat-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cat-overlay';
    overlay.className = 'overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="overlay-box">
        <div class="overlay-icon">${cat.icon}</div>
        <h3>${cat.label}</h3>
        <p style="font-size:0.9rem;color:var(--color-muted)">${cat.tagline}</p>
        <button type="button" class="btn btn--primary" id="btn-card">📖 단어 카드 보기</button>
        <button type="button" class="btn btn--secondary" id="btn-quiz">⚡ 퀴즈 배틀 시작</button>
        <button type="button" class="btn btn--ghost" id="btn-close">닫기</button>
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
    document.getElementById('btn-card').addEventListener('click', () => { close(); _startCard(key); }, { signal: modalAc.signal });
    document.getElementById('btn-quiz').addEventListener('click', () => { close(); _startQuiz(key); }, { signal: modalAc.signal });
    document.getElementById('btn-close').addEventListener('click', close, { signal: modalAc.signal });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    }, { signal: modalAc.signal });
  }

  // ── 카드 학습 ─────────────────────────────────────────────
  function _startCard(key) {
    _selectedKey = key;
    _studyPool = (WORDS[key] || []).map(w => ({ ...w, key }));
    _cardIndex = 0;
    _renderWordCard();
  }

  function startBookmarkStudy() {
    const items = _findBookmarkedItems();
    if (!items.length) return;
    _selectedKey = 'bookmarks';
    _studyPool = items;
    _cardIndex = 0;
    _renderWordCard();
  }

  function _renderWordCard() {
    const root = document.getElementById('app-root');
    const w = _studyPool[_cardIndex];
    const isMarked = Storage.load().bookmarks.includes(w.word);
    const cat = WORD_CATEGORIES.find(c => c.key === w.key);
    const ac = new AbortController();

    Router.onCleanup(() => {
      ac.abort();
      SpeechHelper.stop();
    });

    root.innerHTML = `
      <section class="card-study">
        <div class="study-topbar">
          <button type="button" class="btn btn--ghost btn--sm" id="btn-back-words">← 목록으로</button>
          <span class="progress-text">${_cardIndex + 1} / ${_studyPool.length}</span>
          <span class="pill-badge">${cat ? cat.label : '★ 북마크'}</span>
        </div>

        <div class="flip-stage">
          <div class="flip-card" id="flip-card" role="button" tabindex="0" aria-label="단어 카드 뒤집기">
            <div class="flip-card__front">
              <span class="flip-card__tag">일본어</span>
              <span class="word-big">${w.word}</span>
            </div>
            <div class="flip-card__back">
              <span class="flip-card__tag">뜻과 발음</span>
              <span class="meaning-big">${w.meaning}</span>
              <span class="roma-small">${SpeechHelper.formatReading(w.word, w.roma)}</span>
            </div>
          </div>
        </div>

        <div class="card-controls-row">
          <button type="button" class="btn btn--ghost" id="btn-prev" ${_cardIndex === 0 ? 'disabled' : ''}>◀ 이전</button>
          <button type="button" class="btn btn--accent" id="btn-speak">
            🔊 소리 듣기
          </button>
          <button type="button" class="btn btn--bookmark ${isMarked ? 'bookmarked' : ''}" id="btn-bm">
            ${isMarked ? '★ 북마크됨' : '☆ 북마크'}
          </button>
          <button type="button" class="btn btn--primary" id="btn-next" ${_cardIndex === _studyPool.length - 1 ? 'disabled' : ''}>다음 ▶</button>
        </div>

        <div class="pill-badge pill-badge--gold" id="speech-feedback" aria-live="polite" hidden></div>

        <p class="card-hint">
          카드 클릭/스페이스바로 뒤집기 · ←/→ 이동 · S 듣기 · B 북마크
        </p>
      </section>
    `;

    const flipEl = document.getElementById('flip-card');
    const toggleFlip = () => flipEl.classList.toggle('flipped');
    const toggleBm = () => {
      Storage.toggleBookmark(w.word);
      _notifyStateChanged();
      _renderWordCard();
    };

    flipEl.addEventListener('click', toggleFlip, { signal: ac.signal });
    _bindSpeechStatus(ac.signal);
    document.getElementById('btn-back-words').addEventListener('click', () => Router.navigate('#words'), { signal: ac.signal });
    document.getElementById('btn-speak').addEventListener('click', () => SpeechHelper.speak(w.word), { signal: ac.signal });
    document.getElementById('btn-bm').addEventListener('click', toggleBm, { signal: ac.signal });
    document.getElementById('btn-prev')?.addEventListener('click', () => {
      if (_cardIndex > 0) { _cardIndex--; _renderWordCard(); }
    }, { signal: ac.signal });
    document.getElementById('btn-next')?.addEventListener('click', () => {
      if (_cardIndex < _studyPool.length - 1) { _cardIndex++; _renderWordCard(); }
    }, { signal: ac.signal });

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          toggleFlip();
        }
      } else if (e.key === 'ArrowLeft' && _cardIndex > 0) {
        _cardIndex--;
        _renderWordCard();
      } else if (e.key === 'ArrowRight' && _cardIndex < _studyPool.length - 1) {
        _cardIndex++;
        _renderWordCard();
      } else if (e.key.toLowerCase() === 's') {
        SpeechHelper.speak(w.word);
      } else if (e.key.toLowerCase() === 'b') {
        toggleBm();
      }
    }, { signal: ac.signal });
  }

  // ── 단어 퀴즈 배틀 ─────────────────────────────────────────
  function _startQuiz(key) {
    const cat = WORD_CATEGORIES.find(c => c.key === key);
    const pool = (WORDS[key] || []).map(w => ({ ...w, key }));
    _launchWordQuiz({ key, pool, label: cat ? cat.label : '단어 퀴즈' });
  }

  function startBookmarkQuiz() {
    const pool = _findBookmarkedItems();
    if (!pool.length) return;
    _launchWordQuiz({ key: 'bookmarks', pool, label: '★ 북마크 복습' });
  }

  function _launchWordQuiz(config) {
    _selectedKey = config.key;
    _quizConfig = config;
    _activeQuiz = true;
    _quizRound += 1;

    Router.navigate('#words-quiz');

    QuizEngine.start({
      pool: config.pool,
      fallbackPool: _allWordItems(),
      type: 'word',
      setSize: Math.min(10, Math.max(4, config.pool.length < 10 ? 10 : 10)),
      onRender(q, idx, total) {
        _renderQuizUI(q, idx, total, config.label);
      },
      onResult(summary) {
        _activeQuiz = false;
        const reward = Storage.recordQuizResult({
          type: 'word',
          keyStats: summary.rowStats,
          score: summary.score,
          total: summary.total,
          maxStreak: summary.maxStreak,
        });
        _notifyStateChanged();
        _renderResult(summary, reward);
      },
    });
  }

  function _renderQuizUI(q, idx, total, label) {
    const root = document.getElementById('app-root');
    const ac = new AbortController();
    clearTimeout(_quizTimer);
    Router.onCleanup(() => {
      ac.abort();
      clearTimeout(_quizTimer);
      SpeechHelper.stop();
      _activeQuiz = false;
    });

    const pct = Math.round(((idx + 1) / total) * 100);
    const mascotMsg = q.isRetry
      ? '다시 만난 단어! 이번엔 꼭 맞혀 보자!'
      : q.streak >= 3
        ? `대단해! ${q.streak}연속 콤보 중!!`
        : '우리말 뜻에 맞는 일본어 단어를 골라 봐!';

    root.innerHTML = `
      <section class="quiz-screen">
        <div class="quiz-header">
          <div class="quiz-header__top">
            <span class="quiz-progress">STAGE ${idx + 1} / ${total}</span>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${q.streak >= 2 ? `<span class="combo-badge ${q.streak >= 5 ? 'combo-badge--fever' : ''}">🔥 ${q.streak} COMBO!</span>` : ''}
              <span class="pill-badge">${label}</span>
            </div>
          </div>
          <div class="arcade-meter" aria-label="진행률 ${pct}%">
            <div class="arcade-meter__fill" style="width:${pct}%"></div>
          </div>
        </div>

        <div class="mascot-row">
          ${AnimeSVG.mascot(q.streak >= 3 ? 'happy' : 'idle', 76)}
          <div class="speech-bubble" id="quiz-mascot-msg">${mascotMsg}</div>
        </div>

        <div class="quiz-stage" id="quiz-stage">
          <div class="stage-motif-overlay" aria-hidden="true">${AnimeSVG.quizStageBackdrop(_quizRound * 17 + idx)}</div>
          <div class="sakura-shadow-overlay" id="sakura-shadow-overlay" aria-hidden="true">${AnimeSVG.sakuraStageShadow(_quizRound * 17 + idx)}</div>
          <div class="speed-lines-overlay">${AnimeSVG.speedLines()}</div>
          ${q.isRetry ? '<span class="pill-badge pill-badge--gold" style="position:relative;z-index:2">🔁 다시 도전 문제!</span>' : ''}
          <div class="quiz-question meaning-huge">${q.question}</div>
          <div class="quiz-hint-area">
            <button type="button" class="btn btn--ghost btn--sm" id="btn-show-hint">💡 발음 힌트 보기</button>
            <span class="quiz-hint-text" id="quiz-hint-text" hidden>${SpeechHelper.formatReading(q.speakText, q.hint)}</span>
            <button type="button" class="btn btn--ghost btn--sm" id="btn-quiz-speak" hidden>
              🔊 정답 듣기
            </button>
            <span class="quiz-hint-text" id="speech-feedback" aria-live="polite" hidden></span>
          </div>
        </div>

        <div class="quiz-options quiz-options--word">
          ${q.options.map((opt, i) => `
            <button type="button" class="quiz-option" data-value="${opt}">
              <span class="quiz-option__num">${i + 1}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;

    const hintBtn = document.getElementById('btn-show-hint');
    const hintText = document.getElementById('quiz-hint-text');
    const speakBtn = document.getElementById('btn-quiz-speak');

    hintBtn.addEventListener('click', () => {
      hintBtn.hidden = true;
      hintText.hidden = false;
    }, { signal: ac.signal });

    speakBtn.addEventListener('click', () => SpeechHelper.speak(q.speakText), { signal: ac.signal });
    _bindSpeechStatus(ac.signal);

    const handleChoice = (btn) => {
      const result = QuizEngine.select(btn.dataset.value);
      if (!result) return;

      document.querySelectorAll('.quiz-option').forEach(b => {
        b.disabled = true;
        if (b.dataset.value === result.answer) b.classList.add('correct');
        else if (!result.correct && b === btn) b.classList.add('wrong');
      });

      hintBtn.hidden = true;
      hintText.hidden = false;
      speakBtn.hidden = false;

      const stage = document.getElementById('quiz-stage');
      const sakuraOverlay = document.getElementById('sakura-shadow-overlay');
      const msgEl = document.getElementById('quiz-mascot-msg');
      if (result.correct) {
        stage?.classList.add('quiz-stage--burst');
        sakuraOverlay?.classList.add('active');
        if (msgEl) msgEl.textContent = result.streak >= 3 ? `최고야! ${result.streak}연속 콤보!!` : '정답! 단어 실력이 쑥쑥 늘고 있어!';
      } else {
        if (msgEl) msgEl.textContent = `정답은 "${result.answer}" · ${SpeechHelper.formatReading(result.answer, q.hint)} 이야!`;
      }

      _quizTimer = setTimeout(() => QuizEngine.next(), result.correct ? 900 : 1400);
    };

    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn), { signal: ac.signal });
    });

    document.addEventListener('keydown', (e) => {
      const idxKey = Number(e.key) - 1;
      if (idxKey >= 0 && idxKey < 4) {
        const btns = document.querySelectorAll('.quiz-option');
        if (btns[idxKey] && !btns[idxKey].disabled) handleChoice(btns[idxKey]);
      }
    }, { signal: ac.signal });
  }

  function renderQuiz() {
    if (!_activeQuiz && !_quizConfig) {
      Router.navigate('#words');
    } else if (!_activeQuiz && _quizConfig) {
      _launchWordQuiz(_quizConfig);
    }
  }

  function _renderResult(summary, reward) {
    const root = document.getElementById('app-root');
    const pct = Math.round((summary.score / summary.total) * 100);
    const ac = new AbortController();
    Router.onCleanup(() => ac.abort());

    const stampDefs = typeof STAMP_DEFINITIONS !== 'undefined' ? STAMP_DEFINITIONS : [];
    const unlockedNames = reward.newStamps
      .map(id => stampDefs.find(s => s.id === id)?.title)
      .filter(Boolean);

    root.innerHTML = `
      <section class="quiz-result">
        <div class="speed-lines-overlay" style="opacity:0.55">${AnimeSVG.speedLines()}</div>
        <div class="quiz-result__inner">
          ${AnimeSVG.mascot(pct >= 70 ? 'happy' : 'encourage', 120)}
          <h2>${pct === 100 ? '단어 마스터 등극!!' : pct >= 70 ? '단어 배틀 승리!' : '멋진 도전이었어!'}</h2>
          <div class="result-score">${summary.score} <span>/ ${summary.total} (${pct}%)</span></div>
          <div class="result-rewards">
            <span class="pill-badge pill-badge--gold">★ 별 +${reward.earnedStars}개</span>
            <span class="pill-badge">🔥 최고 ${summary.maxStreak} 콤보</span>
            ${unlockedNames.map(n => `<span class="pill-badge" style="background:var(--color-success-soft)">🏅 새 도장: ${n}</span>`).join('')}
          </div>
          <div class="kana-actions">
            <button type="button" class="btn btn--secondary" id="btn-retry-words">⚡ 다시 도전</button>
            <button type="button" class="btn btn--primary" id="btn-back-words">단어 목록으로</button>
            <button type="button" class="btn btn--ghost" id="btn-go-progress">도장북 보기</button>
          </div>
        </div>
      </section>
    `;

    document.getElementById('btn-retry-words').addEventListener('click', () => _launchWordQuiz(_quizConfig), { signal: ac.signal });
    document.getElementById('btn-back-words').addEventListener('click', () => Router.navigate('#words'), { signal: ac.signal });
    document.getElementById('btn-go-progress').addEventListener('click', () => Router.navigate('#progress'), { signal: ac.signal });
  }

  return {
    renderSelectScreen,
    renderQuiz,
    startBookmarkStudy,
    startBookmarkQuiz,
  };
})();
