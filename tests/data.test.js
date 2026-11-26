'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadData() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
  const ctx = {};
  vm.runInNewContext(
    code + '\nthis.__exports = { HIRAGANA, KATAKANA, WORDS, WORD_CATEGORIES, STAMP_DEFINITIONS, LEVEL_TITLES };',
    ctx
  );
  return ctx.__exports;
}

test('HIRAGANA와 KATAKANA는 각각 22개 행과 청음·탁음·반탁음·요음을 포함한다', () => {
  const { HIRAGANA, KATAKANA } = loadData();
  assert.equal(Object.keys(HIRAGANA).length, 22);
  assert.equal(Object.keys(KATAKANA).length, 22);

  for (const [row, items] of Object.entries(KATAKANA)) {
    assert.ok(items.length >= 3, `${row} 행 항목 수 확인`);
    for (const item of items) {
      assert.ok(item.kana && item.roma, `${row} 항목 필드 누락`);
    }
  }
});

test('WORDS는 초등학생 7개 카테고리 총 100단어이며 한자를 포함하지 않는다', () => {
  const { WORDS, WORD_CATEGORIES } = loadData();
  assert.equal(WORD_CATEGORIES.length, 7);

  let total = 0;
  const kanjiRegex = /[\u4e00-\u9faf]/;
  for (const cat of WORD_CATEGORIES) {
    const list = WORDS[cat.key];
    assert.ok(Array.isArray(list) && list.length > 0, `${cat.key} 배열 확인`);
    total += list.length;
    const seen = new Set();
    for (const entry of list) {
      assert.ok(entry.word && entry.roma && entry.meaning, `${cat.key} 필수 필드 누락`);
      assert.equal(kanjiRegex.test(entry.word), false, `한자 금지 위반: ${entry.word}`);
      assert.equal(seen.has(entry.word), false, `카테고리 내 중복 단어: ${entry.word}`);
      seen.add(entry.word);
    }
  }
  assert.equal(total, 100);
});

test('STAMP_DEFINITIONS와 LEVEL_TITLES가 정의되어 있다', () => {
  const { STAMP_DEFINITIONS, LEVEL_TITLES } = loadData();
  assert.ok(STAMP_DEFINITIONS.length >= 6);
  assert.ok(LEVEL_TITLES.length >= 5);
});
