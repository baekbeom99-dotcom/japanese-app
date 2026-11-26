'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadQuiz() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'quiz.js'), 'utf8');
  const ctx = {};
  vm.runInNewContext(code + '\nthis.__QuizEngine = QuizEngine;', ctx);
  return ctx.__QuizEngine;
}

test('오답은 현재 세트 내 남은 문제에서 실제로 재출제된다', () => {
  const QuizEngine = loadQuiz();
  const pool = [
    { kana: 'あ', roma: 'a', row: 'あ행' },
    { kana: 'い', roma: 'i', row: 'あ행' },
    { kana: 'う', roma: 'u', row: 'あ행' },
    { kana: 'え', roma: 'e', row: 'あ행' },
    { kana: 'お', roma: 'o', row: 'あ행' },
  ];
  const rendered = [];
  let finished = null;

  QuizEngine.start({
    pool,
    type: 'kana',
    mode: 'kana-to-roma',
    setSize: 4,
    onRender: (q) => rendered.push(q),
    onResult: (summary) => { finished = summary; },
  });

  const firstQ = rendered[0];
  const wrongOpt = firstQ.options.find(o => o !== firstQ.answer);
  const res1 = QuizEngine.select(wrongOpt);
  assert.equal(res1.correct, false);
  assert.equal(res1.streak, 0);

  QuizEngine.next();
  assert.equal(rendered[1].question, firstQ.question);
  assert.equal(rendered[1].isRetry, true);

  for (let i = 1; i < 4; i++) {
    const q = rendered[i];
    const r = QuizEngine.select(q.answer);
    assert.equal(r.correct, true);
    QuizEngine.next();
  }
  assert.equal(finished.score, 3);
  assert.equal(finished.total, 4);
  assert.equal(finished.maxStreak, 3);
  assert.equal(finished.rowStats['あ행'].total, 4);
  assert.equal(finished.rowStats['あ행'].correct, 3);
});

test('3글자 행만 선택해도 fallbackPool에서 오답을 보충해 4지선다를 보장한다', () => {
  const QuizEngine = loadQuiz();
  const pool = [
    { kana: 'や', roma: 'ya', row: 'や행' },
    { kana: 'ゆ', roma: 'yu', row: 'や행' },
    { kana: 'よ', roma: 'yo', row: 'や행' },
  ];
  const fallbackPool = [
    ...pool,
    { kana: 'あ', roma: 'a', row: 'あ행' },
    { kana: 'い', roma: 'i', row: 'あ행' },
  ];
  let current = null;
  QuizEngine.start({
    pool,
    fallbackPool,
    type: 'kana',
    mode: 'kana-to-roma',
    setSize: 3,
    onRender: (q) => { current = q; },
    onResult: () => {},
  });
  assert.equal(current.options.length, 4);
  assert.equal(new Set(current.options).size, 4);
});

test('단어 퀴즈도 콤보와 힌트(roma), 발음(speakText) 정보를 제공한다', () => {
  const QuizEngine = loadQuiz();
  const pool = [
    { word: 'いぬ', roma: 'inu', meaning: '강아지', key: 'basic_animals' },
    { word: 'ねこ', roma: 'neko', meaning: '고양이', key: 'basic_animals' },
    { word: 'うさぎ', roma: 'usagi', meaning: '토끼', key: 'basic_animals' },
    { word: 'パンダ', roma: 'panda', meaning: '판다', key: 'basic_animals' },
  ];
  let current = null;
  QuizEngine.start({
    pool,
    type: 'word',
    setSize: 2,
    onRender: (q) => { current = q; },
    onResult: () => {},
  });
  assert.equal(current.options.length, 4);
  assert.ok(current.hint);
  assert.equal(current.speakText, current.answer);
});
