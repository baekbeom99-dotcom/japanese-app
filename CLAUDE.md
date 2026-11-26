# 초등학생용 일본어 학습 웹앱 (일본어 도장 | 日本語道場)

## 프로젝트 개요
초등학생이 히라가나·카타카나와 기초 생활 단어를 **열혈 소년만화 · 아케이드 도장** 테마로 즐겁게 익히는 순수 HTML/CSS/JS SPA.
외부 프레임워크/런타임 의존성 없이 브라우저에서 즉시 실행된다.

## 기술 스택
- **언어**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **저장소**: `localStorage` (`jp_app_state`)
- **음성**: Web Speech API (`ja-JP`, 미지원 환경 graceful fallback)
- **외부 의존성 없음** (Google Fonts CDN만 허용: `Do Hyeon`, `Noto Sans KR`, `M PLUS Rounded 1c`, `Noto Sans JP`)

---

## 디렉토리 구조

```
japanese-app/
├── index.html
├── CLAUDE.md
├── css/
│   ├── reset.css       # CSS 리셋 + 만화 지면 하프톤 배경
│   ├── variables.css   # 소년만화·아케이드 컬러/잉크/그림자 토큰
│   ├── layout.css      # 네비, 히어로, 카드, 퀴즈, 도장북 레이아웃
│   └── components.css  # 아케이드 버튼, 말풍선, 콤보 배지, 게이지
├── js/
│   ├── data.js         # 가나 22행x2, 초등 7개 카테고리 100단어, 도장/레벨 메타
│   ├── svg.js          # Parametric SVG (시바 닌자 마스코트, 도장, 집중선, 별)
│   ├── speech.js       # Web Speech API 일본어 발음 도우미
│   ├── storage.js      # localStorage 읽기/쓰기, 별/콤보/스탬프/레벨 계산
│   ├── router.js       # hash 라우터 + 화면 이탈 cleanup 훅
│   ├── quiz.js         # 동적 큐 기반 4지선다 퀴즈 엔진 (오답 재출제, 콤보)
│   ├── avatar.js       # 아바타 상점(#avatar), 표창 배틀 아레나, 카드 닌자 액션
│   ├── kana.js         # 가나 선택(청음/탁음·반탁음/요음) · 카드 · 퀴즈
│   ├── words.js        # 초등 단어 7카테고리 · 카드 · 퀴즈 · 북마크 복습
│   ├── progress.js     # 도장북 · 행/카테고리 정답률 · 북마크 단어장
│   └── app.js          # 라우트 등록, 홈 화면, 네비게이션 동기화
└── tests/
    ├── data.test.js
    ├── storage.test.js
    ├── core.test.js
    └── quiz.test.js
```

---

## 화면 구성 (라우팅)

| 해시 경로 | 화면 이름 | 설명 |
|-----------|-----------|------|
| `#home` | 홈 | 시바 닌자 킨타, 레벨/별 현황, 메뉴 카드 |
| `#kana` | 가나 수련장 | 히라가나/카타카나 섹션별 행 선택, 방향 선택, 카드/퀴즈 |
| `#kana-quiz` | 가나 퀴즈 배틀 | 4지선다 객관식, 콤보, 오답 재출제 |
| `#words` | 단어 모험장 | 초등 7개 카테고리 선택, 카드/퀴즈/북마크 복습 |
| `#words-quiz` | 단어 퀴즈 배틀 | 발음 힌트 토글, 정답 듣기, 콤보 |
| `#avatar` | 아바타 상점 | 별로 옷·헤어밴드·표창·무기 구매 및 착용, 포즈 미리보기 |
| `#progress` | 내 도장북 | 레벨/별/스탬프 컬렉션, 정답률 게이지, 북마크 단어장, 초기화 |

---

## 코딩 규칙 & 검증
- 모든 JS는 `'use strict';` + IIFE 모듈 패턴으로 전역 오염 방지.
- `Router.onCleanup` + `AbortController`로 화면 전환 시 리스너와 타이머 해제.
- `data.js`는 순수 데이터만 보관 (단어 `word` 필드 한자 배제 원칙 유지).
- 테스트 실행: `node --test tests/*.test.js`
