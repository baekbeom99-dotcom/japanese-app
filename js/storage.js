'use strict';
// ============================================================
// storage.js — localStorage 읽기/쓰기 및 보상·레벨 헬퍼
// ============================================================

const Storage = (() => {
  const KEY = 'jp_app_state';

  const DEFAULT_AVATAR = {
    owned: ['outfit_basic', 'headband_basic', 'shuriken_classic', 'weapon_stick'],
    equipped: {
      outfit:   'outfit_basic',
      headband: 'headband_basic',
      shuriken: 'shuriken_classic',
      weapon:   'weapon_stick',
    },
  };

  /** 매 호출마다 새 기본 상태 객체를 생성하여 반환 */
  function _createDefault() {
    return {
      kana: {},         // { "あ행": { correct: 0, total: 0 } }
      words: {},        // { "basic_greeting": { correct: 0, total: 0 } }
      bookmarks: [],    // 북마크된 단어 목록
      stars: 0,         // 사용 가능한 보유 별 (지갑)
      totalStars: 0,    // 지금까지 모은 누적 별 (레벨·도장용)
      bestCombo: 0,     // 역대 최고 콤보
      totalQuizzes: 0,  // 완료한 퀴즈 세트 수
      stamps: [],       // 해금된 도장 ID 배열
      avatar: {
        owned: [...DEFAULT_AVATAR.owned],
        equipped: { ...DEFAULT_AVATAR.equipped },
      },
    };
  }

  /** 저장된 상태 로드 및 구버전 스키마 마이그레이션 */
  function load() {
    const base = _createDefault();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== 'object') return base;
      const stars = Number.isFinite(raw.stars) ? raw.stars : 0;
      const totalStars = Number.isFinite(raw.totalStars) ? Math.max(raw.totalStars, stars) : stars;
      const rawAvatar = raw.avatar && typeof raw.avatar === 'object' ? raw.avatar : {};
      const owned = Array.isArray(rawAvatar.owned)
        ? Array.from(new Set([...DEFAULT_AVATAR.owned, ...rawAvatar.owned]))
        : [...DEFAULT_AVATAR.owned];
      const equipped = {
        ...DEFAULT_AVATAR.equipped,
        ...(rawAvatar.equipped && typeof rawAvatar.equipped === 'object' ? rawAvatar.equipped : {}),
      };
      return {
        kana:         raw.kana && typeof raw.kana === 'object' ? { ...raw.kana } : {},
        words:        raw.words && typeof raw.words === 'object' ? { ...raw.words } : {},
        bookmarks:    Array.isArray(raw.bookmarks) ? [...raw.bookmarks] : [],
        stars,
        totalStars,
        bestCombo:    Number.isFinite(raw.bestCombo) ? raw.bestCombo : 0,
        totalQuizzes: Number.isFinite(raw.totalQuizzes) ? raw.totalQuizzes : 0,
        stamps:       Array.isArray(raw.stamps) ? [...raw.stamps] : [],
        avatar:       { owned, equipped },
      };
    } catch {
      return base;
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function _accumulateBucket(bucket, key, correct, total) {
    const prev = bucket[key] || { correct: 0, total: 0 };
    bucket[key] = {
      correct: prev.correct + correct,
      total:   prev.total   + total,
    };
  }

  /** 조건을 만족하는 도장 업적 해금 */
  function _evaluateStamps(state, meta = {}) {
    const unlocked = new Set(state.stamps);
    const newlyUnlocked = [];
    const unlock = (id) => {
      if (!unlocked.has(id)) {
        unlocked.add(id);
        newlyUnlocked.push(id);
      }
    };

    if (state.totalQuizzes >= 1) unlock('first_quiz');
    if (meta.total > 0 && meta.score === meta.total) unlock('perfect_set');
    if (state.bestCombo >= 5) unlock('combo_5');
    if (Object.keys(state.kana).length >= 3) unlock('kana_row_clear');

    const totalWordAnswered = Object.values(state.words).reduce((s, e) => s + e.total, 0);
    if (totalWordAnswered >= 30) unlock('words_30');
    if (state.bookmarks.length >= 3) unlock('bookmark_3');
    if (state.totalStars >= 50) unlock('all_star_50');

    state.stamps = Array.from(unlocked);
    return newlyUnlocked;
  }

  /** 가나 퀴즈 결과 단일 키 업데이트 (하위 호환) */
  function updateKana(rowName, correct, total) {
    const state = load();
    _accumulateBucket(state.kana, rowName, correct, total);
    save(state);
  }

  /** 단어 퀴즈 결과 단일 키 업데이트 (하위 호환) */
  function updateWords(category, correct, total) {
    const state = load();
    _accumulateBucket(state.words, category, correct, total);
    save(state);
  }

  /**
   * 퀴즈 세트 완료 결과 일괄 기록 (행/카테고리별 누적 + 별 + 콤보 + 도장)
   * @param {Object} payload
   * @param {'kana'|'word'} payload.type
   * @param {Object} payload.keyStats - { [key]: { correct, total } }
   * @param {number} payload.score
   * @param {number} payload.total
   * @param {number} payload.maxStreak
   */
  function recordQuizResult({ type, keyStats = {}, score = 0, total = 0, maxStreak = 0 }) {
    const state = load();
    const target = type === 'kana' ? state.kana : state.words;

    for (const [key, stat] of Object.entries(keyStats)) {
      if (!key) continue;
      _accumulateBucket(target, key, stat.correct || 0, stat.total || 0);
    }

    const earnedStars = score * 2 + (total > 0 && score === total ? 5 : 0);
    state.stars += earnedStars;
    state.totalStars += earnedStars;
    state.bestCombo = Math.max(state.bestCombo, maxStreak);
    state.totalQuizzes += 1;

    const newStamps = _evaluateStamps(state, { score, total, maxStreak });
    save(state);

    return { state, earnedStars, newStamps };
  }

  /** 북마크 토글 */
  function toggleBookmark(word) {
    const state = load();
    const idx = state.bookmarks.indexOf(word);
    if (idx === -1) state.bookmarks.push(word);
    else state.bookmarks.splice(idx, 1);
    _evaluateStamps(state);
    save(state);
    return idx === -1;
  }

  /** 현재 별 개수 기준 레벨 및 다음 레벨 진행 정보 계산 */
  function getLevelInfo(starsInput) {
    const stars = typeof starsInput === 'number' ? starsInput : load().totalStars;
    const titles = typeof LEVEL_TITLES !== 'undefined' ? LEVEL_TITLES : [
      { level: 1, minStars: 0, title: '도전자', badge: '⚡' },
    ];
    let current = titles[0];
    let next = null;

    for (let i = 0; i < titles.length; i++) {
      if (stars >= titles[i].minStars) {
        current = titles[i];
        next = titles[i + 1] || null;
      }
    }

    const progressPct = next
      ? Math.min(100, Math.round(((stars - current.minStars) / (next.minStars - current.minStars)) * 100))
      : 100;

    return {
      ...current,
      stars,
      nextLevel: next,
      starsToNext: next ? Math.max(0, next.minStars - stars) : 0,
      progressPct,
    };
  }

  /** 전체 진행률 요약 (홈/네비게이션용) */
  function getSummary() {
    const state = load();
    const calcRate = (obj) => {
      const entries = Object.values(obj);
      if (!entries.length) return 0;
      const total   = entries.reduce((s, e) => s + e.total,   0);
      const correct = entries.reduce((s, e) => s + e.correct, 0);
      return total ? Math.round((correct / total) * 100) : 0;
    };
    return {
      kanaRate:      calcRate(state.kana),
      wordsRate:     calcRate(state.words),
      bookmarkCount: state.bookmarks.length,
      stars:         state.stars,
      totalStars:    state.totalStars,
      bestCombo:     state.bestCombo,
      stampCount:    state.stamps.length,
      levelInfo:     getLevelInfo(state.totalStars),
    };
  }

  /** 아바타 아이템 구매 (별 소비 + 자동 착용) */
  function buyAvatarItem(itemId) {
    const items = typeof AVATAR_ITEMS !== 'undefined' ? AVATAR_ITEMS : [];
    const item = items.find(i => i.id === itemId);
    if (!item) return { ok: false, reason: 'not_found' };

    const state = load();
    if (state.avatar.owned.includes(itemId)) {
      state.avatar.equipped[item.category] = itemId;
      save(state);
      return { ok: true, alreadyOwned: true, state, item };
    }
    if (state.stars < item.price) {
      return { ok: false, reason: 'insufficient_stars', needed: item.price - state.stars, state };
    }

    state.stars -= item.price;
    state.avatar.owned.push(itemId);
    state.avatar.equipped[item.category] = itemId;
    save(state);
    return { ok: true, state, item };
  }

  /** 보유 중인 아바타 아이템 착용 */
  function equipAvatarItem(itemId) {
    const items = typeof AVATAR_ITEMS !== 'undefined' ? AVATAR_ITEMS : [];
    const item = items.find(i => i.id === itemId);
    if (!item) return { ok: false, reason: 'not_found' };

    const state = load();
    if (!state.avatar.owned.includes(itemId)) {
      return { ok: false, reason: 'not_owned', state };
    }
    state.avatar.equipped[item.category] = itemId;
    save(state);
    return { ok: true, state, item };
  }

  /** 현재 착용 중인 아바타 장비 객체 반환 */
  function getEquippedAvatar() {
    return load().avatar.equipped;
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  return {
    load,
    updateKana,
    updateWords,
    recordQuizResult,
    toggleBookmark,
    getLevelInfo,
    getSummary,
    buyAvatarItem,
    equipAvatarItem,
    getEquippedAvatar,
    reset,
  };
})();
