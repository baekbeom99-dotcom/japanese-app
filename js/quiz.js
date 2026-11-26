'use strict';
// ============================================================
// quiz.js — 객관식 퀴즈 공통 엔진
//
// 핵심 규칙:
//   1. 선택 풀의 모든 항목을 동일 확률로 제시
//   2. 세션 내 중복 제시 금지 (소진 후 재셔플)
//   3. 틀린 항목은 현재 세트 내 남은 슬롯에 최대 3회 재등장
//   4. setSize(기본 10)문제 단위로 결과 표시 + 콤보·행별 통계 집계
// ============================================================

const QuizEngine = (() => {
  let _s = null;

  /**
   * 퀴즈 세션 시작
   * @param {Object}   config
   * @param {Array}    config.pool           - 출제 풀 배열
   * @param {Array}    [config.fallbackPool] - 풀 < 4일 때 보기 보충용 풀
   * @param {string}   config.type           - 'kana' | 'word'
   * @param {string}   [config.mode]         - 가나: 'kana-to-roma'(기본) | 'roma-to-kana'
   * @param {number}   [config.setSize]      - 한 세트 문제 수 (기본 10)
   * @param {Function} config.onRender       - (q, idx, total) 문제 렌더 콜백
   * @param {Function} config.onResult       - (summary) 세트 완료 콜백
   */
  function start(config) {
    const setSize = config.setSize || 10;
    const pool = [...config.pool];
    const fallbackPool = Array.isArray(config.fallbackPool) && config.fallbackPool.length
      ? [...config.fallbackPool]
      : pool;

    _s = {
      type:         config.type,
      mode:         config.mode || 'kana-to-roma',
      pool,
      fallbackPool,
      queue:        _shuffle([...pool]),
      retryQueue:   [],
      retryCount:   {},
      setSize,
      currentQ:     null,
      idx:          0,
      score:        0,
      streak:       0,
      maxStreak:    0,
      rowStats:     {},
      answered:     false,
      onRender:     config.onRender || (() => {}),
      onResult:     config.onResult || (() => {}),
    };

    _advanceQuestion();
  }

  /**
   * 보기 선택 처리
   * @param {string} chosen
   * @returns {{ correct: boolean, answer: string, streak: number, maxStreak: number, item: Object }|null}
   */
  function select(chosen) {
    if (!_s || _s.answered || !_s.currentQ) return null;
    _s.answered = true;

    const q = _s.currentQ;
    const correct = chosen === q.answer;
    const statKey = _statKey(q._item);

    if (statKey) {
      if (!_s.rowStats[statKey]) {
        _s.rowStats[statKey] = { correct: 0, total: 0 };
      }
      _s.rowStats[statKey].total += 1;
      if (correct) _s.rowStats[statKey].correct += 1;
    }

    if (correct) {
      _s.score += 1;
      _s.streak += 1;
      _s.maxStreak = Math.max(_s.maxStreak, _s.streak);
    } else {
      _s.streak = 0;
      const key = _key(q._item);
      const cnt = _s.retryCount[key] || 0;
      if (cnt < 3) {
        _s.retryCount[key] = cnt + 1;
        _s.retryQueue.push({ item: q._item, isRetry: true });
      }
    }

    return {
      correct,
      answer: q.answer,
      streak: _s.streak,
      maxStreak: _s.maxStreak,
      item: q._item,
    };
  }

  /** 다음 문제로 이동 (세트 완료 시 onResult 호출) */
  function next() {
    if (!_s) return;
    _s.answered = false;
    _s.idx += 1;

    if (_s.idx >= _s.setSize) {
      _s.onResult({
        score:     _s.score,
        total:     _s.setSize,
        maxStreak: _s.maxStreak,
        rowStats:  _s.rowStats,
      });
    } else {
      _advanceQuestion();
    }
  }

  // ── 내부 함수 ──────────────────────────────────────────────

  function _advanceQuestion() {
    const entry = _dequeue();
    const q = _makeQ(entry.item, entry.isRetry);
    q.streak = _s.streak;
    _s.currentQ = q;
    _s.onRender(q, _s.idx, _s.setSize);
  }

  /**
   * 큐에서 다음 항목 꺼내기
   * 우선순위: retryQueue → 일반 queue (소진 시 재셔플)
   */
  function _dequeue() {
    if (_s.retryQueue.length > 0) {
      return _s.retryQueue.shift();
    }
    if (_s.queue.length === 0) {
      _s.queue = _shuffle([..._s.pool]);
    }
    return { item: _s.queue.shift(), isRetry: false };
  }

  function _makeQ(item, isRetry) {
    const q = _s.type === 'kana' ? _makeKanaQ(item) : _makeWordQ(item);
    q.isRetry = Boolean(isRetry);
    return q;
  }

  function _pickDistinctWrongs(candidates, answerValue, getValue, count) {
    const picked = [];
    const seen = new Set([answerValue]);
    for (const cand of _shuffle([...candidates])) {
      const val = getValue(cand);
      if (!val || seen.has(val)) continue;
      seen.add(val);
      picked.push(val);
      if (picked.length >= count) break;
    }
    return picked;
  }

  function _makeKanaQ(item) {
    const toRoma = _s.mode === 'kana-to-roma';
    const answer   = toRoma ? item.roma : item.kana;
    const question = toRoma ? item.kana : item.roma;
    const candidateSource = _s.pool.length >= 4 ? _s.pool : [..._s.pool, ..._s.fallbackPool];
    const filtered = candidateSource.filter(k => k.roma !== item.roma);
    const wrongs = _pickDistinctWrongs(
      filtered,
      answer,
      k => (toRoma ? k.roma : k.kana),
      3
    );

    return {
      question,
      answer,
      speakText: item.kana,
      options:   _shuffle([answer, ...wrongs]),
      _item:     item,
    };
  }

  function _makeWordQ(item) {
    const answer = item.word;
    const candidateSource = _s.pool.length >= 4 ? _s.pool : [..._s.pool, ..._s.fallbackPool];
    const filtered = candidateSource.filter(w => w.word !== item.word);
    const wrongs = _pickDistinctWrongs(filtered, answer, w => w.word, 3);

    return {
      question:  item.meaning,
      answer,
      speakText: item.word,
      options:   _shuffle([answer, ...wrongs]),
      hint:      item.roma,
      _item:     item,
    };
  }

  function _key(item) {
    return item.kana || item.word || '';
  }

  function _statKey(item) {
    return item.row || item.categoryKey || item.key || '';
  }

  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { start, select, next };
})();
