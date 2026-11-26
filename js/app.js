'use strict';
// ============================================================
// app.js — 앱 초기화, 라우트 등록, 홈 화면 & 네비게이션 동기화
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── 라우트 등록 ──────────────────────────────────────────
  Router.register('#home',       renderHome);
  Router.register('#kana',       () => KanaModule.renderSelectScreen());
  Router.register('#kana-quiz',  KanaModule.renderQuiz);
  Router.register('#words',      WordsModule.renderSelectScreen);
  Router.register('#words-quiz', WordsModule.renderQuiz);
  Router.register('#progress',   ProgressModule.render);

  // ── 네비게이션 & 별 배지 상태 동기화 ──────────────────────
  window.addEventListener('hashchange', updateNav);
  document.addEventListener('jp:state-changed', updateNavStars);
  updateNav();
  updateNavStars();

  // ── 라우터 시작 ──────────────────────────────────────────
  Router.init();

  function renderHome() {
    const { kanaRate, wordsRate, bookmarkCount, stars, stampCount, levelInfo } = Storage.getSummary();
    document.getElementById('app-root').innerHTML = `
      <section class="home-screen">
        <div class="hero-panel">
          <div class="hero-panel__burst">${AnimeSVG.speedLines()}</div>
          <div class="hero-panel__mascot">
            ${AnimeSVG.mascot('happy', 138)}
          </div>
          <div class="hero-panel__body">
            <span class="hero-badge">LV.${levelInfo.level} ${levelInfo.badge} ${levelInfo.title}</span>
            <h1 class="home-title">
              <span class="jp-accent">日本語</span> 도장 대모험!
            </h1>
            <div class="speech-bubble">
              안녕! 난 시바 닌자 킨타야. 오늘도 가나와 단어로 별을 모아 보자!
            </div>
            <div class="home-level-bar">
              <div class="home-level-bar__top">
                <span>★ 모은 별: ${stars}개</span>
                <span>${levelInfo.nextLevel ? `다음 레벨까지 ${levelInfo.starsToNext}★` : '최고 레벨 달성!'}</span>
              </div>
              <div class="arcade-meter">
                <div class="bar-fill bar-fill--gold" style="width:${levelInfo.progressPct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="home-cards">
          <a href="#kana" class="home-card home-card--kana">
            <div class="home-card__top">
              <div class="home-card__icon">あ</div>
              <span class="home-card__pill">정답률 ${kanaRate}%</span>
            </div>
            <div class="home-card__label">가나 수련장</div>
            <div class="home-card__desc">히라가나·카타카나 카드와 퀴즈 배틀!</div>
          </a>

          <a href="#words" class="home-card home-card--words">
            <div class="home-card__top">
              <div class="home-card__icon">語</div>
              <span class="home-card__pill">정답률 ${wordsRate}%</span>
            </div>
            <div class="home-card__label">단어 모험장</div>
            <div class="home-card__desc">동물·학교·간식 등 초등 100단어 정복!</div>
          </a>

          <a href="#progress" class="home-card home-card--progress">
            <div class="home-card__top">
              <div class="home-card__icon">🏅</div>
              <span class="home-card__pill">도장 ${stampCount}개</span>
            </div>
            <div class="home-card__label">내 도장북</div>
            <div class="home-card__desc">별·도장 컬렉션과 북마크 ${bookmarkCount}개 복습!</div>
          </a>
        </div>
      </section>
    `;
  }

  function updateNav() {
    const rawHash = location.hash || '#home';
    const activeTab = rawHash === '#kana-quiz'
      ? '#kana'
      : rawHash === '#words-quiz'
        ? '#words'
        : rawHash;

    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === activeTab);
    });
    updateNavStars();
  }

  function updateNavStars() {
    const countEl = document.querySelector('#nav-stars .nav-stars__count');
    if (countEl) {
      countEl.textContent = String(Storage.load().stars);
    }
  }
});
