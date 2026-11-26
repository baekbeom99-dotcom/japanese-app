'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadEnv(initial = {}) {
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
    dataCode + '\n' + storageCode + '\nthis.__exports = { AVATAR_ITEMS, Storage };',
    ctx
  );
  return ctx.__exports;
}

test('AVATAR_ITEMS는 옷·헤어밴드·표창·무기 4개 카테고리와 기본 무료 아이템을 포함한다', () => {
  const { AVATAR_ITEMS } = loadEnv();
  assert.ok(Array.isArray(AVATAR_ITEMS));
  const categories = new Set(AVATAR_ITEMS.map(i => i.category));
  assert.equal(categories.has('outfit'), true);
  assert.equal(categories.has('headband'), true);
  assert.equal(categories.has('shuriken'), true);
  assert.equal(categories.has('weapon'), true);

  for (const cat of ['outfit', 'headband', 'shuriken', 'weapon']) {
    const freeItem = AVATAR_ITEMS.find(i => i.category === cat && i.price === 0);
    assert.ok(freeItem, `${cat} 무료 기본 아이템 필요`);
  }
});

test('별로 아바타 아이템을 구매·착용할 수 있고 별이 부족하면 구매가 거절된다', () => {
  const { AVATAR_ITEMS, Storage } = loadEnv();
  const paidItem = AVATAR_ITEMS.find(i => i.price > 0);
  assert.ok(paidItem);

  // 별 0개 상태 -> 구매 실패
  const failRes = Storage.buyAvatarItem(paidItem.id);
  assert.equal(failRes.ok, false);
  assert.equal(failRes.reason, 'insufficient_stars');

  // 퀴즈 완료로 별 적립 후 구매 성공
  Storage.recordQuizResult({
    type: 'kana',
    keyStats: { 'あ행': { correct: 10, total: 10 } },
    score: 10,
    total: 10,
    maxStreak: 10,
  });
  const before = Storage.load();
  const buyRes = Storage.buyAvatarItem(paidItem.id);
  assert.equal(buyRes.ok, true);

  const after = Storage.load();
  assert.equal(after.stars, before.stars - paidItem.price);
  assert.equal(after.totalStars, before.totalStars); // 누적 별(레벨용)은 유지
  assert.equal(after.avatar.owned.includes(paidItem.id), true);
  assert.equal(after.avatar.equipped[paidItem.category], paidItem.id);
});

test('이미 보유한 아이템은 무료로 재착용할 수 있다', () => {
  const { Storage } = loadEnv();
  Storage.recordQuizResult({
    type: 'kana',
    keyStats: { 'あ행': { correct: 10, total: 10 } },
    score: 10,
    total: 10,
    maxStreak: 10,
  });
  Storage.buyAvatarItem('headband_thunder');
  const eqDefault = Storage.equipAvatarItem('headband_basic');
  assert.equal(eqDefault.ok, true);
  assert.equal(Storage.load().avatar.equipped.headband, 'headband_basic');

  const eqPaid = Storage.equipAvatarItem('headband_thunder');
  assert.equal(eqPaid.ok, true);
  assert.equal(Storage.load().avatar.equipped.headband, 'headband_thunder');
});
