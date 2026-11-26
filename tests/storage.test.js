'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadStorage(initial = {}) {
  const store = { ...initial };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const dataCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
  const storageCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'storage.js'), 'utf8');
  const ctx = { localStorage };
  vm.runInNewContext(
    dataCode + '\n' + storageCode + '\nthis.__exports = { Storage, LEVEL_TITLES, STAMP_DEFINITIONS };',
    ctx
  );
  return { ...ctx.__exports, store };
}

test('reset() 이후 load() 호출 시 이전 변경이 기본 상태에 남지 않는다', () => {
  const { Storage } = loadStorage();
  Storage.updateKana('あ행', 5, 5);
  Storage.reset();
  const state = Storage.load();
  assert.equal(Object.keys(state.kana).length, 0);
  assert.equal(state.stars, 0);
  assert.equal(state.stamps.length, 0);
});

test('구버전 저장 데이터도 신규 필드 기본값으로 안전하게 마이그레이션된다', () => {
  const legacy = JSON.stringify({ kana: { 'あ행': { correct: 3, total: 5 } }, words: {}, bookmarks: ['りんご'] });
  const { Storage } = loadStorage({ jp_app_state: legacy });
  const state = Storage.load();
  assert.equal(state.stars, 0);
  assert.equal(state.bestCombo, 0);
  assert.equal(state.stamps.length, 0);
  assert.equal(state.bookmarks.length, 1);
  assert.equal(state.bookmarks[0], 'りんご');
});

test('recordQuizResult는 행별 통계 누적, 별 보상, 최고 콤보, 스탬프 해금을 처리한다', () => {
  const { Storage } = loadStorage();
  const res = Storage.recordQuizResult({
    type: 'kana',
    keyStats: { 'あ행': { correct: 5, total: 5 }, 'か행': { correct: 5, total: 5 } },
    score: 10,
    total: 10,
    maxStreak: 10,
  });
  const state = Storage.load();
  assert.equal(state.kana['あ행'].correct, 5);
  assert.equal(state.kana['か행'].total, 5);
  assert.ok(state.stars > 0);
  assert.equal(state.bestCombo, 10);
  assert.ok(res.newStamps.includes('first_quiz'));
  assert.ok(res.newStamps.includes('perfect_set'));
  assert.ok(res.newStamps.includes('combo_5'));
});

test('toggleBookmark는 3개 이상 북마크 시 bookmark_3 스탬프를 해금한다', () => {
  const { Storage } = loadStorage();
  Storage.toggleBookmark('りんご');
  Storage.toggleBookmark('いぬ');
  Storage.toggleBookmark('ねこ');
  const state = Storage.load();
  assert.ok(state.stamps.includes('bookmark_3'));
});
