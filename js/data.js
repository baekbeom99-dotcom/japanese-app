'use strict';
// ============================================================
// data.js — 순수 학습 데이터 및 메타데이터만 보관 (로직 없음)
// 단어 원칙: 한자 배제 → word 필드는 히라가나/카타카나 표기만
// ============================================================

// ── 히라가나 (22행) ─────────────────────────────────────────
const HIRAGANA = {
  "あ행": [
    { kana:"あ", roma:"a" }, { kana:"い", roma:"i" }, { kana:"う", roma:"u" },
    { kana:"え", roma:"e" }, { kana:"お", roma:"o" }
  ],
  "か행": [
    { kana:"か", roma:"ka" }, { kana:"き", roma:"ki" }, { kana:"く", roma:"ku" },
    { kana:"け", roma:"ke" }, { kana:"こ", roma:"ko" }
  ],
  "さ행": [
    { kana:"さ", roma:"sa" }, { kana:"し", roma:"shi" }, { kana:"す", roma:"su" },
    { kana:"せ", roma:"se" }, { kana:"そ", roma:"so" }
  ],
  "た행": [
    { kana:"た", roma:"ta" }, { kana:"ち", roma:"chi" }, { kana:"つ", roma:"tsu" },
    { kana:"て", roma:"te" }, { kana:"と", roma:"to" }
  ],
  "な행": [
    { kana:"な", roma:"na" }, { kana:"に", roma:"ni" }, { kana:"ぬ", roma:"nu" },
    { kana:"ね", roma:"ne" }, { kana:"の", roma:"no" }
  ],
  "は행": [
    { kana:"は", roma:"ha" }, { kana:"ひ", roma:"hi" }, { kana:"ふ", roma:"fu" },
    { kana:"へ", roma:"he" }, { kana:"ほ", roma:"ho" }
  ],
  "ま행": [
    { kana:"ま", roma:"ma" }, { kana:"み", roma:"mi" }, { kana:"む", roma:"mu" },
    { kana:"め", roma:"me" }, { kana:"も", roma:"mo" }
  ],
  "や행": [
    { kana:"や", roma:"ya" }, { kana:"ゆ", roma:"yu" }, { kana:"よ", roma:"yo" }
  ],
  "ら행": [
    { kana:"ら", roma:"ra" }, { kana:"り", roma:"ri" }, { kana:"る", roma:"ru" },
    { kana:"れ", roma:"re" }, { kana:"ろ", roma:"ro" }
  ],
  "わ행": [
    { kana:"わ", roma:"wa" }, { kana:"を", roma:"wo" }, { kana:"ん", roma:"n" }
  ],
  // 탁음
  "が행(탁음)": [
    { kana:"が", roma:"ga" }, { kana:"ぎ", roma:"gi" }, { kana:"ぐ", roma:"gu" },
    { kana:"げ", roma:"ge" }, { kana:"ご", roma:"go" }
  ],
  "ざ행(탁음)": [
    { kana:"ざ", roma:"za" }, { kana:"じ", roma:"ji" }, { kana:"ず", roma:"zu" },
    { kana:"ぜ", roma:"ze" }, { kana:"ぞ", roma:"zo" }
  ],
  "だ행(탁음)": [
    { kana:"だ", roma:"da" }, { kana:"ぢ", roma:"ji" }, { kana:"づ", roma:"zu" },
    { kana:"で", roma:"de" }, { kana:"ど", roma:"do" }
  ],
  "ば행(탁음)": [
    { kana:"ば", roma:"ba" }, { kana:"び", roma:"bi" }, { kana:"ぶ", roma:"bu" },
    { kana:"べ", roma:"be" }, { kana:"ぼ", roma:"bo" }
  ],
  // 반탁음
  "ぱ행(반탁음)": [
    { kana:"ぱ", roma:"pa" }, { kana:"ぴ", roma:"pi" }, { kana:"ぷ", roma:"pu" },
    { kana:"ぺ", roma:"pe" }, { kana:"ぽ", roma:"po" }
  ],
  // 요음
  "きゃ행(요음)": [
    { kana:"きゃ", roma:"kya" }, { kana:"きゅ", roma:"kyu" }, { kana:"きょ", roma:"kyo" }
  ],
  "しゃ행(요음)": [
    { kana:"しゃ", roma:"sha" }, { kana:"しゅ", roma:"shu" }, { kana:"しょ", roma:"sho" }
  ],
  "ちゃ행(요음)": [
    { kana:"ちゃ", roma:"cha" }, { kana:"ちゅ", roma:"chu" }, { kana:"ちょ", roma:"cho" }
  ],
  "にゃ행(요음)": [
    { kana:"にゃ", roma:"nya" }, { kana:"にゅ", roma:"nyu" }, { kana:"にょ", roma:"nyo" }
  ],
  "ひゃ행(요음)": [
    { kana:"ひゃ", roma:"hya" }, { kana:"ひゅ", roma:"hyu" }, { kana:"ひょ", roma:"hyo" }
  ],
  "みゃ행(요음)": [
    { kana:"みゃ", roma:"mya" }, { kana:"みゅ", roma:"myu" }, { kana:"みょ", roma:"myo" }
  ],
  "りゃ행(요음)": [
    { kana:"りゃ", roma:"rya" }, { kana:"りゅ", roma:"ryu" }, { kana:"りょ", roma:"ryo" }
  ],
};

// ── 카타카나 (22행) ─────────────────────────────────────────
const KATAKANA = {
  "ア행": [
    { kana:"ア", roma:"a" }, { kana:"イ", roma:"i" }, { kana:"ウ", roma:"u" },
    { kana:"エ", roma:"e" }, { kana:"オ", roma:"o" }
  ],
  "カ행": [
    { kana:"カ", roma:"ka" }, { kana:"キ", roma:"ki" }, { kana:"ク", roma:"ku" },
    { kana:"ケ", roma:"ke" }, { kana:"コ", roma:"ko" }
  ],
  "サ행": [
    { kana:"サ", roma:"sa" }, { kana:"シ", roma:"shi" }, { kana:"ス", roma:"su" },
    { kana:"セ", roma:"se" }, { kana:"ソ", roma:"so" }
  ],
  "タ행": [
    { kana:"タ", roma:"ta" }, { kana:"チ", roma:"chi" }, { kana:"ツ", roma:"tsu" },
    { kana:"テ", roma:"te" }, { kana:"ト", roma:"to" }
  ],
  "ナ행": [
    { kana:"ナ", roma:"na" }, { kana:"ニ", roma:"ni" }, { kana:"ヌ", roma:"nu" },
    { kana:"ネ", roma:"ne" }, { kana:"ノ", roma:"no" }
  ],
  "ハ행": [
    { kana:"ハ", roma:"ha" }, { kana:"ヒ", roma:"hi" }, { kana:"フ", roma:"fu" },
    { kana:"ヘ", roma:"he" }, { kana:"ホ", roma:"ho" }
  ],
  "マ행": [
    { kana:"マ", roma:"ma" }, { kana:"ミ", roma:"mi" }, { kana:"ム", roma:"mu" },
    { kana:"メ", roma:"me" }, { kana:"モ", roma:"mo" }
  ],
  "ヤ행": [
    { kana:"ヤ", roma:"ya" }, { kana:"ユ", roma:"yu" }, { kana:"ヨ", roma:"yo" }
  ],
  "ラ행": [
    { kana:"ラ", roma:"ra" }, { kana:"リ", roma:"ri" }, { kana:"ル", roma:"ru" },
    { kana:"レ", roma:"re" }, { kana:"ロ", roma:"ro" }
  ],
  "ワ행": [
    { kana:"ワ", roma:"wa" }, { kana:"ヲ", roma:"wo" }, { kana:"ン", roma:"n" }
  ],
  "ガ행(탁음)": [
    { kana:"ガ", roma:"ga" }, { kana:"ギ", roma:"gi" }, { kana:"グ", roma:"gu" },
    { kana:"ゲ", roma:"ge" }, { kana:"ゴ", roma:"go" }
  ],
  "ザ행(탁음)": [
    { kana:"ザ", roma:"za" }, { kana:"ジ", roma:"ji" }, { kana:"ズ", roma:"zu" },
    { kana:"ゼ", roma:"ze" }, { kana:"ゾ", roma:"zo" }
  ],
  "ダ행(탁음)": [
    { kana:"ダ", roma:"da" }, { kana:"ヂ", roma:"ji" }, { kana:"ヅ", roma:"zu" },
    { kana:"デ", roma:"de" }, { kana:"ド", roma:"do" }
  ],
  "バ행(탁음)": [
    { kana:"バ", roma:"ba" }, { kana:"ビ", roma:"bi" }, { kana:"ブ", roma:"bu" },
    { kana:"ベ", roma:"be" }, { kana:"ボ", roma:"bo" }
  ],
  "パ행(반탁음)": [
    { kana:"パ", roma:"pa" }, { kana:"ピ", roma:"pi" }, { kana:"プ", roma:"pu" },
    { kana:"ペ", roma:"pe" }, { kana:"ポ", roma:"po" }
  ],
  "キャ행(요음)": [
    { kana:"キャ", roma:"kya" }, { kana:"キュ", roma:"kyu" }, { kana:"キョ", roma:"kyo" }
  ],
  "シャ행(요음)": [
    { kana:"シャ", roma:"sha" }, { kana:"シュ", roma:"shu" }, { kana:"ショ", roma:"sho" }
  ],
  "チャ행(요음)": [
    { kana:"チャ", roma:"cha" }, { kana:"チュ", roma:"chu" }, { kana:"チョ", roma:"cho" }
  ],
  "ニャ행(요음)": [
    { kana:"ニャ", roma:"nya" }, { kana:"ニュ", roma:"nyu" }, { kana:"ニョ", roma:"nyo" }
  ],
  "ヒャ행(요음)": [
    { kana:"ヒャ", roma:"hya" }, { kana:"ヒュ", roma:"hyu" }, { kana:"ヒョ", roma:"hyo" }
  ],
  "ミャ행(요음)": [
    { kana:"ミャ", roma:"mya" }, { kana:"ミュ", roma:"myu" }, { kana:"ミョ", roma:"myo" }
  ],
  "リャ행(요음)": [
    { kana:"リャ", roma:"rya" }, { kana:"リュ", roma:"ryu" }, { kana:"リョ", roma:"ryo" }
  ],
};

// ── 초등학생 단어 카테고리 메타데이터 ──────────────────────
const WORD_CATEGORIES = [
  { key:'basic_greeting',  label:'인사와 예절',        icon:'👋', tagline:'매일 쓰는 착한 인사!' },
  { key:'basic_school',    label:'학교와 교실',        icon:'🎒', tagline:'학교에서 만나는 물건들' },
  { key:'basic_animals',   label:'동물과 자연',        icon:'🦊', tagline:'귀여운 친구들과 하늘·바다' },
  { key:'basic_food',      label:'맛있는 간식·음식',   icon:'🍙', tagline:'냠냠! 좋아하는 먹거리' },
  { key:'basic_family',    label:'가족과 친구',        icon:'🏠', tagline:'소중한 우리 가족과 내 편' },
  { key:'basic_action',    label:'놀이와 움직임',      icon:'⚡', tagline:'신나게 뛰고 노는 말' },
  { key:'basic_color_adj', label:'색깔과 기분',        icon:'🌈', tagline:'반짝반짝 색깔과 마음' },
];

// ── 단어 데이터 (한자 배제, 초등학생용 총 100개) ──────────────
const WORDS = {

  // ▸ 인사와 예절 (10개)
  basic_greeting: [
    { word:"おはよう",             roma:"ohayou",               meaning:"안녕! (아침 인사)" },
    { word:"こんにちは",           roma:"konnichiwa",           meaning:"안녕하세요 (낮 인사)" },
    { word:"こんばんは",           roma:"konbanwa",             meaning:"안녕하세요 (저녁 인사)" },
    { word:"さようなら",           roma:"sayounara",            meaning:"안녕히 가세요 (작별)" },
    { word:"ありがとう",           roma:"arigatou",             meaning:"고마워!" },
    { word:"ごめんなさい",         roma:"gomennasai",           meaning:"미안해요" },
    { word:"いただきます",         roma:"itadakimasu",          meaning:"잘 먹겠습니다!" },
    { word:"ごちそうさま",         roma:"gochisousama",         meaning:"잘 먹었습니다!" },
    { word:"おやすみ",             roma:"oyasumi",              meaning:"잘 자!" },
    { word:"ただいま",             roma:"tadaima",              meaning:"다녀왔습니다!" },
  ],

  // ▸ 학교와 교실 (15개)
  basic_school: [
    { word:"がっこう",       roma:"gakkou",      meaning:"학교" },
    { word:"せんせい",       roma:"sensei",      meaning:"선생님" },
    { word:"きょうしつ",     roma:"kyoushitsu",  meaning:"교실" },
    { word:"つくえ",         roma:"tsukue",      meaning:"책상" },
    { word:"いす",           roma:"isu",         meaning:"의자" },
    { word:"えんぴつ",       roma:"enpitsu",     meaning:"연필" },
    { word:"けしゴム",       roma:"keshigomu",   meaning:"지우개" },
    { word:"ノート",         roma:"nooto",       meaning:"공책" },
    { word:"ほん",           roma:"hon",         meaning:"책" },
    { word:"かばん",         roma:"kaban",       meaning:"가방" },
    { word:"とけい",         roma:"tokei",       meaning:"시계" },
    { word:"テスト",         roma:"tesuto",      meaning:"시험" },
    { word:"しゅくだい",     roma:"shukudai",    meaning:"숙제" },
    { word:"うんどうじょう", roma:"undoujou",    meaning:"운동장" },
    { word:"としょしつ",     roma:"toshoshitsu", meaning:"도서관·도서실" },
  ],

  // ▸ 동물과 자연 (15개)
  basic_animals: [
    { word:"いぬ",     roma:"inu",     meaning:"강아지·개" },
    { word:"ねこ",     roma:"neko",    meaning:"고양이" },
    { word:"うさぎ",   roma:"usagi",   meaning:"토끼" },
    { word:"パンダ",   roma:"panda",   meaning:"판다" },
    { word:"ライオン", roma:"raion",   meaning:"사자" },
    { word:"ぞう",     roma:"zou",     meaning:"코끼리" },
    { word:"とり",     roma:"tori",    meaning:"새" },
    { word:"さかな",   roma:"sakana",  meaning:"물고기" },
    { word:"かめ",     roma:"kame",    meaning:"거북이" },
    { word:"はな",     roma:"hana",    meaning:"꽃" },
    { word:"き",       roma:"ki",      meaning:"나무" },
    { word:"そら",     roma:"sora",    meaning:"하늘" },
    { word:"うみ",     roma:"umi",     meaning:"바다" },
    { word:"やま",     roma:"yama",    meaning:"산" },
    { word:"ほし",     roma:"hoshi",   meaning:"별" },
  ],

  // ▸ 맛있는 간식·음식 (15개)
  basic_food: [
    { word:"りんご",         roma:"ringo",       meaning:"사과" },
    { word:"いちご",         roma:"ichigo",      meaning:"딸기" },
    { word:"バナナ",         roma:"banana",      meaning:"바나나" },
    { word:"みかん",         roma:"mikan",       meaning:"귤" },
    { word:"パン",           roma:"pan",         meaning:"빵" },
    { word:"ごはん",         roma:"gohan",       meaning:"밥" },
    { word:"おにぎり",       roma:"onigiri",     meaning:"주먹밥" },
    { word:"たまご",         roma:"tamago",      meaning:"달걀" },
    { word:"ケーキ",         roma:"keeki",       meaning:"케이크" },
    { word:"アイスクリーム", roma:"aisukuriimu", meaning:"아이스크림" },
    { word:"チョコレート",   roma:"chokoreeto",  meaning:"초콜릿" },
    { word:"みず",           roma:"mizu",        meaning:"물" },
    { word:"ぎゅうにゅう",   roma:"gyuunyuu",    meaning:"우유" },
    { word:"ジュース",       roma:"juusu",       meaning:"주스" },
    { word:"ラーメン",       roma:"raamen",      meaning:"라멘" },
  ],

  // ▸ 가족과 친구 (10개)
  basic_family: [
    { word:"かぞく",       roma:"kazoku",     meaning:"가족" },
    { word:"おかあさん",   roma:"okaasan",    meaning:"엄마" },
    { word:"おとうさん",   roma:"otousan",    meaning:"아빠" },
    { word:"おにいさん",   roma:"oniisan",    meaning:"형·오빠" },
    { word:"おねえさん",   roma:"oneesan",    meaning:"누나·언니" },
    { word:"おとうと",     roma:"otouto",     meaning:"남동생" },
    { word:"いもうと",     roma:"imouto",     meaning:"여동생" },
    { word:"あかちゃん",   roma:"akachan",    meaning:"아기" },
    { word:"ともだち",     roma:"tomodachi",  meaning:"친구" },
    { word:"わたし",       roma:"watashi",    meaning:"나" },
  ],

  // ▸ 놀이와 움직임 (20개)
  basic_action: [
    { word:"たべる",   roma:"taberu",   meaning:"먹다" },
    { word:"のむ",     roma:"nomu",     meaning:"마시다" },
    { word:"みる",     roma:"miru",     meaning:"보다" },
    { word:"きく",     roma:"kiku",     meaning:"듣다" },
    { word:"いく",     roma:"iku",      meaning:"가다" },
    { word:"くる",     roma:"kuru",     meaning:"오다" },
    { word:"あそぶ",   roma:"asobu",    meaning:"놀다" },
    { word:"はしる",   roma:"hashiru",  meaning:"달리다" },
    { word:"およぐ",   roma:"oyogu",    meaning:"수영하다" },
    { word:"とぶ",     roma:"tobu",     meaning:"점프하다·날다" },
    { word:"うたう",   roma:"utau",     meaning:"노래하다" },
    { word:"おどる",   roma:"odoru",    meaning:"춤추다" },
    { word:"かく",     roma:"kaku",     meaning:"쓰다·그리다" },
    { word:"よむ",     roma:"yomu",     meaning:"읽다" },
    { word:"ねる",     roma:"neru",     meaning:"자다" },
    { word:"おきる",   roma:"okiru",    meaning:"일어나다" },
    { word:"わらう",   roma:"warau",    meaning:"웃다" },
    { word:"ゲーム",   roma:"geemu",    meaning:"게임" },
    { word:"サッカー", roma:"sakkaa",   meaning:"축구" },
    { word:"アニメ",   roma:"anime",    meaning:"애니메이션" },
  ],

  // ▸ 색깔과 기분 (15개)
  basic_color_adj: [
    { word:"あかい",     roma:"akai",       meaning:"빨갛다" },
    { word:"あおい",     roma:"aoi",        meaning:"파랗다" },
    { word:"きいろい",   roma:"kiiroi",     meaning:"노랗다" },
    { word:"しろい",     roma:"shiroi",     meaning:"하얗다" },
    { word:"くろい",     roma:"kuroi",      meaning:"까맣다" },
    { word:"みどり",     roma:"midori",     meaning:"초록색" },
    { word:"ピンク",     roma:"pinku",      meaning:"분홍색" },
    { word:"おおきい",   roma:"ookii",      meaning:"크다" },
    { word:"ちいさい",   roma:"chiisai",    meaning:"작다" },
    { word:"たのしい",   roma:"tanoshii",   meaning:"즐겁다" },
    { word:"うれしい",   roma:"ureshii",    meaning:"기쁘다" },
    { word:"おいしい",   roma:"oishii",     meaning:"맛있다" },
    { word:"かわいい",   roma:"kawaii",     meaning:"귀엽다" },
    { word:"かっこいい", roma:"kakkoii",    meaning:"멋지다" },
    { word:"すごい",     roma:"sugoi",      meaning:"대단하다!" },
  ],
};

// ── 도장(스탬프) 업적 정의 ───────────────────────────────────
const STAMP_DEFINITIONS = [
  { id:'first_quiz',     title:'첫 출격!',       desc:'처음으로 퀴즈를 끝까지 풀었어요',      kanji:'初', color:'#2563EB' },
  { id:'perfect_set',    title:'백발백중',       desc:'퀴즈 10문제를 모두 맞혔어요',         kanji:'満', color:'#10B981' },
  { id:'combo_5',        title:'5연속 콤보!',    desc:'연속 5문제를 거침없이 맞혔어요',      kanji:'連', color:'#F59E0B' },
  { id:'kana_row_clear', title:'가나 수련생',    desc:'가나 행 3개 이상에서 도전했어요',     kanji:'仮', color:'#E11D48' },
  { id:'words_30',       title:'단어 수집가',    desc:'단어 퀴즈를 총 30문제 이상 풀었어요', kanji:'語', color:'#7C3AED' },
  { id:'bookmark_3',     title:'나만의 단어장',  desc:'어려운 단어를 3개 이상 북마크했어요', kanji:'星', color:'#EA580C' },
  { id:'all_star_50',    title:'별 50개 돌파!',  desc:'반짝이는 별을 50개 이상 모았어요',    kanji:'王', color:'#0284C7' },
];

// ── 도전자 레벨 칭호 ────────────────────────────────────────
const LEVEL_TITLES = [
  { level:1, minStars:0,   title:'아기 시바 견습생', badge:'🥋' },
  { level:2, minStars:20,  title:'히라가나 도전자', badge:'⚡' },
  { level:3, minStars:50,  title:'카타카나 수련생', badge:'🔥' },
  { level:4, minStars:100, title:'질풍 가나 닌자',  badge:'🥷' },
  { level:5, minStars:180, title:'전설의 도장 관장', badge:'👑' },
];

// 단어 총계: 10 + 15 + 15 + 15 + 10 + 20 + 15 = 100개
