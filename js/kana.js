'use strict';
// ============================================================
// kana.js — 초등학생용 가나 선택 · 카드 학습 · 퀴즈 배틀
// ============================================================

const KanaModule = (() => {
  let _selectedRows = [];
  let _currentType  = 'hiragana';     // 'hiragana' | 'katakana'
  let _quizMode     = 'kana-to-roma'; // 'kana-to-roma' | 'roma-to-kana'
  let _cardIndex    = 0;
  let _cards        = [];
  let _quizTimer    = null;
  let _activeQuiz   = false;
  let _quizRound    = 0;
  let _romaKanaMap  = null;

  function _getRomaKanaMap() {
    if (_romaKanaMap) return _romaKanaMap;
    _romaKanaMap = {};
    for (const items of Object.values(HIRAGANA)) {
      for (const item of items) {
        if (!_romaKanaMap[item.roma]) _romaKanaMap[item.roma] = item.kana;
      }
    }
    return _romaKanaMap;
  }

  function _formatRomaLabel(roma) {
    const kana = _getRomaKanaMap()[roma];
    return kana ? SpeechHelper.formatReading(kana, roma) : roma;
  }

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

  function _groupRows(data) {
    const basic = [];
    const voiced = [];
    const yoon = [];
    for (const row of Object.keys(data)) {
      if (row.includes('(요음)')) yoon.push(row);
      else if (row.includes('(탁음)') || row.includes('(반탁음)')) voiced.push(row);
      else basic.push(row);
    }
    return [
      { id: 'basic',  title: '기본 글자 (청음)',       badge: '기초', rows: basic },
      { id: 'voiced', title: '탁음 · 반탁음 (변신 글자)', badge: '탁음', rows: voiced },
      { id: 'yoon',   title: '작은 글자 합체 (요음)',   badge: '요음', rows: yoon },
    ];
  }

  function _buildPool(rows) {
    const data = _currentType === 'hiragana' ? HIRAGANA : KATAKANA;
    return rows.flatMap(row => (data[row] || []).map(item => ({ ...item, row })));
  }

  function _buildFallbackPool() {
    const data = _currentType === 'hiragana' ? HIRAGANA : KATAKANA;
    return Object.entries(data).flatMap(([row, items]) => items.map(item => ({ ...item, row })));
  }

  // ── 행 선택 화면 (#kana) ──────────────────────────────────
  function renderSelectScreen(alertMsg = '') {
    const root = document.getElementById('app-root');
    const data = _currentType === 'hiragana' ? HIRAGANA : KATAKANA;
    const allRows = Object.keys(data);
    const groups = _groupRows(data);
    const ac = new AbortController();

    Router.onCleanup(() => ac.abort());

    root.innerHTML = `
      <section class="kana-select">
        <div class="panel-header">
          <h2 class="section-title">가나 도장 수련</h2>
          <div class="tab-group" role="tablist" aria-label="문자 종류 선택">
            <button type="button" role="tab" aria-selected="${_currentType === 'hiragana'}"
              class="tab ${_currentType === 'hiragana' ? 'tab--active' : ''}" data-type="hiragana">
              히라가나 (あ)
            </button>
            <button type="button" role="tab" aria-selected="${_currentType === 'katakana'}"
              class="tab tab--katakana ${_currentType === 'katakana' ? 'tab--active' : ''}" data-type="katakana">
              카타카나 (ア)
            </button>
          </div>
        </div>

        <div class="mascot-row">
          ${AnimeSVG.mascot('idle', 88)}
          <div class="speech-bubble">
            배울 행을 골라 카드로 익히고 퀴즈 배틀에 도전해 보자!
          </div>
        </div>

        ${alertMsg ? `<div class="inline-alert" role="alert">${alertMsg}</div>` : ''}

        <div class="kana-toolbar">
          <div class="mode-toggle-group">
            <span class="pill-badge">선택: ${_selectedRows.length} / ${allRows.length}행</span>
            <button type="button" class="btn btn--ghost btn--sm" id="btn-toggle-all">
              ${_selectedRows.length === allRows.length ? '모두 해제' : '전체 선택'}
            </button>
          </div>
          <div class="mode-toggle-group" role="group" aria-label="퀴즈 방향">
            <button type="button" class="btn btn--sm ${_quizMode === 'kana-to-roma' ? 'btn--accent' : 'btn--ghost'}" data-qmode="kana-to-roma">
              가나 → 소리
            </button>
            <button type="button" class="btn btn--sm ${_quizMode === 'roma-to-kana' ? 'btn--accent' : 'btn--ghost'}" data-qmode="roma-to-kana">
              소리 → 가나
            </button>
          </div>
        </div>

        ${groups.map(group => {
          const allInGroup = group.rows.every(r => _selectedRows.includes(r));
          return `
            <div class="kana-section-box">
              <div class="kana-section-box__head">
                <h3 class="kana-section-box__title">
                  <span class="pill-badge pill-badge--gold">${group.badge}</span>
                  ${group.title}
                </h3>
                <button type="button" class="btn btn--ghost btn--sm" data-group-toggle="${group.id}">
                  ${allInGroup ? '구역 해제' : '구역 전체'}
                </button>
              </div>
              <div class="row-select-grid">
                ${group.rows.map(row => {
                  const checked = _selectedRows.includes(row);
                  const preview = data[row][0]?.kana || '';
                  return `
                    <label class="row-check ${checked ? 'row-check--checked' : ''}">
                      <input type="checkbox" value="${row}" ${checked ? 'checked' : ''} />
                      <span>${row}</span>
                      <small style="color:var(--color-muted)">(${preview})</small>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}

        <div class="kana-actions">
          <button type="button" class="btn btn--primary" id="btn-study">📖 카드 학습 시작</button>
          <button type="button" class="btn btn--secondary" id="btn-quiz">⚡ 퀴즈 배틀 시작</button>
        </div>
      </section>
    `;

    root.addEventListener('click', (e) => {
      const typeBtn = e.target.closest('[data-type]');
      if (typeBtn) {
        _currentType = typeBtn.dataset.type;
        _selectedRows = [];
        renderSelectScreen();
        return;
      }

      const modeBtn = e.target.closest('[data-qmode]');
      if (modeBtn) {
        _quizMode = modeBtn.dataset.qmode;
        renderSelectScreen();
        return;
      }

      const groupBtn = e.target.closest('[data-group-toggle]');
      if (groupBtn) {
        const targetGroup = groups.find(g => g.id === groupBtn.dataset.groupToggle);
        if (!targetGroup) return;
        const everySelected = targetGroup.rows.every(r => _selectedRows.includes(r));
        if (everySelected) {
          _selectedRows = _selectedRows.filter(r => !targetGroup.rows.includes(r));
        } else {
          _selectedRows = Array.from(new Set([..._selectedRows, ...targetGroup.rows]));
        }
        renderSelectScreen();
        return;
      }

      if (e.target.closest('#btn-toggle-all')) {
        _selectedRows = _selectedRows.length === allRows.length ? [] : [...allRows];
        renderSelectScreen();
        return;
      }

      if (e.target.closest('#btn-study')) {
        if (!_selectedRows.length) {
          renderSelectScreen('먼저 연습할 행을 1개 이상 골라 주세요!');
          return;
        }
        _startCard();
        return;
      }

      if (e.target.closest('#btn-quiz')) {
        if (!_selectedRows.length) {
          renderSelectScreen('퀴즈 배틀을 시작할 행을 1개 이상 골라 주세요!');
          return;
        }
        _startQuiz();
      }
    }, { signal: ac.signal });

    root.addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;
      const row = e.target.value;
      if (e.target.checked) {
        if (!_selectedRows.includes(row)) _selectedRows.push(row);
      } else {
        _selectedRows = _selectedRows.filter(r => r !== row);
      }
      renderSelectScreen();
    }, { signal: ac.signal });
  }

  // ── 카드 학습 ─────────────────────────────────────────────
  function _startCard() {
    _cards = _buildPool(_selectedRows);
    _cardIndex = 0;
    _renderCard();
  }

  function _renderCard() {
    const root = document.getElementById('app-root');
    const card = _cards[_cardIndex];
    const ac = new AbortController();
    Router.onCleanup(() => {
      ac.abort();
      SpeechHelper.stop();
    });

    root.innerHTML = `
      <section class="card-study">
        <div class="study-topbar">
          <button type="button" class="btn btn--ghost btn--sm" id="btn-back-kana">← 행 선택</button>
          <span class="progress-text">${_cardIndex + 1} / ${_cards.length}</span>
          <span class="pill-badge">${card.row}</span>
        </div>

        <div class="flip-stage">
          <div class="flip-card" id="flip-card" role="button" tabindex="0" aria-label="가나 카드 뒤집기">
            <div class="flip-card__front">
              <span class="flip-card__tag">${_currentType === 'hiragana' ? '히라가나' : '카타카나'}</span>
              <span class="kana-big">${card.kana}</span>
            </div>
            <div class="flip-card__back">
              <span class="flip-card__tag">읽는 소리</span>
              <span class="roma-big">${SpeechHelper.formatReading(card.kana, card.roma)}</span>
              <span class="kana-big" style="font-size:2.4rem">${card.kana}</span>
            </div>
          </div>
        </div>

        <div class="card-controls-row">
          <button type="button" class="btn btn--ghost" id="btn-prev" ${_cardIndex === 0 ? 'disabled' : ''}>◀ 이전</button>
          <button type="button" class="btn btn--accent" id="btn-speak">
            🔊 소리 듣기
          </button>
          <button type="button" class="btn btn--primary" id="btn-next" ${_cardIndex === _cards.length - 1 ? 'disabled' : ''}>다음 ▶</button>
        </div>

        <div class="pill-badge pill-badge--gold" id="speech-feedback" aria-live="polite" hidden></div>

        <p class="card-hint">
          카드 클릭 또는 스페이스바로 뒤집기 · ←/→ 이동 · S 발음 듣기
        </p>
      </section>
    `;

    const flipCardEl = document.getElementById('flip-card');
    const toggleFlip = () => flipCardEl.classList.toggle('flipped');

    flipCardEl.addEventListener('click', toggleFlip, { signal: ac.signal });
    _bindSpeechStatus(ac.signal);
    document.getElementById('btn-back-kana').addEventListener('click', () => renderSelectScreen(), { signal: ac.signal });
    document.getElementById('btn-speak').addEventListener('click', () => SpeechHelper.speak(card.kana), { signal: ac.signal });
    document.getElementById('btn-prev')?.addEventListener('click', () => {
      if (_cardIndex > 0) { _cardIndex--; _renderCard(); }
    }, { signal: ac.signal });
    document.getElementById('btn-next')?.addEventListener('click', () => {
      if (_cardIndex < _cards.length - 1) { _cardIndex++; _renderCard(); }
    }, { signal: ac.signal });

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          toggleFlip();
        }
      } else if (e.key === 'ArrowLeft' && _cardIndex > 0) {
        _cardIndex--;
        _renderCard();
      } else if (e.key === 'ArrowRight' && _cardIndex < _cards.length - 1) {
        _cardIndex++;
        _renderCard();
      } else if (e.key.toLowerCase() === 's') {
        SpeechHelper.speak(card.kana);
      }
    }, { signal: ac.signal });
  }

  // ── 가나 퀴즈 배틀 ─────────────────────────────────────────
  function _startQuiz() {
    const pool = _buildPool(_selectedRows);
    const fallbackPool = _buildFallbackPool();
    _activeQuiz = true;
    _quizRound += 1;

    Router.navigate('#kana-quiz');

    QuizEngine.start({
      pool,
      fallbackPool,
      type: 'kana',
      mode: _quizMode,
      setSize: 10,
      onRender(q, idx, total) {
        _renderQuizUI(q, idx, total);
      },
      onResult(summary) {
        _activeQuiz = false;
        const reward = Storage.recordQuizResult({
          type: 'kana',
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

  function _renderQuizUI(q, idx, total) {
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
    const modeLabel = _quizMode === 'kana-to-roma' ? '가나 → 읽는 소리' : '읽는 소리 → 가나';
    const mascotMsg = q.isRetry
      ? '아까 틀린 문제 복수전! 이번엔 꼭 맞히자!'
      : q.streak >= 3
        ? `대단해! ${q.streak}연속 콤보 질주 중!`
        : '차근차근 보고 정답 번호를 골라 봐!';

    root.innerHTML = `
      <section class="quiz-screen">
        <div class="quiz-header">
          <div class="quiz-header__top">
            <span class="quiz-progress">STAGE ${idx + 1} / ${total}</span>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${q.streak >= 2 ? `<span class="combo-badge ${q.streak >= 5 ? 'combo-badge--fever' : ''}">🔥 ${q.streak} COMBO!</span>` : ''}
              <span class="pill-badge">${modeLabel}</span>
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
          <div class="stage-motif-overlay" aria-hidden="true">${AnimeSVG.quizStageBackdrop(_quizRound * 13 + idx)}</div>
          <div class="sakura-shadow-overlay" id="sakura-shadow-overlay" aria-hidden="true">${AnimeSVG.sakuraStageShadow(_quizRound * 13 + idx)}</div>
          <div class="speed-lines-overlay">${AnimeSVG.speedLines()}</div>
          ${q.isRetry ? '<span class="pill-badge pill-badge--gold" style="position:relative;z-index:2">🔁 다시 도전 문제!</span>' : ''}
          <div class="quiz-question ${_quizMode === 'kana-to-roma' ? 'kana-huge' : 'meaning-huge'}">${_quizMode === 'kana-to-roma' ? q.question : _formatRomaLabel(q.question)}</div>
          <div class="quiz-hint-area">
            <button type="button" class="btn btn--ghost btn--sm" id="btn-quiz-speak">
              🔊 소리 듣기
            </button>
            <span class="quiz-hint-text" id="speech-feedback" aria-live="polite" hidden></span>
          </div>
        </div>

        <div class="quiz-options">
          ${q.options.map((opt, i) => `
            <button type="button" class="quiz-option" data-value="${opt}">
              <span class="quiz-option__num">${i + 1}</span>
              <span>${_quizMode === 'kana-to-roma' ? _formatRomaLabel(opt) : opt}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;

    const handleChoice = (btn) => {
      const result = QuizEngine.select(btn.dataset.value);
      if (!result) return;

      document.querySelectorAll('.quiz-option').forEach(b => {
        b.disabled = true;
        if (b.dataset.value === result.answer) b.classList.add('correct');
        else if (!result.correct && b === btn) b.classList.add('wrong');
      });

      const stage = document.getElementById('quiz-stage');
      const sakuraOverlay = document.getElementById('sakura-shadow-overlay');
      const msgEl = document.getElementById('quiz-mascot-msg');
      if (result.correct) {
        stage?.classList.add('quiz-stage--burst');
        sakuraOverlay?.classList.add('active');
        if (msgEl) msgEl.textContent = result.streak >= 3 ? `완벽해! ${result.streak}연속 정답!!` : '정답! 아주 잘했어!';
      } else {
        const answerLabel = _quizMode === 'kana-to-roma' ? _formatRomaLabel(result.answer) : result.answer;
        if (msgEl) msgEl.textContent = `아깝다! 정답은 "${answerLabel}" 이야!`;
      }

      _quizTimer = setTimeout(() => QuizEngine.next(), result.correct ? 850 : 1300);
    };

    _bindSpeechStatus(ac.signal);
    document.getElementById('btn-quiz-speak')?.addEventListener('click', () => {
      SpeechHelper.speak(q.speakText);
    }, { signal: ac.signal });

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
    if (!_activeQuiz && !_selectedRows.length) {
      Router.navigate('#kana');
    } else if (!_activeQuiz && _selectedRows.length) {
      _startQuiz();
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
          <h2>${pct === 100 ? '퍼펙트 클리어!!' : pct >= 70 ? '배틀 승리! 잘했어!' : '끝까지 도전 완료!'}</h2>
          <div class="result-score">${summary.score} <span>/ ${summary.total} (${pct}%)</span></div>
          <div class="result-rewards">
            <span class="pill-badge pill-badge--gold">★ 별 +${reward.earnedStars}개</span>
            <span class="pill-badge">🔥 최고 ${summary.maxStreak} 콤보</span>
            ${unlockedNames.map(n => `<span class="pill-badge" style="background:var(--color-success-soft)">🏅 새 도장: ${n}</span>`).join('')}
          </div>
          <div class="kana-actions">
            <button type="button" class="btn btn--secondary" id="btn-retry-quiz">⚡ 한 판 더 하기</button>
            <button type="button" class="btn btn--primary" id="btn-back-select">행 선택으로</button>
            <button type="button" class="btn btn--ghost" id="btn-go-progress">도장북 보기</button>
          </div>
        </div>
      </section>
    `;

    document.getElementById('btn-retry-quiz').addEventListener('click', () => _startQuiz(), { signal: ac.signal });
    document.getElementById('btn-back-select').addEventListener('click', () => Router.navigate('#kana'), { signal: ac.signal });
    document.getElementById('btn-go-progress').addEventListener('click', () => Router.navigate('#progress'), { signal: ac.signal });
  }

  return { renderSelectScreen, renderQuiz };
})();
