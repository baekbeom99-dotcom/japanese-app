'use strict';
// ============================================================
// router.js — hash 기반 SPA 라우터 + 화면 정리(cleanup) 훅
// ============================================================

const Router = (() => {
  const _routes = {};
  let _cleanups = [];

  /** 라우트 등록 */
  function register(hash, handler) {
    _routes[hash] = handler;
  }

  /** 현재 화면을 벗어날 때 실행할 정리 콜백 등록 */
  function onCleanup(fn) {
    if (typeof fn === 'function') {
      _cleanups.push(fn);
    }
  }

  /** 등록된 모든 정리 콜백 실행 후 초기화 */
  function _runCleanups() {
    while (_cleanups.length > 0) {
      const fn = _cleanups.pop();
      try {
        fn();
      } catch {
        // 정리 중 오류는 다음 화면 전환을 막지 않음
      }
    }
  }

  /** 현재 hash에 맞는 핸들러 실행 */
  function dispatch() {
    _runCleanups();
    const hash = location.hash || '#home';
    const handler = _routes[hash] || _routes['#home'];
    if (handler) handler(hash);
  }

  /** 특정 화면으로 이동 */
  function navigate(hash) {
    if (location.hash === hash) {
      dispatch();
    } else {
      location.hash = hash;
    }
  }

  /** 초기화 */
  function init() {
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  return { register, onCleanup, navigate, init };
})();
