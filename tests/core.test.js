'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('Router는 화면 전환 시 등록된 cleanup 콜백을 모두 실행하고 초기화한다', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'router.js'), 'utf8');
  const listeners = {};
  const ctx = {
    location: { hash: '#home' },
    window: { addEventListener: (ev, fn) => { listeners[ev] = fn; } },
  };
  vm.runInNewContext(code + '\nthis.__Router = Router;', ctx);
  const Router = ctx.__Router;

  let cleaned = 0;
  Router.register('#home', () => { Router.onCleanup(() => { cleaned++; }); });
  Router.register('#kana', () => {});
  Router.init();
  assert.equal(cleaned, 0);

  ctx.location.hash = '#kana';
  listeners.hashchange();
  assert.equal(cleaned, 1);

  ctx.location.hash = '#home';
  listeners.hashchange();
  assert.equal(cleaned, 1);
});

test('AnimeSVG는 유효한 viewBox, xmlns, 고유 ID를 가진 Parametric SVG를 생성한다', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'svg.js'), 'utf8');
  const ctx = {};
  vm.runInNewContext(code + '\nthis.__AnimeSVG = AnimeSVG;', ctx);
  const AnimeSVG = ctx.__AnimeSVG;

  const m1 = AnimeSVG.mascot('happy', 120);
  const m2 = AnimeSVG.mascot('encourage', 120);
  assert.match(m1, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(m1, /viewBox="0 0 160 160"/);
  assert.match(m1, /role="img"/);
  assert.notEqual(m1, m2);

  const b1 = AnimeSVG.stampBadge({ id: 'first_quiz', title: '첫 도장', kanji: '初', color: '#2563EB' }, true);
  assert.match(b1, /viewBox="-50 -50 100 100"/);
  assert.match(b1, /role="img"/);

  const burst = AnimeSVG.speedLines();
  assert.match(burst, /viewBox="-200 -200 400 400"/);
  assert.match(burst, /aria-hidden="true"/);

  const sakura1 = AnimeSVG.sakuraStageShadow(0);
  const sakura2 = AnimeSVG.sakuraStageShadow(1);
  assert.match(sakura1, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(sakura1, /viewBox="0 0 800 320"/);
  assert.match(sakura1, /aria-hidden="true"/);
  assert.match(sakura1, /id="sakura-main-shadow"/);
  assert.notEqual(sakura1, sakura2);

  const motif0 = AnimeSVG.quizStageBackdrop(0);
  const motif1 = AnimeSVG.quizStageBackdrop(1);
  assert.match(motif0, /viewBox="0 0 800 320"/);
  assert.match(motif0, /id="stage-shurikens"/);
  assert.match(motif0, /id="stage-sakura-petals"/);
  assert.match(motif0, /id="stage-sakura-blossoms"/);
  assert.notEqual(motif0, motif1);
});

test('SpeechHelper는 speechSynthesis 미지원 환경에서도 예외 없이 동작한다', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'speech.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code + '\nthis.__SpeechHelper = SpeechHelper;', ctx);
  assert.equal(ctx.__SpeechHelper.isSupported(), false);
  assert.equal(ctx.__SpeechHelper.speak('あ'), false);
});

test('SpeechHelper.kanaToHangul은 히라가나·카타카나·촉음·발음·장음을 한국어 발음으로 변환한다', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'speech.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code + '\nthis.__SpeechHelper = SpeechHelper;', ctx);
  const { kanaToHangul } = ctx.__SpeechHelper;

  assert.equal(kanaToHangul('あ'), '아');
  assert.equal(kanaToHangul('こんにちは'), '콘니치와');
  assert.equal(kanaToHangul('りんご'), '링고');
  assert.equal(kanaToHangul('がっこう'), '각코우');
  assert.equal(kanaToHangul('ケーキ'), '케에키');
  assert.equal(kanaToHangul('アイスクリーム'), '아이스쿠리이무');
  assert.equal(ctx.__SpeechHelper.formatReading('さ', 'sa'), '사(sa)');
  assert.equal(ctx.__SpeechHelper.formatReading('おはよう', 'ohayou'), '오하요우(ohayou)');
});

test('SpeechHelper는 ja-JP 음성이 없을 때 ko-KR 음성 + 한글 발음으로 자동 폴백한다', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'speech.js'), 'utf8');
  const spoken = [];
  function FakeUtterance(text) { this.text = text; }
  const ctx = {
    setTimeout,
    clearTimeout,
    window: {
      SpeechSynthesisUtterance: FakeUtterance,
      speechSynthesis: {
        speaking: false,
        pending: false,
        getVoices: () => [{ name: 'Microsoft Heami Desktop', lang: 'ko-KR' }],
        speak: (u) => spoken.push({ text: u.text, lang: u.lang }),
        cancel: () => {},
        resume: () => {},
      },
    },
  };
  vm.runInNewContext(code + '\nthis.__SpeechHelper = SpeechHelper;', ctx);
  const ok = ctx.__SpeechHelper.speak('おはよう');
  assert.equal(ok, true);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].lang, 'ko-KR');
  assert.equal(spoken[0].text, '오하요우');
});
