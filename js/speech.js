'use strict';
// ============================================================
// speech.js — 일본어 발음 도우미 (ja-JP 우선 + ko-KR 음역 + Web Audio 폴백)
// ============================================================

const SpeechHelper = (() => {
  let _voices = [];
  let _speakTimer = null;
  let _watchdogTimer = null;
  let _playToken = 0;
  let _lastStatus = { mode: 'ready', text: '', hangul: '', error: '' };
  let _audioCtx = null;

  const SPECIAL_READINGS = {
    'こんにちは': '콘니치와',
    'こんばんは': '콤방와',
  };

  const YOON_MAP = {
    'きゃ':'캬', 'きゅ':'큐', 'きょ':'쿄',
    'ぎゃ':'갸', 'ぎゅ':'규', 'ぎょ':'교',
    'しゃ':'샤', 'しゅ':'슈', 'しょ':'쇼',
    'じゃ':'자', 'じゅ':'주', 'じょ':'조',
    'ちゃ':'차', 'ちゅ':'추', 'ちょ':'초',
    'にゃ':'냐', 'にゅ':'뉴', 'にょ':'뇨',
    'ひゃ':'햐', 'ひゅ':'휴', 'ひょ':'효',
    'びゃ':'뱌', 'びゅ':'뷰', 'びょ':'뵤',
    'ぴゃ':'퍄', 'ぴゅ':'퓨', 'ぴょ':'표',
    'みゃ':'먀', 'みゅ':'뮤', 'みょ':'묘',
    'りゃ':'랴', 'りゅ':'류', 'りょ':'료',
    'ちぇ':'체', 'てぃ':'티', 'でぃ':'디',
    'ふぁ':'파', 'ふぃ':'피', 'ふぇ':'페', 'ふぉ':'포',
    'うぃ':'위', 'うぇ':'웨', 'うぉ':'워',
    'しぇ':'셰', 'じぇ':'제',
  };

  const SINGLE_MAP = {
    'あ':'아', 'い':'이', 'う':'우', 'え':'에', 'お':'오',
    'か':'카', 'き':'키', 'く':'쿠', 'け':'케', 'こ':'코',
    'さ':'사', 'し':'시', 'す':'스', 'せ':'세', 'そ':'소',
    'た':'타', 'ち':'치', 'つ':'쓰', 'て':'테', 'と':'토',
    'な':'나', 'に':'니', 'ぬ':'누', 'ね':'네', 'の':'노',
    'は':'하', 'ひ':'히', 'ふ':'후', 'へ':'헤', 'ほ':'호',
    'ま':'마', 'み':'미', 'む':'무', 'め':'메', 'も':'모',
    'や':'야', 'ゆ':'유', 'よ':'요',
    'ら':'라', 'り':'리', 'る':'루', 'れ':'레', 'ろ':'로',
    'わ':'와', 'を':'오', 'ん':'응',
    'が':'가', 'ぎ':'기', 'ぐ':'구', 'げ':'게', 'ご':'고',
    'ざ':'자', 'じ':'지', 'ず':'즈', 'ぜ':'제', 'ぞ':'조',
    'だ':'다', 'ぢ':'지', 'づ':'즈', 'で':'데', 'ど':'도',
    'ば':'바', 'び':'비', 'ぶ':'부', 'べ':'베', 'ぼ':'보',
    'ぱ':'파', 'ぴ':'피', 'ぷ':'푸', 'ぺ':'페', 'ぽ':'포',
    'ぁ':'아', 'ぃ':'이', 'ぅ':'우', 'ぇ':'에', 'ぉ':'오',
    'ゃ':'야', 'ゅ':'유', 'ょ':'요',
  };

  const LONG_VOWEL_TAIL = ['아', '애', '야', '얘', '어', '에', '여', '예', '오', '와', '왜', '외', '요', '우', '워', '웨', '위', '유', '으', '의', '이'];

  /** 카타카나를 히라가나로 정규화 */
  function _toHiragana(str) {
    return String(str || '').replace(/[\u30A1-\u30F6]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
  }

  /** 한글 완성형 음절에 받침 추가 (이미 받침이 없을 때만) */
  function _attachBatchim(syllable, jongIndex) {
    if (!syllable) return null;
    const code = syllable.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return null;
    const offset = code - 0xAC00;
    if (offset % 28 !== 0) return null;
    return String.fromCharCode(code + jongIndex);
  }

  /** 장음(ー)용 모음 글자 추출 */
  function _vowelEcho(syllable) {
    if (!syllable) return '';
    const code = syllable.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return '';
    const jungIdx = Math.floor(((code - 0xAC00) % 588) / 28);
    return LONG_VOWEL_TAIL[jungIdx] || '';
  }

  /**
   * 일본어 가나(히라가나·카타카나)를 한국어 발음 표기로 변환
   * @param {string} text
   * @returns {string}
   */
  function kanaToHangul(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    if (SPECIAL_READINGS[raw]) return SPECIAL_READINGS[raw];

    const hira = _toHiragana(raw);
    if (!hira) return '';

    const out = [];
    let i = 0;
    while (i < hira.length) {
      const ch = hira[i];
      const pair = hira.slice(i, i + 2);

      // 작은 つ (촉음): 앞 음절 받침(ㄱ/ㅅ/ㅂ)으로 처리
      if (ch === 'っ') {
        const nextCh = hira[i + 1] || '';
        const jong = 'ぱぴぷぺぽばびぶべぼ'.includes(nextCh) ? 17 // ㅂ
          : 'さしすせそたちつてと'.includes(nextCh) ? 19 // ㅅ
          : 1; // ㄱ
        const prev = out[out.length - 1];
        const merged = _attachBatchim(prev, jong);
        if (merged) out[out.length - 1] = merged;
        i += 1;
        continue;
      }

      // 발음(ん): 앞 음절 받침(ㄴ/ㅁ/ㅇ)으로 합쳐 자연스럽게 발음
      if (ch === 'ん') {
        const nextCh = hira[i + 1] || '';
        const jong = 'ぱぴぷぺぽばびぶべぼまみむめも'.includes(nextCh) ? 16 // ㅁ
          : 'かきくけこがぎぐげご'.includes(nextCh) || !nextCh ? 21 // ㅇ
          : 4; // ㄴ
        const prev = out[out.length - 1];
        const merged = _attachBatchim(prev, jong);
        if (merged) out[out.length - 1] = merged;
        else out.push('응');
        i += 1;
        continue;
      }

      // 장음(ー): 앞 모음 연장
      if (ch === 'ー') {
        const echo = _vowelEcho(out[out.length - 1]);
        if (echo) out.push(echo);
        i += 1;
        continue;
      }

      if (YOON_MAP[pair]) {
        out.push(YOON_MAP[pair]);
        i += 2;
        continue;
      }

      if (SINGLE_MAP[ch]) {
        out.push(SINGLE_MAP[ch]);
        i += 1;
        continue;
      }

      out.push(ch);
      i += 1;
    }
    return out.join('');
  }

  /** 브라우저가 Web Speech API를 지원하는지 여부 */
  function isSupported() {
    return typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && typeof window.SpeechSynthesisUtterance === 'function';
  }

  function _refreshVoices() {
    if (!isSupported()) return [];
    const synth = window.speechSynthesis;
    if (typeof synth.getVoices === 'function') {
      _voices = synth.getVoices() || [];
    }
    return _voices;
  }

  if (typeof window !== 'undefined' && isSupported() && typeof window.speechSynthesis.addEventListener === 'function') {
    _refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', _refreshVoices);
  }

  function _pickVoice(langPrefix) {
    const voices = _refreshVoices();
    return voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix)) || null;
  }

  /** Web Speech API 자체가 침묵/실패할 때 Web Audio API 신호음 재생 */
  function _playToneFallback() {
    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      if (!_audioCtx) _audioCtx = new AudioCtx();
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
      const now = _audioCtx.currentTime;
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
      return true;
    } catch {
      return false;
    }
  }

  function _emitStatus(status) {
    _lastStatus = status;
    if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('jp:speech-status', { detail: status }));
    }
  }

  /**
   * 일본어 텍스트 발음 재생
   * 1) 브라우저에 ja-JP 음성이 있으면 원어민 TTS 사용
   * 2) ja-JP 음성이 없으면 ko-KR 음성 + 한글 음역 발음으로 자동 폴백
   * 3) speechSynthesis 오류/불가 시 Web Audio 톤 + 화면 안내 폴백
   *
   * @param {string} text
   * @param {number} [rate=0.85]
   * @returns {boolean}
   */
  function speak(text, rate = 0.85) {
    if (!text) return false;
    const rawText = String(text);
    const hangul = kanaToHangul(rawText);

    if (!isSupported()) {
      const toneOk = _playToneFallback();
      _emitStatus({ mode: toneOk ? 'audio-fallback' : 'unsupported', text: rawText, hangul, error: 'speechSynthesis unsupported' });
      return toneOk;
    }

    const synth = window.speechSynthesis;
    const jaVoice = _pickVoice('ja');
    const koVoice = _pickVoice('ko');
    const token = ++_playToken;

    const runUtterance = (utterText, lang, voice, modeLabel, onFail) => {
      try {
        clearTimeout(_speakTimer);
        clearTimeout(_watchdogTimer);
        const needCancel = Boolean(synth.speaking || synth.pending);
        if (needCancel && typeof synth.cancel === 'function') {
          synth.cancel();
        }
        const fire = () => {
          if (token !== _playToken) return;
          try {
            if (typeof synth.resume === 'function') synth.resume();
            const utter = new window.SpeechSynthesisUtterance(utterText);
            utter.lang = lang;
            utter.rate = rate;
            utter.pitch = 1.05;
            if (voice) utter.voice = voice;

            let started = false;
            _watchdogTimer = setTimeout(() => {
              if (token === _playToken && !started && onFail) onFail('timeout');
            }, 2000);

            utter.onstart = () => {
              if (token !== _playToken) return;
              started = true;
              clearTimeout(_watchdogTimer);
              _emitStatus({ mode: modeLabel, text: rawText, hangul, error: '' });
            };
            utter.onerror = (ev) => {
              if (token !== _playToken) return;
              clearTimeout(_watchdogTimer);
              if (!started && onFail) onFail(ev?.error || 'error');
            };

            synth.speak(utter);
            // 즉시 준비 상태 표시 (onstart 전에도 발음 표기 확인 가능)
            _emitStatus({ mode: modeLabel, text: rawText, hangul, error: '' });
          } catch (err) {
            if (token === _playToken && onFail) onFail(String(err));
          }
        };

        // Chromium cancel() 직후 speak() 씹힘 버그 회피
        if (needCancel) {
          _speakTimer = setTimeout(fire, 60);
        } else {
          fire();
        }
        return true;
      } catch (err) {
        if (token === _playToken && onFail) onFail(String(err));
        return false;
      }
    };

    const fallbackToTone = (reason) => {
      _playToneFallback();
      _emitStatus({ mode: 'audio-fallback', text: rawText, hangul, error: reason || 'tts-failed' });
    };

    const fallbackToKorean = (reason) => {
      if (koVoice && hangul) {
        runUtterance(hangul, koVoice.lang || 'ko-KR', koVoice, 'ko-fallback', fallbackToTone);
      } else {
        fallbackToTone(reason || 'no-voice');
      }
    };

    if (jaVoice) {
      return runUtterance(rawText, jaVoice.lang || 'ja-JP', jaVoice, 'ja', fallbackToKorean);
    }

    if (koVoice && hangul) {
      return runUtterance(hangul, koVoice.lang || 'ko-KR', koVoice, 'ko-fallback', fallbackToTone);
    }

    // 음성 목록이 아직 비어 있으면 일단 ja-JP 시도 후 실패 시 톤 폴백
    return runUtterance(rawText, 'ja-JP', null, 'ja-attempt', fallbackToTone);
  }

  /** 재생 중단 */
  function stop() {
    _playToken += 1;
    clearTimeout(_speakTimer);
    clearTimeout(_watchdogTimer);
    if (!isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // 무시
    }
  }

  /** 현재 음성 환경 진단 정보 */
  function getDiagnostics() {
    const voices = _refreshVoices();
    const jaVoice = _pickVoice('ja');
    const koVoice = _pickVoice('ko');
    return {
      supported: isSupported(),
      voiceCount: voices.length,
      hasJapaneseVoice: Boolean(jaVoice),
      hasKoreanVoice: Boolean(koVoice),
      jaVoiceName: jaVoice ? jaVoice.name : null,
      koVoiceName: koVoice ? koVoice.name : null,
      lastStatus: { ..._lastStatus },
    };
  }

  /**
   * 일본어 텍스트와 로마자를 '한글(roma)' 형식으로 결합
   * @param {string} text - 히라가나·카타카나
   * @param {string} roma - 로마자 표기
   * @returns {string}
   */
  function formatReading(text, roma) {
    const hangul = kanaToHangul(text);
    if (!roma) return hangul;
    if (!hangul) return String(roma);
    return `${hangul}(${roma})`;
  }

  return {
    isSupported,
    speak,
    stop,
    kanaToHangul,
    formatReading,
    getDiagnostics,
  };
})();
