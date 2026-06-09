const hands = {
  rock: { label: "グー", symbol: "●", image: "assets/images/janken_gu.png", beats: "scissors" },
  scissors: { label: "チョキ", symbol: "✌", image: "assets/images/janken_choki.png", beats: "paper" },
  paper: { label: "パー", symbol: "▰", image: "assets/images/janken_pa.png", beats: "rock" },
};

const characterImages = {
  normal: "assets/images/character_normal.png",
  win: "assets/images/character_happy.png",
  lose: "assets/images/character_lose.png",
  draw: "assets/images/character_normal.png",
  happy: "assets/images/character_happy.png",
  smug: "assets/images/character_smug.png",
  worried: "assets/images/character_worried.png",
  panic: "assets/images/character_panic.png",
  excited: "assets/images/character_excited.png",
  shocked: "assets/images/character_panic.png",
};

const sceneImages = {
  intro: "assets/images/scene_intro.png",
  playerWin: "assets/images/scene_player_win.png",
  playerLose: "assets/images/scene_player_lose.png",
  chanceWin: "assets/images/scene_chance_win.png",
  finalWin: "assets/images/scene_final_win.png",
  trueEnd: "assets/images/scene_true_end.png",
};

const galleryItems = [
  {
    id: "normalWin",
    title: "Normal Clear",
    lockedTitle: "????",
    src: "assets/images/scene_player_win.png",
    type: "ending",
    unlockText: "普通に10勝して勝利する",
  },
  {
    id: "gameOver",
    title: "Game Over",
    lockedTitle: "????",
    src: "assets/images/scene_player_lose.png",
    fallbackSrc: "assets/images/scene_player_win.png",
    type: "ending",
    unlockText: "10敗後、CONTINUEせずにGAME OVERを見る",
  },
  {
    id: "chanceWin",
    title: "Chance Time Clear",
    lockedTitle: "????",
    src: "assets/images/scene_chance_win.png",
    fallbackSrc: "assets/images/scene_player_win.png",
    type: "ending",
    unlockText: "あいこ10回後の2ポイント制で勝利する",
  },
  {
    id: "finalWin",
    title: "Final Janken Clear",
    lockedTitle: "????",
    src: "assets/images/scene_final_win.png",
    fallbackSrc: "assets/images/scene_player_win.png",
    type: "ending",
    unlockText: "あいこ15回後のファイナルじゃんけんで勝利する",
  },
  {
    id: "trueEnd",
    title: "TRUE END",
    lockedTitle: "LOCKED",
    src: "assets/images/scene_true_end.png",
    fallbackSrc: "assets/images/scene_player_win.png",
    type: "trueEnd",
    unlockText: "ギャラリー100%で解放",
    requiresComplete: true,
  },
];

const imageCache = new Map();
let characterRequestId = 0;
let sceneCharacterRequestId = 0;
let sceneIllustrationRequestId = 0;
let resultLabelTimer = null;
let startupAssetsReady = null;
let messageTypingTimer = null;
let messageTypingId = 0;
let sceneTypingTimer = null;
let sceneTypingId = 0;
let sceneCurrentFullText = "";
let sceneCurrentDone = false;
let sceneTypingResolve = null;
let sceneAdvanceResolve = null;
let sceneDialogActive = false;
let sceneSequenceId = 0;
let characterBeatId = 0;
let cutInTimer = null;
let galleryIndex = 0;
let galleryRequestId = 0;
let galleryPreloadQueued = false;

const urlParams = new URLSearchParams(window.location.search);
const DEBUG_MODE = urlParams.has("debug");

function detectLowPowerDevice() {
  try {
    const forcedLite = urlParams.has("lite") || urlParams.get("perf") === "lite";
    const forcedFull = urlParams.has("full") || urlParams.get("perf") === "full";

    if (forcedLite) {
      return true;
    }

    if (forcedFull) {
      return false;
    }

    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

    return reducedMotion || (cores > 0 && cores <= 4) || (memory > 0 && memory <= 3);
  } catch (error) {
    return false;
  }
}

const LOW_POWER_MODE = detectLowPowerDevice();
const MATCH_POINT = 10;
const CONTINUE_SECONDS = 10;
const DRAW_WARNING_COUNT = 5;
const CHANCE_DRAW_COUNT = 10;
const FINAL_DRAW_COUNT = 15;
const CHANCE_MESSAGES = ["チャンスタイム！", "勝敗2倍だよ！", "次は2点だよ！", "ここが勝負！"];
const INTRO_LINES = ["よろしくね！", "勝負しよ♪", "準備はいい？", "はじめるよ！", "本気でいくよ♪"];
const CHANCE_ENTRY_LINES = ["チャンスタイム！", "勝敗2倍だよ！", "次は2点だよ！", "ここが勝負！"];
const DRAW_WARNING_LINES = ["なんか続いてるね…？", "空気が変わったかも…", "そろそろ動くかも？"];
const FINAL_JANKEN_ENTRY_LINES = ["ファイナルじゃんけん！", "次に勝った方が勝ち！", "ここで全部決まるよ！"];
const FINAL_JANKEN_IDLE_LINES = ["次で決まるよ…！", "勝った方が勝ち！", "最後の勝負だよ！"];
const FINAL_CONFIRM_LINES = ["本当にそれでいく？", "同じ手でもう一度！", "それで決める？"];
const PSYCH_EVENT_CHANCE = 0.12;
const POST_TRUE_DRAW_RECORD_KEY = "jankenPostTrueDrawRecordV1";
const HAND_NAMES = {
  rock: "グー",
  scissors: "チョキ",
  paper: "パー",
};
const SCENE_INTRO_LINES = [
  "来てくれてありがとう。今日は一緒にじゃんけん勝負、楽しもうね！",
  "準備はいい？ それじゃあ、楽しく勝負しよっか！",
  "よろしくね。手加減なしだけど、楽しくいこうね！",
  "じゃんけん勝負、はじめるよ。最後まで楽しんでね！",
];
const SCENE_PLAYER_WIN_LINES = [
  "すごいね、あなたの勝ちだよ。楽しかったから、また勝負してね！",
  "まけちゃった…。でもすごく楽しかったよ。また遊びに来てね。",
  "あなたの勝ちだね。次はもっと強くなって待ってるね！",
  "くやしいけど、楽しかったよ。よかったら、また勝負しよ？",
];
const SCENE_PLAYER_LOSE_LINES = [
  "ここまで遊んでくれてありがとう。もう一回だけ、勝負してみる？",
  "おつかれさま。あと少しだったね。よかったら、また挑戦してね。",
  "最後まで遊んでくれてうれしいよ。また一緒に勝負しようね。",
  "また来てくれたらうれしいな。次の勝負、待ってるね。",
];

const dialogue = {
  final: {
    idle: FINAL_JANKEN_IDLE_LINES,
    cpuWin: ["決着だよ！", "最後は私の勝ち！", "ファイナル取ったよ！"],
    cpuLose: ["決まったね！", "あなたの勝ちだよ！", "最後の一手、すごい！"],
    draw: ["まだ決まらない！", "もう一回、勝負！", "最後まで分からないね！"],
    image: "excited",
  },
  even: {
    idle: ["いい勝負だね！", "次はどうくる？", "まだまだ！"],
    cpuWin: ["やったー！", "私の勝ち！", "当たった！"],
    cpuLose: ["まけたー！", "くやしい！", "次は負けないよ！"],
    draw: ["あいこだね！", "もう一回！", "気が合うね！"],
    image: "normal",
  },
  playerLeadSmall: {
    idle: ["まずいかも...", "追いつけるよね？", "次こそ！"],
    cpuWin: ["よし、まだいける！", "追い上げるよ！", "ふう、助かった！"],
    cpuLose: ["うう、強いね", "取られちゃった", "焦ってきた..."],
    draw: ["助かった...", "もう一回！", "慎重に..."],
    image: "worried",
  },
  playerLeadBig: {
    idle: ["追いつけるかな", "次は勝ちたい！", "ピンチだよ..."],
    cpuWin: ["やっと取れた！", "まだ終わらない！", "反撃だよ！"],
    cpuLose: ["まけたー！", "どうしよう...", "あとがないよ..."],
    draw: ["ドキドキ...", "まだ続くの？", "ギリギリ..."],
    image: "panic",
  },
  cpuLeadSmall: {
    idle: ["いい感じかも♪", "いけるかな？", "余裕あるよ！"],
    cpuWin: ["リードだよ！", "読めてるよ！", "この調子！"],
    cpuLose: ["油断したかも", "むむ、やるね！", "まだ平気！"],
    draw: ["惜しい！", "もう一回！", "次で決めるよ！"],
    image: "happy",
  },
  cpuLeadBig: {
    idle: ["勝てそう♪", "私、強いかも！", "決めちゃうよ！"],
    cpuWin: ["また勝ち♪", "調子いいよ！", "どうかな？"],
    cpuLose: ["今のは油断！", "まだ余裕だよ！", "びっくりした..."],
    draw: ["粘るねえ！", "次は私かな？", "楽しいね♪"],
    image: "smug",
  },
  chance: {
    idle: CHANCE_MESSAGES,
    cpuWin: ["2点もらうね！", "チャンス成功！", "私の2点！"],
    cpuLose: ["2点は痛い！", "取られたー！", "やられたー！"],
    draw: ["まだまだ！", "熱いね！", "次が勝負だよ！"],
    image: "excited",
  },
};

const endgameLines = ["もうすぐ決まる...", "ここが山場！", "気を抜けないよ！"];

const GALLERY_PROGRESS_KEY = "jankenGalleryProgressV3";
const GALLERY_ROUTE_KEYS = ["normalWin", "gameOver", "chanceWin", "finalWin"];
const TRUE_END_UNLOCK_LINES = ["……全部、見つけてくれたんだね。", "それなら、ほんとのことを話すね。"];
const TRUE_END_LINES = [
  "……全部、\n見つけてくれたんだね。",
  "普通に勝った時も、",
  "チャンスタイムも、",
  "最後の一発勝負まで……",
  "ちゃんと来てくれた。",
  "ほんとはね、",
  "少しだけ気づいてほしかったの。",
  "どうして私が、",
  "あいこを続けたがってたのか。",
  "勝っても、負けても、",
  "そこで終わっちゃうでしょ？",
  "でも、あいこなら……",
  "もう一回って言えるから。",
  "もう少しだけ、",
  "一緒にいられるから。",
  "同じ手を出すのって、",
  "同じ気持ちになれたみたいで、",
  "少し嬉しかったんだ。",
  "だから、最後まで付き合ってくれて……",
  "ありがとう。",
  "あなたとするじゃんけん、",
  "私……好き。",
  "今度は、勝負じゃなくて。",
  "また、最初のあいこから始めよう？",
  "TRUE END\nまた、あいこから始めよう",
];
const DRAW_ROUTE_HINT_LINES = [
  "同じ手なら\nまだ続くよ。",
  "合わせてくれる？",
  "もう少しだけ\n続けたいかも。",
];
const CHANCE_ROUTE_HINT_LINES = [
  "この先も\nまだあるよ。",
  "私の手、\nよく見てね。",
  "終わらせないなら\n合わせてみて？",
];
const FINAL_ROUTE_HINT_LINES = [
  "あと少しで\n最後の勝負だよ。",
  "ここまで来たなら\nあと少し付き合って。",
  "あいこ15回まで\n届くかも。",
];

function getDefaultGalleryProgress() {
  return {
    normalWin: false,
    gameOver: false,
    chanceWin: false,
    finalWin: false,
    trueEndSeen: false,
  };
}

function sanitizeGalleryProgress(value) {
  const source = value && typeof value === "object" ? value : {};

  return {
    normalWin: source.normalWin === true,
    gameOver: source.gameOver === true,
    chanceWin: source.chanceWin === true,
    finalWin: source.finalWin === true,
    trueEndSeen: source.trueEndSeen === true,
  };
}

function loadGalleryProgress() {
  try {
    const raw = window.localStorage.getItem(GALLERY_PROGRESS_KEY);
    if (!raw) {
      return getDefaultGalleryProgress();
    }

    return sanitizeGalleryProgress(JSON.parse(raw));
  } catch (error) {
    return getDefaultGalleryProgress();
  }
}

function saveGalleryProgress(progress) {
  try {
    window.localStorage.setItem(GALLERY_PROGRESS_KEY, JSON.stringify(sanitizeGalleryProgress(progress)));
  } catch (error) {
    // localStorage may be unavailable in private or restricted browsers.
  }
}

function loadPostTrueDrawRecord() {
  try {
    const raw = window.localStorage.getItem(POST_TRUE_DRAW_RECORD_KEY);
    const value = Number.parseInt(raw || "0", 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (error) {
    return 0;
  }
}

function savePostTrueDrawRecord(value) {
  try {
    window.localStorage.setItem(POST_TRUE_DRAW_RECORD_KEY, String(Math.max(0, value || 0)));
  } catch (error) {
    // Storage errors should not stop the game.
  }
}

function getPostTrueDrawRecord() {
  return loadPostTrueDrawRecord();
}

const state = {
  started: false,
  busy: false,
  ended: false,
  win: 0,
  lose: 0,
  draw: 0,
  chance: false,
  drawWarningShown: false,
  finalJanken: false,
  finalConfirmHand: null,
  routeReachedChance: false,
  routeReachedFinal: false,
  psychEvent: null,
  nextCallMode: "normal",
  countdownTimer: null,
  chanceMessageTimer: null,
  chanceMessageIndex: 0,
  debugForceNextResult: null,
  debugPanelVisible: false,
  debugSoundTaps: [],
  galleryUnlockedSession: false,
  galleryJustUnlockedId: null,
  galleryProgress: loadGalleryProgress(),
  trueEndingQueued: false,
  showingTrueEnding: false,
  inputGuideShownOnce: false,
  inputGuideVisible: false,
  postTrueRecordAnnounced: false,
  postTrueNewRecordShownFor: 0,
  lastLine: "",
  flowId: 0,
};

const cabinet = document.querySelector(".cabinet");
const startButton = document.querySelector("#startButton");
const galleryButton = document.querySelector("#galleryButton");
const relationResetButton = document.querySelector("#relationResetButton");
const choiceButtons = document.querySelectorAll(".choice");
const choiceButtonGroup = document.querySelector(".choice-buttons");
const inputGuide = document.querySelector("#inputGuide");
const message = document.querySelector("#message");
const playerHand = document.querySelector("#playerHand");
const cpuHand = document.querySelector("#cpuHand");
const resultLabel = document.querySelector("#resultLabel");
const endOverlay = document.querySelector("#endOverlay");
const finalTitle = document.querySelector("#finalTitle");
const finalMessage = document.querySelector("#finalMessage");
const retryButton = document.querySelector("#retryButton");
const muteButton = document.querySelector("#muteButton");
const countdown = document.querySelector("#countdown");
const sceneOverlay = document.querySelector("#sceneOverlay");
const sceneIllustration = document.querySelector("#sceneIllustration");
const sceneCharacterImage = document.querySelector("#sceneCharacterImage");
const sceneCharacterFallback = document.querySelector("#sceneCharacterFallback");
const sceneMessage = document.querySelector("#sceneMessage");
const sceneNextButton = document.querySelector("#sceneNextButton");
const galleryOverlay = document.querySelector("#galleryOverlay");
const galleryImage = document.querySelector("#galleryImage");
const galleryLocked = document.querySelector("#galleryLocked");
const galleryProgress = document.querySelector("#galleryProgress");
const galleryCaption = document.querySelector("#galleryCaption");
const galleryCounter = document.querySelector("#galleryCounter");
const galleryCloseButton = document.querySelector("#galleryCloseButton");
const galleryPrevButton = document.querySelector("#galleryPrevButton");
const galleryNextButton = document.querySelector("#galleryNextButton");
const winCount = document.querySelector("#winCount");
const loseCount = document.querySelector("#loseCount");
const drawCount = document.querySelector("#drawCount");
const characterFrame = document.querySelector(".character-frame");
const characterImage = document.querySelector("#characterImage");
const characterFallback = document.querySelector("#characterFallback");

function applyPerformanceModeClass() {
  document.documentElement.classList.toggle("is-lite-performance", LOW_POWER_MODE);
  document.body?.classList.toggle("is-lite-performance", LOW_POWER_MODE);
  cabinet?.classList.toggle("is-lite-performance", LOW_POWER_MODE);
}

const KEYBOARD_HAND_MAP = {
  "1": "rock",
  g: "rock",
  "2": "scissors",
  c: "scissors",
  "3": "paper",
  p: "paper",
};

function isTypingTarget(target) {
  const tagName = target?.tagName?.toLowerCase();

  return Boolean(
    target?.isContentEditable ||
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select"
  );
}

function choiceButtonForHand(hand) {
  return [...choiceButtons].find((button) => button.dataset.hand === hand) || null;
}

function handleKeyboardShortcut(event) {
  if (isTypingTarget(event.target)) {
    return;
  }

  if (sceneDialogActive && sceneOverlay && !sceneOverlay.hidden) {
    if (event.key === "Enter" || event.key === " ") {
      advanceSceneDialog(event);
    }
    return;
  }

  if (galleryOverlay && !galleryOverlay.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeGallery();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveGallery(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveGallery(1);
      return;
    }

    return;
  }

  if (event.key === "Escape" && state.debugPanelVisible) {
    event.preventDefault();
    toggleDebugMode(false);
    return;
  }

  const hand = KEYBOARD_HAND_MAP[event.key.toLowerCase()];
  if (!hand) {
    return;
  }

  const button = choiceButtonForHand(hand);
  if (isChoiceInputLocked(button)) {
    return;
  }

  event.preventDefault();
  handleChoiceButtonClick(hand);
}

function isChoiceInputLocked(button) {
  return !state.started || state.busy || state.ended || !button || button.disabled;
}

function shouldSuppressBrowserGesture(target) {
  return Boolean(target?.closest?.(".cabinet"));
}

["selectstart", "dragstart"].forEach((eventName) => {
  document.addEventListener(
    eventName,
    (event) => {
      if (shouldSuppressBrowserGesture(event.target)) {
        event.preventDefault();
      }
    },
    { capture: true }
  );
});

document.addEventListener(
  "contextmenu",
  (event) => {
    if (shouldSuppressBrowserGesture(event.target)) {
      event.preventDefault();
    }
  },
  { capture: true }
);


const AudioManager = (() => {
  const storageKey = "jankenRetroMuted";
  const bgmPaths = {
    normal: "assets/sounds/bgm_loop.mp3",
    chance: "assets/sounds/bgm_chance.mp3",
    final: "assets/sounds/bgm_final.mp3",
    trueEnd: "assets/sounds/bgm_true_end.mp3",
  };
  const bgmVolumes = {
    normal: 0.25,
    chance: 0.3,
    final: 0.32,
    trueEnd: 0.34,
  };
  const sfxPaths = {
    cutin: "assets/sounds/cutin_stinger.mp3",
    jankenCall: "assets/sounds/se_janken_call.mp3",
  };
  let context = null;
  let normalBgm = null;
  let chanceBgm = null;
  let finalBgm = null;
  let trueEndBgm = null;
  let cutinSfx = null;
  let jankenCallSfxPool = [];
  let jankenCallSfxIndex = 0;
  let chanceBgmFailed = false;
  let finalBgmFailed = false;
  let trueEndBgmFailed = false;
  let jankenCallSfxFailed = false;
  let currentBgmMode = null;
  let lastCutinSfxAt = 0;
  let gameplayPrepared = false;
  let muted = false;

  function loadMutedPreference() {
    try {
      muted = window.localStorage.getItem(storageKey) === "true";
    } catch (error) {
      muted = false;
    }
  }

  function initAudio() {
    try {
      if (typeof window === "undefined") {
        return;
      }

      loadMutedPreference();

      if (!normalBgm) {
        normalBgm = createBgm("normal");
      }

      if (!chanceBgm) {
        chanceBgm = createBgm("chance");
      }

      if (!finalBgm) {
        finalBgm = createBgm("final");
      }

      if (!trueEndBgm) {
        trueEndBgm = createBgm("trueEnd");
      }

      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          context = new AudioContext();
        }
      }
    } catch (error) {
      context = null;
    }
  }

  function createBgm(mode) {
    const audio = new Audio(bgmPaths[mode]);
    audio.loop = true;
    audio.volume = bgmVolumes[mode];
    audio.preload = mode === "normal" ? "metadata" : "none";
    audio.addEventListener(
      "error",
      () => {
        if (mode === "trueEnd") {
          console.warn("True End BGM not found: assets/sounds/bgm_true_end.mp3");
          trueEndBgmFailed = true;
          if (currentBgmMode === "trueEnd") {
            currentBgmMode = null;
            switchBgm("final");
          }
          return;
        }

        if (mode === "final") {
          console.warn("Final BGM not found: assets/sounds/bgm_final.mp3");
          finalBgmFailed = true;
          if (currentBgmMode === "final") {
            currentBgmMode = null;
            switchBgm("chance");
          }
          return;
        }

        if (mode === "chance") {
          console.warn("Chance BGM not found: assets/sounds/bgm_chance.mp3");
          chanceBgmFailed = true;
          if (currentBgmMode === "chance") {
            currentBgmMode = null;
            switchBgm("normal");
          }
        }
      },
      { once: true }
    );
    return audio;
  }

  function createCutinSfx() {
    const audio = new Audio(sfxPaths.cutin);
    audio.preload = "metadata";
    audio.volume = 0.66;
    audio.addEventListener(
      "error",
      () => {
        console.warn("Cut-in SFX not found: assets/sounds/cutin_stinger.mp3");
      },
      { once: true }
    );
    return audio;
  }

  function createOneShotSfx(path, volume = 0.72) {
    const audio = new Audio(path);
    audio.preload = "auto";
    audio.volume = volume;
    return audio;
  }

  function initJankenCallSfx() {
    if (jankenCallSfxPool.length || jankenCallSfxFailed) {
      return;
    }

    try {
      const poolSize = LOW_POWER_MODE ? 2 : 3;
      jankenCallSfxPool = Array.from({ length: poolSize }, () => {
        const audio = createOneShotSfx(sfxPaths.jankenCall, 0.68);
        audio.addEventListener(
          "error",
          () => {
            jankenCallSfxFailed = true;
          },
          { once: true }
        );
        return audio;
      });
    } catch (error) {
      jankenCallSfxFailed = true;
    }
  }

  function prepareForGameplay() {
    if (gameplayPrepared) {
      return;
    }

    gameplayPrepared = true;

    try {
      initAudio();
      initJankenCallSfx();
      jankenCallSfxPool.forEach((sfx) => {
        try {
          sfx.load();
        } catch (error) {
          // Warming up audio is optional.
        }
      });

      if (!LOW_POWER_MODE && !cutinSfx) {
        cutinSfx = createCutinSfx();
        try {
          cutinSfx.load();
        } catch (error) {
          // Cut-in sound can still be created later on demand.
        }
      }
    } catch (error) {
      // Audio warmup must not block the game.
    }
  }

  function normalizeBgmMode(mode) {
    if (mode === "trueEnd") {
      return trueEndBgmFailed ? normalizeBgmMode("final") : "trueEnd";
    }

    if (mode === "final") {
      return finalBgmFailed ? normalizeBgmMode("chance") : "final";
    }

    if (mode === "chance") {
      return chanceBgmFailed ? "normal" : "chance";
    }

    return "normal";
  }

  function bgmForMode(mode) {
    if (mode === "trueEnd") {
      return trueEndBgmFailed ? bgmForMode("final") : trueEndBgm;
    }

    if (mode === "final") {
      return finalBgmFailed ? bgmForMode("chance") : finalBgm;
    }

    if (mode === "chance") {
      return chanceBgmFailed ? normalBgm : chanceBgm;
    }

    return normalBgm;
  }

  function resumeContext() {
    try {
      initAudio();
      if (context && context.state === "suspended") {
        context.resume().catch(() => {});
      }
    } catch (error) {
      // Audio is optional.
    }
  }

  function playBgm(mode = "normal") {
    try {
      initAudio();
      const bgm = bgmForMode(mode);
      if (muted || !bgm) {
        return;
      }

      currentBgmMode = normalizeBgmMode(mode);
      bgm.volume = bgmVolumes[currentBgmMode];
      bgm.play().catch(() => {
        if (currentBgmMode === "trueEnd") {
          console.warn("True End BGM not found: assets/sounds/bgm_true_end.mp3");
          trueEndBgmFailed = true;
          currentBgmMode = null;
          switchBgm("final");
          return;
        }

        if (currentBgmMode === "final") {
          console.warn("Final BGM not found: assets/sounds/bgm_final.mp3");
          finalBgmFailed = true;
          currentBgmMode = null;
          switchBgm("chance");
          return;
        }

        if (currentBgmMode === "chance") {
          console.warn("Chance BGM not found: assets/sounds/bgm_chance.mp3");
          chanceBgmFailed = true;
          currentBgmMode = null;
          switchBgm("normal");
        }
      });
    } catch (error) {
      // Missing BGM files must not stop the game.
    }
  }

  function switchBgm(mode = "normal") {
    try {
      const nextMode = normalizeBgmMode(mode);
      initAudio();

      if (currentBgmMode === nextMode) {
        playBgm(nextMode);
        return;
      }

      const current = bgmForMode(currentBgmMode);
      if (current) {
        current.pause();
        current.currentTime = 0;
      }

      currentBgmMode = nextMode;
      playBgm(nextMode);
    } catch (error) {
      // BGM switching is optional.
    }
  }

  function stopBgm() {
    try {
      [normalBgm, chanceBgm, finalBgm, trueEndBgm].forEach((bgm) => {
        if (!bgm) {
          return;
        }

        bgm.pause();
        bgm.currentTime = 0;
      });
      currentBgmMode = null;
    } catch (error) {
      // Audio is optional.
    }
  }

  function tone(frequency, start, duration, options = {}) {
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const volume = options.volume ?? 0.42;

    oscillator.type = options.type || "square";
    oscillator.frequency.setValueAtTime(frequency, now + start);
    if (options.to) {
      oscillator.frequency.exponentialRampToValueAtTime(options.to, now + start + duration);
    }

    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.025);
  }

  function playSound(type) {
    try {
      if (muted || (LOW_POWER_MODE && type === "textBlip")) {
        return;
      }

      resumeContext();
      if (!context) {
        return;
      }

      const patterns = {
        start: [[520, 0, 0.08], [780, 0.08, 0.1], [1040, 0.18, 0.12]],
        select: [[880, 0, 0.055]],
        call1: [[360, 0, 0.045, { volume: 0.28 }]],
        call2: [[520, 0, 0.045, { volume: 0.3 }]],
        call3: [[760, 0, 0.065, { volume: 0.34 }], [1120, 0, 0.035, { volume: 0.12, type: "triangle" }]],
        textBlip: [[560, 0, 0.024, { volume: 0.1, type: "square" }]],
        handPop: [[920, 0, 0.032, { volume: 0.16 }]],
        reveal: [[920, 0, 0.032, { volume: 0.16 }]],
        win: [[560, 0, 0.08], [760, 0.08, 0.08], [1020, 0.16, 0.16, { volume: 0.5 }]],
        lose: [[380, 0, 0.15, { to: 220, volume: 0.28, type: "triangle" }]],
        draw: [[440, 0, 0.055, { volume: 0.24 }], [620, 0.16, 0.07, { volume: 0.28 }]],
        chance: [[520, 0, 0.06], [760, 0.07, 0.06], [1040, 0.14, 0.1], [1320, 0.25, 0.18, { volume: 0.5 }]],
        youwin: [[660, 0, 0.1], [880, 0.11, 0.1], [1320, 0.22, 0.25, { volume: 0.52 }]],
        continue: [[330, 0, 0.09], [440, 0.12, 0.09], [330, 0.24, 0.13, { volume: 0.46 }]],
        gameover: [[240, 0, 0.16, { to: 150, type: "sawtooth" }], [160, 0.18, 0.24, { to: 80, volume: 0.42, type: "sawtooth" }]],
        blackout: [[90, 0, 0.06, { to: 50, volume: 0.5 }]],
      };

      (patterns[type] || []).forEach(([frequency, start, duration, options]) => {
        tone(frequency, start, duration, options);
      });
    } catch (error) {
      // Sound effects are optional.
    }
  }

  function playJankenCallSfx(fallbackType = "call1") {
    try {
      if (muted) {
        return;
      }

      initAudio();
      initJankenCallSfx();

      if (jankenCallSfxFailed || !jankenCallSfxPool.length) {
        playSound(fallbackType);
        return;
      }

      const audio = jankenCallSfxPool[jankenCallSfxIndex % jankenCallSfxPool.length];
      jankenCallSfxIndex += 1;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = fallbackType === "call3" ? 0.76 : 0.66;
      audio.play().catch(() => {
        playSound(fallbackType);
      });
    } catch (error) {
      playSound(fallbackType);
    }
  }

  function playCutinSfx() {
    try {
      if (muted) {
        return;
      }

      initAudio();
      if (!cutinSfx) {
        cutinSfx = createCutinSfx();
      }

      const now = Date.now();
      if (now - lastCutinSfxAt < 700) {
        return;
      }

      lastCutinSfxAt = now;
      cutinSfx.pause();
      cutinSfx.currentTime = 0;
      cutinSfx.volume = 0.66;
      cutinSfx.play().catch(() => {});
    } catch (error) {
      // Cut-in sound is optional.
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    try {
      window.localStorage.setItem(storageKey, String(muted));
    } catch (error) {
      // Storage is optional.
    }

    if (muted) {
      stopBgm();
      jankenCallSfxPool.forEach((sfx) => {
        try {
          sfx.pause();
          sfx.currentTime = 0;
        } catch (error) {
          // One-shot sound is optional.
        }
      });
      if (cutinSfx) {
        try {
          cutinSfx.pause();
          cutinSfx.currentTime = 0;
        } catch (error) {
          // Cut-in sound is optional.
        }
      }
    } else {
      resumeContext();
      if (state.showingTrueEnding) {
        playBgm("trueEnd");
      } else if (state.started && !state.ended) {
        playBgm(state.finalJanken ? "final" : state.chance ? "chance" : "normal");
      }
    }

    updateMuteButton();
  }

  function toggleMute() {
    setMuted(!muted);
  }

  function updateMuteButton() {
    if (!muteButton) {
      return;
    }

    muteButton.textContent = muted ? "SOUND OFF" : "SOUND ON";
    muteButton.setAttribute("aria-pressed", String(muted));
  }

  return {
    initAudio,
    loadMutedPreference,
    prepareForGameplay,
    playBgm,
    switchBgm,
    stopBgm,
    playSound,
    playJankenCallSfx,
    playCutinSfx,
    setMuted,
    toggleMute,
    updateMuteButton,
  };
})();

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function scheduleIdleTask(callback, delay = 600) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 2000 });
    return;
  }

  window.setTimeout(callback, delay);
}

function restartClassAnimation(element, className) {
  if (!element) {
    return;
  }

  const token = String((Number(element.dataset.animationToken) || 0) + 1);
  element.dataset.animationToken = token;
  element.classList.remove(className);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (element.dataset.animationToken !== token) {
        return;
      }

      element.classList.add(className);
    });
  });
}

function cancelClassAnimation(element, className) {
  if (!element) {
    return;
  }

  element.dataset.animationToken = String((Number(element.dataset.animationToken) || 0) + 1);
  element.classList.remove(className);
}

function playCharacterBeat(className) {
  if (!characterFrame) {
    return;
  }

  const token = String(characterBeatId + 1);
  characterBeatId += 1;
  characterFrame.dataset.beatToken = token;
  characterFrame.classList.remove("is-beat-1", "is-beat-2", "is-beat-3");

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (characterFrame.dataset.beatToken !== token) {
        return;
      }

      characterFrame.classList.add(className);
    });
  });
}

function clearCharacterBeat() {
  if (!characterFrame) {
    return;
  }

  characterBeatId += 1;
  characterFrame.dataset.beatToken = String(characterBeatId);
  characterFrame.classList.remove("is-beat-1", "is-beat-2", "is-beat-3");
}

function clearCinematicCutIn() {
  if (cutInTimer) {
    window.clearTimeout(cutInTimer);
    cutInTimer = null;
  }

  cabinet.classList.remove("is-cinematic-cutin", "cutin-psych", "cutin-chance", "cutin-final");
}

function triggerCinematicCutIn(type) {
  if (!cabinet) {
    return;
  }

  const cutInDurations = {
    psych: 1200,
    chance: 1500,
    final: 1800,
  };

  clearCinematicCutIn();
  cabinet.classList.add("is-cinematic-cutin", `cutin-${type}`);

  if (["psych", "chance", "final"].includes(type)) {
    AudioManager.playCutinSfx();
  }

  cutInTimer = window.setTimeout(() => {
    clearCinematicCutIn();
  }, cutInDurations[type] || 1300);
}

function setButtonsEnabled(enabled) {
  choiceButtonGroup?.classList.toggle("is-input-locked", !enabled);
  choiceButtons.forEach((button) => {
    button.disabled = !enabled;
    if (!enabled) {
      button.classList.remove("is-pressing");
    }
  });
}

function showInputGuideOnce() {
  if (!inputGuide || state.inputGuideShownOnce || state.inputGuideVisible || !state.started || state.busy || state.ended) {
    return;
  }

  state.inputGuideVisible = true;
  inputGuide.hidden = false;
}

function hideInputGuide(markShown = true) {
  if (markShown) {
    state.inputGuideShownOnce = true;
  }

  state.inputGuideVisible = false;

  if (inputGuide) {
    inputGuide.hidden = true;
  }
}

function showFinalChoiceConfirm(hand) {
  stopChanceMessages();
  setSelectedButton(hand);
  setCharacter("excited");
  triggerCinematicCutIn("final");
  AudioManager.playSound("select");
  showMessage(`${handName(hand)}でいく？ ${randomLine(FINAL_CONFIRM_LINES)}`, "is-result is-final-entry is-final-confirm", {
    typewriter: true,
    maxDuration: 620,
  });
}

function handleChoiceButtonClick(hand) {
  if (!hand) {
    return;
  }

  const button = [...choiceButtons].find((choiceButton) => choiceButton.dataset.hand === hand);
  if (isChoiceInputLocked(button)) {
    return;
  }

  clearChoicePressState();
  hideInputGuide();

  if (state.finalJanken && !state.busy && !state.ended) {
    if (state.finalConfirmHand === hand) {
      state.finalConfirmHand = null;
      cabinet.classList.remove("is-final-confirm");
      playRound(hand);
      return;
    }

    state.finalConfirmHand = hand;
    showFinalChoiceConfirm(hand);
    return;
  }

  state.finalConfirmHand = null;
  cabinet.classList.remove("is-final-confirm");
  playRound(hand);
}

function getGalleryProgress() {
  return sanitizeGalleryProgress(state.galleryProgress);
}

function hasAnyGalleryUnlock() {
  const progress = getGalleryProgress();
  return Boolean(progress.normalWin || progress.gameOver || progress.chanceWin || progress.finalWin || progress.trueEndSeen);
}

function isGalleryButtonAvailable() {
  return hasAnyGalleryUnlock() || state.galleryUnlockedSession === true;
}

function isGalleryUnlocked() {
  return isGalleryButtonAvailable();
}

function getGalleryCompletionPercent() {
  const progress = getGalleryProgress();
  const unlockedCount = GALLERY_ROUTE_KEYS.filter((key) => progress[key]).length;
  return Math.round((unlockedCount / GALLERY_ROUTE_KEYS.length) * 100);
}

function isGalleryComplete() {
  const progress = getGalleryProgress();
  return GALLERY_ROUTE_KEYS.every((key) => progress[key]);
}

function getMissingGalleryRoutes(progress = getGalleryProgress()) {
  return GALLERY_ROUTE_KEYS.filter((routeId) => progress[routeId] !== true);
}

function getNextTargetRoute(progress = getGalleryProgress()) {
  if (!progress.normalWin) {
    return "normalWin";
  }

  if (!progress.gameOver) {
    return "gameOver";
  }

  if (!progress.chanceWin) {
    return "chanceWin";
  }

  if (!progress.finalWin) {
    return "finalWin";
  }

  return "complete";
}

function isGalleryItemUnlocked(item) {
  const progress = getGalleryProgress();

  if (item.id === "trueEnd") {
    return isGalleryComplete() || progress.trueEndSeen;
  }

  return Boolean(progress[item.id]);
}

function scheduleGalleryPreload() {
  if (galleryPreloadQueued) {
    return;
  }

  galleryPreloadQueued = true;
  scheduleIdleTask(() => {
    const unlockedSources = galleryItems
      .filter((item) => isGalleryItemUnlocked(item))
      .flatMap((item) => [item.src, item.fallbackSrc])
      .filter(Boolean);

    collectImageSources({ gallery: unlockedSources }).forEach((src) => {
      preloadImage(src);
    });
  }, 900);
}

function titleOverlayOpen() {
  return (
    (sceneOverlay && !sceneOverlay.hidden) ||
    (endOverlay && !endOverlay.hidden) ||
    (galleryOverlay && !galleryOverlay.hidden)
  );
}

function updateRelationResetButton() {
  if (!relationResetButton) {
    return;
  }

  const progress = getGalleryProgress();
  const shouldShow =
    progress.trueEndSeen === true &&
    !state.started &&
    !state.busy &&
    !state.ended &&
    !titleOverlayOpen() &&
    startButton &&
    !startButton.hidden;

  relationResetButton.hidden = !shouldShow;
}

function updateGalleryButton() {
  if (!galleryButton) {
    updateRelationResetButton();
    return;
  }

  const shouldShow =
    isGalleryButtonAvailable() &&
    !state.started &&
    !state.busy &&
    !state.ended &&
    !titleOverlayOpen() &&
    startButton &&
    !startButton.hidden;

  galleryButton.hidden = !shouldShow;

  if (!shouldShow) {
    galleryButton.classList.remove("is-new");
    updateRelationResetButton();
    return;
  }

  scheduleGalleryPreload();

  if (state.galleryJustUnlockedId) {
    galleryButton.classList.add("is-new");
    window.setTimeout(() => {
      galleryButton.classList.remove("is-new");
    }, 4200);
    state.galleryJustUnlockedId = null;
  }

  updateRelationResetButton();
}

function unlockGalleryRoute(routeId) {
  if (!GALLERY_ROUTE_KEYS.includes(routeId)) {
    return false;
  }

  const progress = getGalleryProgress();
  const wasUnlocked = Boolean(progress[routeId]);

  if (!wasUnlocked) {
    progress[routeId] = true;
    state.galleryJustUnlockedId = routeId;
    state.galleryUnlockedSession = true;
    state.galleryProgress = progress;
    galleryPreloadQueued = false;
    saveGalleryProgress(progress);
  }

  updateGalleryButton();
  return !wasUnlocked;
}

function unlockGallery() {
  return unlockGalleryRoute("normalWin");
}

function resetGalleryProgress() {
  try {
    window.localStorage.removeItem(GALLERY_PROGRESS_KEY);
    window.localStorage.removeItem("jankenGalleryProgressV1");
    window.localStorage.removeItem("jankenGalleryProgressV2");
    window.localStorage.removeItem("jankenGalleryProgressV3");
    window.localStorage.removeItem("jankenGalleryUnlocked");
    window.localStorage.removeItem(POST_TRUE_DRAW_RECORD_KEY);
  } catch (error) {
    // Ignore storage errors; debug reset should never stop the game.
  }

  state.galleryProgress = getDefaultGalleryProgress();
  state.galleryUnlockedSession = false;
  state.galleryJustUnlockedId = null;
  state.trueEndingQueued = false;
  state.showingTrueEnding = false;
  state.postTrueRecordAnnounced = false;
  state.postTrueNewRecordShownFor = 0;
  closeGallery(false);
  galleryPreloadQueued = false;
  if (galleryButton) {
    galleryButton.hidden = true;
    galleryButton.classList.remove("is-new");
  }
  if (relationResetButton) {
    relationResetButton.hidden = true;
  }
  updateGalleryButton();
}

function lockGallery() {
  resetGalleryProgress();
}

function updateGalleryProgressText() {
  const unlockedCount = GALLERY_ROUTE_KEYS.filter((key) => getGalleryProgress()[key]).length;
  const percent = getGalleryCompletionPercent();
  const text = `CLEAR RATE ${unlockedCount} / ${GALLERY_ROUTE_KEYS.length}  GALLERY ${percent}%`;

  if (galleryProgress) {
    galleryProgress.textContent = text;
  }

  return text;
}

function renderGalleryItem() {
  if (!galleryImage || !galleryCaption || !galleryCounter || !galleryItems.length) {
    return;
  }

  const item = galleryItems[galleryIndex];
  const requestId = ++galleryRequestId;
  const unlocked = isGalleryItemUnlocked(item);
  const progressText = updateGalleryProgressText();
  galleryCounter.textContent = `${galleryIndex + 1} / ${galleryItems.length}   ${getGalleryCompletionPercent()}%`;
  galleryImage.hidden = true;
  galleryImage.removeAttribute("src");
  galleryImage.dataset.type = "";

  if (galleryLocked) {
    galleryLocked.hidden = unlocked;
    galleryLocked.textContent = unlocked ? "" : item.lockedTitle || "LOCKED";
  }

  if (!unlocked) {
    galleryCaption.textContent = `${item.lockedTitle || "LOCKED"} / ${item.unlockText || "条件未達成"} / ${progressText}`;
    return;
  }

  const src = item.src;
  const fallbackSrc = item.fallbackSrc || sceneImages.playerWin;
  galleryCaption.textContent = item.id === "trueEnd"
    ? `${item.title} / TAP IMAGE TO REPLAY TRUE END`
    : `${item.title} / UNLOCKED`;

  preloadImage(src).then((img) => {
    if (requestId !== galleryRequestId) {
      return;
    }

    const finalSrc = img ? src : fallbackSrc;
    if (!img) {
      console.warn("Gallery image fallback:", src);
    }

    preloadImage(finalSrc).then((fallbackImg) => {
      if (requestId !== galleryRequestId) {
        return;
      }

      if (!fallbackImg) {
        galleryCaption.textContent = `${item.title} / COMING SOON`;
        galleryImage.hidden = true;
        if (galleryLocked) {
          galleryLocked.hidden = false;
          galleryLocked.textContent = "COMING SOON";
        }
        return;
      }

      if (galleryLocked) {
        galleryLocked.hidden = true;
      }
      galleryImage.src = finalSrc;
      galleryImage.alt = item.title;
      galleryImage.dataset.type = item.type;
      galleryImage.dataset.itemId = item.id || "";
      galleryImage.hidden = false;
    });
  });
}

function openGallery() {
  if (
    !isGalleryButtonAvailable() ||
    !galleryOverlay ||
    !startButton ||
    startButton.hidden ||
    state.started ||
    state.busy ||
    state.ended ||
    (sceneOverlay && !sceneOverlay.hidden) ||
    (endOverlay && !endOverlay.hidden) ||
    !galleryOverlay.hidden
  ) {
    return;
  }

  galleryIndex = 0;
  galleryOverlay.hidden = false;
  cabinet.classList.add("is-gallery-open");
  startButton.disabled = true;
  if (galleryButton) {
    galleryButton.hidden = true;
    galleryButton.classList.remove("is-new");
  }
  if (relationResetButton) {
    relationResetButton.hidden = true;
  }
  renderGalleryItem();
  AudioManager.playSound("select");
}

function closeGallery(playSound = true) {
  if (!galleryOverlay) {
    return;
  }

  galleryOverlay.hidden = true;
  cabinet.classList.remove("is-gallery-open");
  galleryRequestId += 1;
  if (!state.started && !state.busy && !state.ended) {
    startButton.disabled = false;
  }

  if (playSound) {
    AudioManager.playSound("select");
  }

  if (!state.started && !state.busy && !state.ended && startButton && !startButton.hidden) {
    updateGalleryButton();
  }
}

function moveGallery(step) {
  if (!galleryOverlay || galleryOverlay.hidden || !galleryItems.length) {
    return;
  }

  galleryIndex = (galleryIndex + step + galleryItems.length) % galleryItems.length;
  renderGalleryItem();
  AudioManager.playSound("select");
}

function replayTrueEndFromGallery() {
  const item = galleryItems[galleryIndex];
  if (!item || item.id !== "trueEnd" || !isGalleryItemUnlocked(item) || state.started || state.busy || state.ended) {
    return;
  }

  closeGallery(false);
  startButton.disabled = true;
  showTrueEnding({ replay: true }).then(() => {
    if (!state.started && !state.busy && !state.ended) {
      startButton.disabled = false;
      updateGalleryButton();
    }
  });
}

function toggleDebugMode(force) {
  const shouldShow = typeof force === "boolean" ? force : !state.debugPanelVisible;
  state.debugPanelVisible = shouldShow;
  cabinet.classList.toggle("is-debug", shouldShow);

  if (shouldShow) {
    createDebugPanel();
  }

  const panel = document.querySelector("#debugPanel");
  if (panel) {
    panel.hidden = !shouldShow;
  }
}

function createDebugPanel() {
  if (document.querySelector("#debugPanel")) {
    return;
  }

  const panel = document.createElement("div");
  panel.id = "debugPanel";
  panel.className = "debug-panel";
  panel.setAttribute("aria-label", "Debug panel");

  const header = document.createElement("div");
  header.className = "debug-header";

  const title = document.createElement("strong");
  title.textContent = "DEBUG";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "debug-close-button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "デバッグパネルを閉じる");
  closeButton.addEventListener("click", () => {
    toggleDebugMode(false);
  });

  header.append(title, closeButton);
  panel.append(header);

  [
    ["DRAW 4", () => debugSetDraw(4)],
    ["DRAW 9", () => debugSetDraw(9)],
    ["DRAW 14", () => debugSetDraw(14)],
    ["FORCE WARNING", debugForceWarning],
    ["FORCE CHANCE", debugForceChance],
    ["FORCE FINAL", debugForceFinal],
    ["PSYCH CUTIN", () => triggerCinematicCutIn("psych")],
    ["CHANCE CUTIN", () => triggerCinematicCutIn("chance")],
    ["FINAL CUTIN", () => triggerCinematicCutIn("final")],
    ["NEXT PLAYER WIN", () => debugForceNextResult("win")],
    ["NEXT CPU WIN", () => debugForceNextResult("lose")],
    ["UNLOCK NORMAL", () => debugUnlockGalleryRoute("normalWin")],
    ["UNLOCK GAME OVER", () => debugUnlockGalleryRoute("gameOver")],
    ["UNLOCK CHANCE", () => debugUnlockGalleryRoute("chanceWin")],
    ["UNLOCK FINAL", () => debugUnlockGalleryRoute("finalWin")],
    ["RESET GALLERY", resetGalleryProgress],
    ["SHOW TRUE END", () => showTrueEnding({ replay: true })],
    ["FORCE ROUTE NORMAL WIN", () => debugForceRouteWin("normalWin")],
    ["FORCE ROUTE CHANCE WIN", () => debugForceRouteWin("chanceWin")],
    ["FORCE ROUTE FINAL WIN", () => debugForceRouteWin("finalWin")],
    ["RESET DEBUG", debugReset],
  ].forEach(([label, handler]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", handler);
    panel.append(button);
  });

  document.body.append(panel);
}

function debugSetDraw(value) {
  state.draw = value;
  state.drawWarningShown = value >= DRAW_WARNING_COUNT;
  updateScore();
  showMessage(`DEBUG DRAW ${value}`);
}

function debugForceWarning() {
  state.draw = Math.max(state.draw, DRAW_WARNING_COUNT);
  state.drawWarningShown = true;
  updateScore();
  setCharacter("worried");
  showMessage(randomLine(DRAW_WARNING_LINES), "is-result is-draw player-draw is-draw-warning");
}

function debugForceChance() {
  state.draw = Math.max(state.draw, CHANCE_DRAW_COUNT);
  state.drawWarningShown = true;
  state.finalConfirmHand = null;
  state.routeReachedChance = true;
  setChanceMode(true);
  updateScore();
  setCharacter("excited");
  triggerCinematicCutIn("chance");
  AudioManager.switchBgm("chance");
  showMessage(randomLine(CHANCE_ENTRY_LINES), "is-result is-draw player-draw is-chance-entry");
}

function debugForceFinal() {
  state.draw = Math.max(state.draw, FINAL_DRAW_COUNT);
  state.drawWarningShown = true;
  state.finalConfirmHand = null;
  state.routeReachedChance = true;
  state.routeReachedFinal = true;
  setChanceMode(true);
  setFinalJankenMode(true);
  updateScore();
  setCharacter("excited");
  triggerCinematicCutIn("final");
  AudioManager.switchBgm("final");
  showMessage(randomLine(FINAL_JANKEN_ENTRY_LINES), "is-result is-draw player-draw is-final-entry");
}

function debugForceNextResult(result) {
  state.debugForceNextResult = result;
  showMessage(result === "win" ? "DEBUG NEXT WIN" : "DEBUG NEXT LOSE");
}

function debugUnlockGalleryRoute(routeId) {
  unlockGalleryRoute(routeId);
  showMessage(`DEBUG UNLOCK ${routeId}`);
  updateGalleryButton();
}

function debugForceRouteWin(routeId) {
  state.routeReachedChance = routeId === "chanceWin" || routeId === "finalWin";
  state.routeReachedFinal = routeId === "finalWin";
  unlockGalleryRoute(routeId);

  if (isGalleryComplete() && !getGalleryProgress().trueEndSeen) {
    state.trueEndingQueued = true;
  }

  showMessage(`DEBUG ROUTE ${routeId}`);
  updateGalleryButton();
}

function debugReset() {
  state.debugForceNextResult = null;
  state.finalConfirmHand = null;
  resetScore();
  resetRoundView();
  if (state.started && !state.ended) {
    AudioManager.switchBgm("normal");
    showMessage("DEBUG RESET");
    setButtonsEnabled(!state.busy);
  } else {
    showMessage("");
  }
}

function trackDebugToggleTap() {
  const now = Date.now();
  state.debugSoundTaps = state.debugSoundTaps.filter((time) => now - time < 1800);
  state.debugSoundTaps.push(now);

  if (state.debugSoundTaps.length >= 5) {
    state.debugSoundTaps = [];
    toggleDebugMode();
    return true;
  }

  return false;
}

function clearChoicePressState(targetButton = null) {
  const buttons = targetButton ? [targetButton] : choiceButtons;
  buttons.forEach((button) => {
    button.classList.remove("is-pressing");
  });
}

function setSelectedButton(hand) {
  choiceButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.hand === hand);
  });
}

function updateScore() {
  winCount.textContent = state.win;
  loseCount.textContent = state.lose;
  drawCount.textContent = state.draw;
}

function setChanceMode(enabled) {
  state.chance = enabled;
  cabinet.classList.toggle("is-chance", enabled);

  if (!enabled) {
    stopChanceMessages();
  }
}

function setFinalJankenMode(enabled) {
  state.finalJanken = enabled;
  cabinet.classList.toggle("is-final-janken", enabled);

  if (!enabled) {
    state.finalConfirmHand = null;
    cabinet.classList.remove("is-final-confirm");
  }
}

function setStageMood(mood) {
  cabinet.classList.remove(
    "is-calling",
    "is-result",
    "is-win",
    "is-lose",
    "is-draw",
    "player-win",
    "player-lose",
    "player-draw",
    "is-double",
    "is-chance-entry",
    "is-draw-warning",
    "is-final-entry",
    "is-final-confirm"
  );

  if (mood) {
    cabinet.classList.add(...mood.split(" "));
  }
}

function scoreMood() {
  const diff = state.win - state.lose;

  if (state.finalJanken) {
    return "final";
  }

  if (state.chance) {
    return "chance";
  }

  if (diff >= 4) {
    return "playerLeadBig";
  }

  if (diff >= 2) {
    return "playerLeadSmall";
  }

  if (diff <= -4) {
    return "cpuLeadBig";
  }

  if (diff <= -2) {
    return "cpuLeadSmall";
  }

  return "even";
}

function currentDialogue() {
  return dialogue[scoreMood()] || dialogue.even;
}

function randomLine(lines) {
  const cleanLines = lines.filter((line) => line && line.trim());

  if (!cleanLines.length) {
    return "いくよ！";
  }

  const candidates = cleanLines.length > 1 ? cleanLines.filter((line) => line !== state.lastLine) : cleanLines;
  const line = candidates[Math.floor(Math.random() * candidates.length)];
  state.lastLine = line;
  return line;
}

function getRelationshipPhase() {
  const progress = getGalleryProgress();

  if (progress.trueEndSeen) {
    return "afterTrueEnd";
  }

  if (state.finalJanken || state.draw >= FINAL_DRAW_COUNT) {
    return "final";
  }

  if (state.draw >= CHANCE_DRAW_COUNT || getNextTargetRoute() === "finalWin") {
    return "near";
  }

  if (state.draw >= DRAW_WARNING_COUNT || getNextTargetRoute() === "chanceWin") {
    return "aware";
  }

  return "battle";
}

function routeHintLinesForCurrentTarget() {
  const phase = getRelationshipPhase();
  const targetRoute = getNextTargetRoute();

  if (phase === "afterTrueEnd") {
    return ["また同じ手、出せるかな。", "今度は勝負じゃなくてもいいよ。", "手、見なくてもわかるかも。", "また、あいこから始めよ？"];
  }

  if (targetRoute === "finalWin" || phase === "final" || phase === "near") {
    return ["まだ終わらせたくないかも。", "同じ手なら、もう少し続くよ。", "私の手、ちゃんと見てて。", "気持ち、読める？"];
  }

  if (targetRoute === "chanceWin" || phase === "aware") {
    return ["同じ手なら、まだ続くよ。", "合わせてくれる？", "私の手、見ててね。", "もう少しだけ続けたいかも。"];
  }

  return [];
}

function postTrueStartLine() {
  const record = getPostTrueDrawRecord();

  if (record > 0) {
    return `今のあいこ記録は${record}回だよ。\n今日は超えられるかな？`;
  }

  return "今度は勝負じゃなくて、\nどこまであいこできるか試してみよ？";
}

function showPostTrueStartMessage() {
  if (!getGalleryProgress().trueEndSeen || state.postTrueRecordAnnounced) {
    return false;
  }

  state.postTrueRecordAnnounced = true;
  setCharacter("happy");
  showMessage(postTrueStartLine(), undefined, {
    typewriter: true,
    maxDuration: 900,
  });
  return true;
}

function checkPostTrueDrawRecord() {
  if (!getGalleryProgress().trueEndSeen) {
    return false;
  }

  const currentDraws = state.draw;
  const record = getPostTrueDrawRecord();

  if (currentDraws <= record) {
    return false;
  }

  savePostTrueDrawRecord(currentDraws);
  state.postTrueNewRecordShownFor = currentDraws;
  return true;
}

function postTrueNewRecordLine() {
  const currentDraws = state.draw;

  if (currentDraws >= 20) {
    return `すごい……${currentDraws}回目。\nもう言わなくても合うね。`;
  }

  if (currentDraws >= 15) {
    return `${currentDraws}回目のあいこ……\nまだ一緒にいられるね。`;
  }

  if (currentDraws >= 10) {
    return `新記録、${currentDraws}回だよ。\n気持ち、合ってきたね。`;
  }

  return `新記録！ ${currentDraws}回目のあいこだよ。`;
}

function lineFor(scene) {
  const set = currentDialogue();
  const lines = [...(set[scene] || dialogue.even[scene] || [])];

  if ((state.win >= 8 || state.lose >= 8) && scene === "idle") {
    lines.push(...endgameLines);
  }

  if (scene === "idle" && Math.random() < 0.34) {
    lines.push(...routeHintLinesForCurrentTarget());
  }

  return randomLine(lines);
}

function handName(handKey) {
  return HAND_NAMES[handKey] || hands[handKey]?.label || "?";
}

function predictionLinesForHand(handKey) {
  const name = handName(handKey);
  const phase = getRelationshipPhase();

  if (phase === "afterTrueEnd") {
    return [
      `次は${name}。……わかるよね？`,
      `${name}で待ってるね。`,
      `同じ気持ちなら、${name}だよ。`,
      `言わなくても、${name}って伝わるかな。`,
      `また、${name}で重なれたら嬉しいな。`,
    ];
  }

  if (phase === "final") {
    return [
      `次は${name}。……たぶん本当だよ。`,
      `${name}で来てくれたら、まだ続くかも。`,
      `最後くらい、${name}で合わせてみる？`,
      `終わらせたくないなら、${name}を見て。`,
    ];
  }

  if (phase === "near") {
    return [
      `次は${name}にしようかな。`,
      `${name}……って言ったら、信じる？`,
      `私の手、${name}に見える？`,
      `${name}で来たら、気が合うかも。`,
    ];
  }

  if (phase === "aware") {
    return [
      `${name}を出すかも？`,
      `次は${name}……かもしれないよ。`,
      `${name}って、少し気になるかも。`,
      "私の手、ちゃんと見ててね。",
    ];
  }

  return [`次は${name}でいくよ？`, `${name}を出すかも？`, "読めるかな？", "次は負けないよ。"];
}

function requestLinesForHand(handKey) {
  const name = handName(handKey);
  const phase = getRelationshipPhase();

  if (phase === "afterTrueEnd") {
    return [
      `${name}で来て。私も、たぶん同じだから。`,
      `同じ手で来てくれる？ ${name}がいいな。`,
      `${name}で会えたら、嬉しい。`,
      `また一緒に、${name}から始めよ？`,
    ];
  }

  if (phase === "final") {
    return [`${name}で来てくれる？`, `まだ続けたいなら、${name}を出して。`, `${name}なら、もう少し一緒にいられるかも。`];
  }

  if (phase === "near") {
    return [`${name}、見たいな。`, `次、${name}で来てみる？`, "同じ手でも、いいかも。"];
  }

  if (phase === "aware") {
    return [`${name}を出してほしいな♪`, `次は${name}で来て？`, `${name}、見てみたいな。`];
  }

  return [`${name}で来る？`, `${name}を出すのかな？`, "さあ、何を出す？"];
}

function quietPredictionLinesForHand(handKey) {
  const name = handName(handKey);
  const phase = getRelationshipPhase();

  if (phase === "afterTrueEnd") {
    return [
      `${name}……だよね？`,
      `言わなくても、${name}かなって思った。`,
      `同じなら、${name}で。`,
      `${name}で重なれたら嬉しいな。`,
    ];
  }

  if (phase === "final") {
    return [
      `${name}、見てて。`,
      `たぶん、${name}。`,
      `${name}で来たら……続くかも。`,
      `終わらせたくないなら、${name}。`,
    ];
  }

  if (phase === "near") {
    return [`${name}にしようかな。`, `${name}って言ったら、信じる？`, `私の手、${name}に見える？`];
  }

  if (phase === "aware") {
    return [`${name}かも。`, `次、${name}かな。`, "私の手、見ててね。"];
  }

  return ["次はどうしようかな。", "読める？", `${name}かもね。`];
}

function psychEventLine(event) {
  if (!event) {
    return "";
  }

  if (event.presentation === "quiet") {
    const hand = event.type === "predict"
      ? event.predictedHand || event.cpuHand
      : event.requestedHand || event.cpuHand;
    return randomLine(quietPredictionLinesForHand(hand));
  }

  if (event.type === "predict") {
    return randomLine(predictionLinesForHand(event.predictedHand || event.cpuHand));
  }

  return randomLine(requestLinesForHand(event.requestedHand || event.cpuHand));
}

function getPredictionHonestyRate() {
  if (state.finalJanken) {
    return 0.58;
  }

  const progress = getGalleryProgress();
  const targetRoute = getNextTargetRoute();
  const trueEndSeen = progress.trueEndSeen === true;

  if (trueEndSeen) {
    if (state.draw >= 10) {
      return 0.98;
    }

    if (state.draw >= 5) {
      return 0.94;
    }

    return 0.88;
  }

  if (targetRoute === "normalWin" || targetRoute === "gameOver") {
    if (state.draw >= 5) {
      return 0.42;
    }

    return 0.28;
  }

  if (targetRoute === "chanceWin") {
    if (state.draw >= 8) {
      return 0.84;
    }

    if (state.draw >= 5) {
      return 0.68;
    }

    return 0.5;
  }

  if (targetRoute === "finalWin") {
    if (state.draw >= 12) {
      return 0.96;
    }

    if (state.draw >= 10) {
      return 0.9;
    }

    if (state.draw >= 8) {
      return 0.78;
    }

    return 0.64;
  }

  return 0.45;
}

function getPsychEventChance() {
  if (state.finalJanken) {
    return 0;
  }

  const progress = getGalleryProgress();
  const targetRoute = getNextTargetRoute();
  const trueEndSeen = progress.trueEndSeen === true;

  if (trueEndSeen) {
    if (state.draw >= 10) {
      return 0.62;
    }

    if (state.draw >= 5) {
      return 0.5;
    }

    return 0.36;
  }

  if (targetRoute === "normalWin" || targetRoute === "gameOver") {
    if (state.draw >= 5) {
      return 0.16;
    }

    return 0.08;
  }

  if (targetRoute === "chanceWin") {
    if (state.draw >= 8) {
      return 0.38;
    }

    if (state.draw >= 5) {
      return 0.28;
    }

    return 0.16;
  }

  if (targetRoute === "finalWin") {
    if (state.draw >= 12) {
      return 0.52;
    }

    if (state.draw >= 10) {
      return 0.44;
    }

    if (state.draw >= 8) {
      return 0.34;
    }

    return 0.22;
  }

  return PSYCH_EVENT_CHANCE;
}

function getPsychEventType() {
  const progress = getGalleryProgress();

  if (progress.trueEndSeen) {
    return Math.random() < 0.85 ? "predict" : "request";
  }

  if (state.draw >= 10) {
    return Math.random() < 0.78 ? "predict" : "request";
  }

  if (state.draw >= 5) {
    return Math.random() < 0.62 ? "predict" : "request";
  }

  return Math.random() < 0.5 ? "predict" : "request";
}

function getPsychPresentation() {
  const progress = getGalleryProgress();

  if (progress.trueEndSeen) {
    return Math.random() < 0.86 ? "quiet" : "cinematic";
  }

  if (state.draw >= 12) {
    return Math.random() < 0.72 ? "quiet" : "cinematic";
  }

  if (state.draw >= 10) {
    return Math.random() < 0.62 ? "quiet" : "cinematic";
  }

  if (state.draw >= 5) {
    return Math.random() < 0.42 ? "quiet" : "cinematic";
  }

  return "cinematic";
}

function maybeStartPsychEvent() {
  if (!state.started || state.busy || state.ended || state.finalJanken || state.psychEvent) {
    return false;
  }

  if (Math.random() >= getPsychEventChance()) {
    return false;
  }

  const type = getPsychEventType();
  const hintHand = randomCpuHand();
  const shouldBeHonest = Math.random() < getPredictionHonestyRate();
  const otherHands = Object.keys(hands).filter((key) => key !== hintHand);
  const cpuHand = shouldBeHonest ? hintHand : otherHands[Math.floor(Math.random() * otherHands.length)];
  const predictedHand = hintHand;
  const requestedHand = hintHand;
  const presentation = getPsychPresentation();
  state.psychEvent = { type, cpuHand, predictedHand, requestedHand, presentation };

  setCharacter(type === "predict" ? "smug" : "happy");
  if (presentation === "cinematic") {
    triggerCinematicCutIn("psych");
  } else {
    clearCinematicCutIn();
  }
  showMessage(psychEventLine(state.psychEvent), undefined, {
    typewriter: true,
    maxDuration: presentation === "quiet" ? 520 : 700,
  });
  return true;
}

function showNextInputPrompt() {
  if (showPostTrueStartMessage()) {
    showInputGuideOnce();
    return;
  }

  if (maybeStartPsychEvent()) {
    showInputGuideOnce();
    return;
  }

  if (state.chance) {
    startChanceMessages();
  } else {
    showMessage(lineFor("idle"), undefined, { typewriter: true });
  }

  showInputGuideOnce();
}

function updateCharacterByScore() {
  setCharacter(currentDialogue().image || "normal");
}

function cancelMessageTyping() {
  messageTypingId += 1;
  if (messageTypingTimer) {
    window.clearTimeout(messageTypingTimer);
    messageTypingTimer = null;
  }
}

function shouldPlayTextBlip(char, index) {
  if (!char || /\s/.test(char)) {
    return false;
  }

  if ("。、！？!?…♪・,.:-/".includes(char)) {
    return false;
  }

  return index % 3 === 1;
}

function typeMessage(text, options = {}) {
  cancelMessageTyping();

  const fullText = text || "いくよ！";
  const typingId = messageTypingId;
  const maxDuration = options.maxDuration ?? 700;
  const baseSpeed = options.speed ?? (fullText.length > 18 ? 16 : 22);
  const speed = Math.max(10, Math.min(baseSpeed, Math.floor(maxDuration / Math.max(fullText.length, 1))));
  const sound = options.sound !== false;
  let index = 0;

  message.textContent = "";

  function step() {
    if (typingId !== messageTypingId) {
      return;
    }

    index += 1;
    message.textContent = fullText.slice(0, index);

    const char = fullText[index - 1];
    if (sound && shouldPlayTextBlip(char, index)) {
      AudioManager.playSound("textBlip");
    }

    if (index < fullText.length) {
      messageTypingTimer = window.setTimeout(step, speed);
    } else {
      messageTypingTimer = null;
    }
  }

  step();
}

function setMessageLengthClass(text) {
  if (!message) {
    return;
  }

  const plainText = String(text || "").replace(/\n/g, "");
  message.classList.toggle("is-long-message", plainText.length >= 18);
  message.classList.toggle("is-very-long-message", plainText.length >= 28);
}

function showMessage(text, mood, options = {}) {
  message.textContent = text || "いくよ！";
  setMessageLengthClass(text || "いくよ！");
  setStageMood(mood);

  if (mood === "is-calling") {
    cancelMessageTyping();
    restartClassAnimation(message, "is-message-pop");
    return;
  }

  cancelClassAnimation(message, "is-message-pop");

  if (options.typewriter) {
    typeMessage(text, options);
    return;
  }

  cancelMessageTyping();
}

function stopChanceMessages() {
  if (state.chanceMessageTimer) {
    window.clearInterval(state.chanceMessageTimer);
    state.chanceMessageTimer = null;
  }
}

async function showIntroThenReady() {
  const flowId = state.flowId;
  state.busy = true;
  stopChanceMessages();
  setButtonsEnabled(false);
  resetRoundView();
  await showIllustrationScene("intro", randomLine(SCENE_INTRO_LINES), 3500, "happy");

  if (flowId !== state.flowId || !state.started || state.ended) {
    return;
  }

  state.busy = false;
  updateCharacterByScore();
  if (showPostTrueStartMessage()) {
    setButtonsEnabled(true);
    showInputGuideOnce();
    return;
  }

  if (maybeStartPsychEvent()) {
    setButtonsEnabled(true);
    showInputGuideOnce();
    return;
  }
  showMessage("えらべ！");
  setButtonsEnabled(true);
  showInputGuideOnce();
}

function startChanceMessages() {
  if ((!state.chance && !state.finalJanken) || state.busy || state.ended || !state.started) {
    return;
  }

  stopChanceMessages();
  if (state.finalJanken) {
    showMessage(randomLine(FINAL_JANKEN_IDLE_LINES), undefined, { typewriter: true });
  } else {
    state.chanceMessageIndex %= CHANCE_MESSAGES.length;
    showMessage(lineFor("idle"), undefined, { typewriter: true });
  }

  state.chanceMessageTimer = window.setInterval(() => {
    if ((!state.chance && !state.finalJanken) || state.busy || state.ended || !state.started) {
      stopChanceMessages();
      return;
    }

    if (state.finalJanken) {
      showMessage(randomLine(FINAL_JANKEN_IDLE_LINES), undefined, { typewriter: true });
    } else {
      state.chanceMessageIndex = (state.chanceMessageIndex + 1) % CHANCE_MESSAGES.length;
      showMessage(lineFor("idle"), undefined, { typewriter: true });
    }
  }, 2000);
}

async function showFinalJankenEntry() {
  state.busy = true;
  setButtonsEnabled(false);
  stopChanceMessages();
  setSelectedButton();

  setCharacter("excited");
  triggerCinematicCutIn("final");
  AudioManager.playSound("chance");
  AudioManager.switchBgm("final");
  showMessage("ファイナルじゃんけん！", "is-result is-draw player-draw is-final-entry");
  await wait(760);

  if (!state.started || state.ended || !state.finalJanken) {
    return;
  }

  showMessage("次に勝った方が勝ち！", "is-result is-final-entry");
  await wait(760);

  if (!state.started || state.ended || !state.finalJanken) {
    return;
  }

  setCharacter("excited");
  renderHand(playerHand, null);
  renderHand(cpuHand, null);
  setResultLabel();
  state.finalConfirmHand = null;
  showMessage("えらべ！");
  state.busy = false;
  setButtonsEnabled(true);
}

function clearResultLabelTimer() {
  if (resultLabelTimer) {
    window.clearTimeout(resultLabelTimer);
    resultLabelTimer = null;
  }
}

function clearResultLabel() {
  clearResultLabelTimer();
  resultLabel.classList.remove("is-visible", "is-win", "is-lose", "is-draw", "is-double", "is-final", "is-hiding");
  resultLabel.textContent = "";
}

function setResultLabel(result, bonus = 1, isFinal = false) {
  clearResultLabelTimer();
  resultLabel.classList.remove("is-visible", "is-win", "is-lose", "is-draw", "is-double", "is-final", "is-hiding");

  if (!result) {
    resultLabel.textContent = "";
    return;
  }

  const label = result.toUpperCase();
  const showDouble = !isFinal && bonus > 1 && result !== "draw";
  const showFinal = isFinal && result !== "draw";

  if (showFinal) {
    resultLabel.textContent = `FINAL ${label}`;
  } else if (showDouble) {
    resultLabel.textContent = `${label} +2`;
  } else {
    resultLabel.textContent = label;
  }

  resultLabel.classList.add("is-visible", `is-${result}`);

  if (showFinal) {
    resultLabel.classList.add("is-final");
  } else if (showDouble) {
    resultLabel.classList.add("is-double");
  }

  const holdMs = showFinal ? 1650 : showDouble ? 1300 : 1000;
  resultLabelTimer = window.setTimeout(() => {
    resultLabel.classList.add("is-hiding");
    resultLabelTimer = window.setTimeout(() => {
      clearResultLabel();
    }, 260);
  }, holdMs);
}

function collectImageSources(sourceMap) {
  return [
    ...new Set(
      Object.values(sourceMap)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter(Boolean)
    ),
  ];
}

function preloadImage(src) {
  if (!src) {
    return Promise.resolve(null);
  }

  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const promise = new Promise((resolve) => {
    const img = new Image();

    img.onload = async () => {
      try {
        if (img.decode) {
          await img.decode();
        }
      } catch (error) {
        // Decoding can fail on some browsers even after load; keep the loaded image.
      }

      resolve(img);
    };

    img.onerror = () => {
      console.warn("Image not found:", src);
      resolve(null);
    };

    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

function preloadImages(sourceMap) {
  collectImageSources(sourceMap).forEach((src) => {
    preloadImage(src);
  });
}

function preloadCharacterImages() {
  preloadImages(characterImages);
}

function preloadSceneImages() {
  preloadImages(sceneImages);
}

function preloadStartupAssets() {
  if (startupAssetsReady) {
    return startupAssetsReady;
  }

  const sources = [
    sceneImages.intro,
    characterImages.normal,
    characterImages.happy,
    hands.rock.image,
    hands.scissors.image,
    hands.paper.image,
  ].filter(Boolean);

  startupAssetsReady = Promise.allSettled(sources.map((src) => preloadImage(src)));
  return startupAssetsReady;
}

function imageSourceFor(sourceMap, key, fallbackKey = "normal") {
  const value = sourceMap[key] || sourceMap[fallbackKey];
  return Array.isArray(value) ? value[0] : value;
}

function setCharacter(mood) {
  const characterMood = characterImages[mood] ? mood : "normal";
  const src = imageSourceFor(characterImages, characterMood);
  const requestId = ++characterRequestId;

  characterFrame.dataset.mood = characterMood;

  preloadImage(src).then((img) => {
    if (requestId !== characterRequestId) {
      return;
    }

    if (!img) {
      useFallbackCharacter();
      return;
    }

    characterImage.src = src;
    characterImage.hidden = false;
    characterFallback.hidden = true;
  });
}

function setSceneCharacter(mood) {
  const requestId = ++sceneCharacterRequestId;
  const src = imageSourceFor(characterImages, mood);
  sceneOverlay.classList.remove("has-illustration");
  sceneIllustration.hidden = true;

  preloadImage(src).then((img) => {
    if (requestId !== sceneCharacterRequestId) {
      return;
    }

    if (!img) {
      useFallbackSceneCharacter();
      return;
    }

    sceneCharacterImage.src = src;
    sceneCharacterImage.hidden = false;
    sceneCharacterFallback.hidden = true;
  });
}

function useFallbackCharacter() {
  characterFrame.dataset.mood = "fallback";
  characterImage.hidden = true;
  characterFallback.hidden = false;
}

function useFallbackSceneCharacter() {
  sceneCharacterImage.hidden = true;
  sceneCharacterFallback.hidden = false;
}

function fallbackSceneIllustration() {
  const mood = sceneOverlay.dataset.fallbackMood || "normal";
  sceneOverlay.classList.remove("has-illustration");
  sceneIllustration.hidden = true;
  setSceneCharacter(mood);
}

function setSceneIllustration(sceneType, fallbackMood = "normal", fallbackSceneType = null) {
  const src = imageSourceFor(sceneImages, sceneType, sceneType);
  const fallbackSrc = fallbackSceneType ? imageSourceFor(sceneImages, fallbackSceneType, "playerWin") : null;
  const requestId = ++sceneIllustrationRequestId;
  sceneOverlay.dataset.fallbackMood = fallbackMood;

  if (!src) {
    fallbackSceneIllustration();
    return;
  }

  sceneOverlay.classList.add("has-illustration");
  sceneCharacterImage.hidden = true;
  sceneCharacterFallback.hidden = true;

  preloadImage(src).then((img) => {
    if (requestId !== sceneIllustrationRequestId) {
      return;
    }

    if (!img) {
      if (fallbackSrc && fallbackSrc !== src) {
        console.warn("Scene image fallback:", src);
        preloadImage(fallbackSrc).then((fallbackImg) => {
          if (requestId !== sceneIllustrationRequestId) {
            return;
          }

          if (!fallbackImg) {
            fallbackSceneIllustration();
            return;
          }

          sceneIllustration.src = fallbackSrc;
          sceneIllustration.hidden = false;
        });
        return;
      }

      fallbackSceneIllustration();
      return;
    }

    sceneIllustration.src = src;
    sceneIllustration.hidden = false;
  });
}

function cancelSceneTyping() {
  if (sceneTypingTimer) {
    window.clearTimeout(sceneTypingTimer);
    sceneTypingTimer = null;
  }

  sceneTypingId += 1;

  if (sceneTypingResolve) {
    const resolve = sceneTypingResolve;
    sceneTypingResolve = null;
    resolve();
  }
}

function setSceneNextVisible(visible) {
  if (!sceneNextButton) {
    return;
  }

  sceneNextButton.hidden = !visible;
}

function resetSceneDialogState() {
  cancelSceneTyping();
  if (sceneAdvanceResolve) {
    const resolve = sceneAdvanceResolve;
    sceneAdvanceResolve = null;
    resolve();
  }
  sceneDialogActive = false;
  sceneCurrentFullText = "";
  sceneCurrentDone = false;
  setSceneNextVisible(false);
}

function typeSceneLine(text) {
  return new Promise((resolve) => {
    if (!sceneMessage) {
      resolve();
      return;
    }

    cancelSceneTyping();

    const fullText = String(text || "");
    const currentId = sceneTypingId;
    const speed = fullText.length > 28 ? 16 : 22;
    let index = 0;

    sceneTypingResolve = resolve;
    sceneCurrentFullText = fullText;
    sceneCurrentDone = false;
    sceneMessage.textContent = "";
    setSceneNextVisible(false);

    function finish() {
      if (sceneTypingResolve === resolve) {
        sceneTypingResolve = null;
      }
      sceneTypingTimer = null;
      sceneCurrentDone = true;
      setSceneNextVisible(true);
      resolve();
    }

    function tick() {
      if (currentId !== sceneTypingId) {
        return;
      }

      index += 1;
      sceneMessage.textContent = fullText.slice(0, index);

      const char = fullText[index - 1];
      if (index % 2 === 0 && char && ![" ", "　", "\n", "。", "、", "…"].includes(char)) {
        AudioManager.playSound("textBlip");
      }

      if (index >= fullText.length) {
        finish();
        return;
      }

      sceneTypingTimer = window.setTimeout(tick, speed);
    }

    tick();
  });
}

function waitForSceneAdvance() {
  return new Promise((resolve) => {
    sceneAdvanceResolve = resolve;
  });
}

function advanceSceneDialog(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!sceneDialogActive || !sceneOverlay || sceneOverlay.hidden) {
    return;
  }

  if (!sceneCurrentDone) {
    if (sceneTypingTimer) {
      window.clearTimeout(sceneTypingTimer);
      sceneTypingTimer = null;
    }
    sceneTypingId += 1;
    sceneMessage.textContent = sceneCurrentFullText;
    sceneCurrentDone = true;
    setSceneNextVisible(true);

    if (sceneTypingResolve) {
      const resolve = sceneTypingResolve;
      sceneTypingResolve = null;
      resolve();
    }
    return;
  }

  if (sceneAdvanceResolve) {
    const resolve = sceneAdvanceResolve;
    sceneAdvanceResolve = null;
    setSceneNextVisible(false);
    resolve();
  }
}

async function playSceneDialog(lines) {
  const sequence = lines.filter(Boolean);

  for (const line of sequence.length ? sequence : [""]) {
    await typeSceneLine(line);
    if (!sceneDialogActive) {
      break;
    }
    await waitForSceneAdvance();
    if (!sceneDialogActive) {
      break;
    }
  }
}

async function showCharacterScene(mood, text, duration = 2200) {
  stopChanceMessages();
  setButtonsEnabled(false);
  setSceneCharacter(mood);
  sceneMessage.textContent = text || "またね！";
  sceneOverlay.hidden = false;
  cabinet.classList.add("is-scene");

  await wait(duration);

  sceneOverlay.hidden = true;
  cabinet.classList.remove("is-scene");
}

async function showIllustrationScene(sceneType, text, duration = 3500, fallbackMood = "normal", fallbackSceneType = null) {
  await showSceneSequence({
    sceneType,
    fallbackSceneType,
    mood: fallbackMood,
    lines: [text || ""],
    duration,
    autoAdvance: true,
  });
}

async function showSceneSequence({
  sceneType,
  fallbackSceneType = "playerWin",
  mood = "happy",
  lines = [],
  duration = 2400,
  autoAdvance = false,
}) {
  const sequenceId = ++sceneSequenceId;
  stopChanceMessages();
  setButtonsEnabled(false);
  hideInputGuide(false);
  state.busy = true;
  sceneDialogActive = !autoAdvance;
  setSceneNextVisible(false);
  setSceneIllustration(sceneType, mood, fallbackSceneType);
  sceneOverlay.hidden = false;
  cabinet.classList.add("is-scene", `scene-${sceneType}`);

  try {
    const sequence = lines.filter(Boolean);

    if (autoAdvance) {
      for (const line of sequence.length ? sequence : [""]) {
        cancelSceneTyping();
        sceneMessage.textContent = line;
        setSceneNextVisible(false);
        await wait(duration);
      }
    } else {
      await playSceneDialog(sequence);
    }
  } finally {
    if (sequenceId !== sceneSequenceId) {
      return;
    }

    resetSceneDialogState();
    sceneOverlay.hidden = true;
    sceneOverlay.classList.remove("has-illustration");
    sceneIllustration.hidden = true;
    cabinet.classList.remove("is-scene", `scene-${sceneType}`);
    state.busy = false;
  }
}

function getCurrentClearRoute() {
  if (state.routeReachedFinal || state.finalJanken) {
    return "finalWin";
  }

  if (state.routeReachedChance || state.chance) {
    return "chanceWin";
  }

  return "normalWin";
}

function sceneTypeForClearRoute(routeId) {
  if (routeId === "chanceWin") {
    return "chanceWin";
  }

  if (routeId === "finalWin") {
    return "finalWin";
  }

  return "playerWin";
}

function getProgressAfterRouteUnlock(currentRouteId) {
  return sanitizeGalleryProgress({
    ...getGalleryProgress(),
    [currentRouteId]: true,
  });
}

function getNextGoalHintLine(currentRouteId) {
  const progress = getProgressAfterRouteUnlock(currentRouteId);
  const missingRoutes = getMissingGalleryRoutes(progress);

  if (missingRoutes.length === 0) {
    if (!progress.trueEndSeen) {
      return "思い出は全部そろったね。\nほんとのこと、話してもいい？";
    }

    return "また遊びに来てくれてありがとう。";
  }

  if (missingRoutes.includes("normalWin")) {
    return "あとは普通の勝利も\n見てみて？";
  }

  if (missingRoutes.includes("gameOver")) {
    return "負けた時にも\n別の思い出があるかも。";
  }

  if (missingRoutes.includes("chanceWin")) {
    return "あとはあいこ10回。\nチャンスタイムを見つけて？";
  }

  if (missingRoutes.includes("finalWin")) {
    return "あとはあいこ15回。\n最後の勝負まで来て？";
  }

  return "まだ見ていない思い出が\nどこかにあるよ。";
}

function endingLinesForRoute(routeId) {
  if (state.trueEndingQueued) {
    return TRUE_END_UNLOCK_LINES;
  }

  if (routeId === "chanceWin") {
    return ["チャンスタイムまで\n見つけたんだね。", getNextGoalHintLine(routeId)];
  }

  if (routeId === "finalWin") {
    return ["最後の勝負まで\n来てくれたんだね。", getNextGoalHintLine(routeId)];
  }

  return ["今日はあなたの勝ちだね。", getNextGoalHintLine(routeId)];
}

async function showRouteEnding(routeId) {
  const sceneType = sceneTypeForClearRoute(routeId);
  await showSceneSequence({
    sceneType,
    fallbackSceneType: "playerWin",
    mood: routeId === "finalWin" ? "worried" : "happy",
    lines: endingLinesForRoute(routeId),
  });
}

async function showTrueEnding({ replay = false } = {}) {
  const progress = getGalleryProgress();
  state.showingTrueEnding = true;
  AudioManager.switchBgm("trueEnd");

  if (!replay) {
    progress.trueEndSeen = true;
    state.galleryProgress = progress;
    saveGalleryProgress(progress);
    state.trueEndingQueued = false;
  }

  try {
    AudioManager.playSound("youwin");
    await showSceneSequence({
      sceneType: "trueEnd",
      fallbackSceneType: "playerWin",
      mood: "happy",
      lines: TRUE_END_LINES,
      duration: 2300,
    });
  } finally {
    state.showingTrueEnding = false;
    AudioManager.stopBgm();
    updateGalleryButton();
  }
}

function renderHand(target, handKey) {
  const hand = hands[handKey];
  const handCard = target.closest(".hand-card");
  cancelClassAnimation(handCard, "is-hand-pop-frame");
  cancelClassAnimation(target, "is-hand-pop");
  target.classList.remove("has-hand-image");
  target.replaceChildren();

  if (!hand) {
    target.textContent = "?";
    return;
  }

  const image = document.createElement("img");
  image.src = hand.image;
  image.alt = hand.label;
  image.className = "hand-result-image";
  image.addEventListener(
    "error",
    () => {
      cancelClassAnimation(handCard, "is-hand-pop-frame");
      cancelClassAnimation(target, "is-hand-pop");
      target.classList.remove("has-hand-image");
      target.textContent = hand.symbol;
    },
    { once: true }
  );
  image.addEventListener(
    "animationend",
    () => {
      target.classList.remove("is-hand-pop");
      handCard?.classList.remove("is-hand-pop-frame");
    },
    { once: true }
  );
  target.classList.add("has-hand-image");
  target.append(image);
  restartClassAnimation(handCard, "is-hand-pop-frame");
  restartClassAnimation(target, "is-hand-pop");
}

function resetRoundView() {
  renderHand(playerHand, null);
  renderHand(cpuHand, null);
  setSelectedButton();
  clearResultLabel();
  setStageMood();
  updateCharacterByScore();
}

function randomCpuHand() {
  const keys = Object.keys(hands);
  return keys[Math.floor(Math.random() * keys.length)];
}

function getDrawAssistRate() {
  if (state.finalJanken) {
    return 0;
  }

  const progress = getGalleryProgress();
  const targetRoute = getNextTargetRoute();
  const trueEndSeen = progress.trueEndSeen === true;

  if (trueEndSeen) {
    if (state.draw >= 10) {
      return 0.32;
    }

    if (state.draw >= 5) {
      return 0.22;
    }

    return 0.12;
  }

  if (targetRoute === "normalWin" || targetRoute === "gameOver") {
    return 0;
  }

  if (targetRoute === "chanceWin") {
    if (state.draw >= 9) {
      return 0.22;
    }

    if (state.draw >= 7) {
      return 0.12;
    }

    return 0;
  }

  if (targetRoute === "finalWin") {
    if (state.draw >= 14) {
      return 0.38;
    }

    if (state.draw >= 12) {
      return 0.26;
    }

    if (state.draw >= 10) {
      return 0.16;
    }

    return 0;
  }

  return 0;
}

function cpuHandForForcedResult(player, result) {
  if (result === "win") {
    return hands[player].beats;
  }

  if (result === "lose") {
    return Object.keys(hands).find((key) => hands[key].beats === player) || randomCpuHand();
  }

  return randomCpuHand();
}

function chooseCpuHand(player) {
  if (state.debugForceNextResult) {
    const forcedResult = state.debugForceNextResult;
    state.debugForceNextResult = null;
    state.psychEvent = null;
    return cpuHandForForcedResult(player, forcedResult);
  }

  if (state.psychEvent) {
    const cpuHand = state.psychEvent.cpuHand;
    state.psychEvent = null;
    return cpuHand;
  }

  const drawAssistRate = getDrawAssistRate();
  if (drawAssistRate > 0 && Math.random() < drawAssistRate) {
    return player;
  }

  return randomCpuHand();
}

function judge(player, cpu) {
  if (player === cpu) {
    return "draw";
  }

  return hands[player].beats === cpu ? "win" : "lose";
}

function cpuMoodForResult(result) {
  if (result === "win") {
    return "lose";
  }

  if (result === "lose") {
    return "win";
  }

  return "draw";
}

function resultText(result) {
  if (result === "win") {
    return lineFor("cpuLose");
  }

  if (result === "lose") {
    return lineFor("cpuWin");
  }

  return lineFor("draw");
}

function stopCountdown() {
  if (state.countdownTimer) {
    window.clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function cancelEndFlow() {
  state.flowId += 1;
  stopCountdown();
  stopChanceMessages();
}

function resetScore() {
  clearCinematicCutIn();
  state.win = 0;
  state.lose = 0;
  state.draw = 0;
  state.drawWarningShown = false;
  state.finalConfirmHand = null;
  state.routeReachedChance = false;
  state.routeReachedFinal = false;
  state.trueEndingQueued = false;
  state.psychEvent = null;
  state.nextCallMode = "normal";
  state.postTrueRecordAnnounced = false;
  state.postTrueNewRecordShownFor = 0;
  state.lastLine = "";
  setFinalJankenMode(false);
  setChanceMode(false);
  updateScore();
}

function cleanupForTitle() {
  stopCountdown();
  stopChanceMessages();
  clearCinematicCutIn();
  resetSceneDialogState();
  cancelMessageTyping();
  clearResultLabel();
  clearCharacterBeat();
  hideInputGuide(false);
  state.finalConfirmHand = null;
  state.showingTrueEnding = false;
  setSelectedButton();
  setButtonsEnabled(false);
  renderHand(playerHand, null);
  renderHand(cpuHand, null);
  setStageMood();

  endOverlay.hidden = true;
  sceneOverlay.hidden = true;
  sceneOverlay.classList.remove("has-illustration");
  sceneIllustration.hidden = true;
  closeGallery(false);
  cabinet.classList.remove("is-scene", "scene-intro", "scene-playerWin", "scene-playerLose", "is-playing", "is-ended", "end-win", "end-lose");
}

function showTitle() {
  AudioManager.stopBgm();
  state.started = false;
  state.busy = false;
  state.ended = false;
  state.psychEvent = null;
  state.nextCallMode = "normal";
  startButton.hidden = false;
  startButton.disabled = false;
  cleanupForTitle();
  resetScore();
  setCharacter("normal");
  showMessage("TAP START");
  updateGalleryButton();
}

async function returnToTitleWithBlackout() {
  const flowId = ++state.flowId;
  stopCountdown();
  stopChanceMessages();
  setButtonsEnabled(false);
  sceneOverlay.hidden = true;
  cabinet.classList.remove("is-scene");
  AudioManager.playSound("blackout");
  cabinet.classList.add("is-blackout");

  await wait(750);

  if (flowId !== state.flowId) {
    return;
  }

  showTitle();
  await wait(90);

  if (flowId === state.flowId) {
    cabinet.classList.remove("is-blackout");
  }
}

async function showGameOverThenTitle() {
  const flowId = ++state.flowId;
  stopCountdown();
  stopChanceMessages();
  setButtonsEnabled(false);
  AudioManager.playSound("gameover");
  finalTitle.textContent = "GAME OVER";
  finalMessage.textContent = "また挑戦してね";
  retryButton.hidden = true;
  const countdownWrap = countdown ? countdown.closest(".countdown") : null;
  if (countdownWrap) {
    countdownWrap.hidden = true;
  }
  endOverlay.hidden = false;
  cabinet.classList.remove("end-win");
  cabinet.classList.add("end-lose");
  setCharacter("win");
  showMessage(randomLine(dialogue.cpuLeadBig.cpuWin), "is-result is-win", { typewriter: true });

  await wait(1200);

  if (flowId !== state.flowId) {
    return;
  }

  await showSceneSequence({
    sceneType: "playerLose",
    fallbackSceneType: "playerLose",
    mood: "happy",
    lines: ["ここまで遊んでくれてありがとう。", "また来てくれたら、うれしいな。"],
  });

  if (flowId !== state.flowId) {
    return;
  }

  unlockGalleryRoute("gameOver");

  if (isGalleryComplete() && !getGalleryProgress().trueEndSeen) {
    state.trueEndingQueued = true;
  }

  if (state.trueEndingQueued) {
    await showTrueEnding();

    if (flowId === state.flowId) {
      returnToTitleWithBlackout();
    }
    return;
  }

  if (flowId === state.flowId) {
    returnToTitleWithBlackout();
  }
}

function startContinueCountdown() {
  let remaining = CONTINUE_SECONDS;
  countdown.textContent = remaining;

  stopCountdown();
  state.countdownTimer = window.setInterval(() => {
    remaining -= 1;
    countdown.textContent = remaining;

    if (remaining <= 0) {
      showGameOverThenTitle();
    }
  }, 1000);
}

function handleGalleryUnlockForEnding(result) {
  let routeId = null;

  if (result === "win") {
    routeId = getCurrentClearRoute();
  }

  if (!routeId) {
    return null;
  }

  unlockGalleryRoute(routeId);

  if (isGalleryComplete() && !getGalleryProgress().trueEndSeen) {
    state.trueEndingQueued = true;
  }

  return routeId;
}

async function endGame(result) {
  cancelEndFlow();
  const flowId = state.flowId;
  state.ended = true;
  state.busy = false;
  setSelectedButton();
  setButtonsEnabled(false);
  cabinet.classList.add("is-ended", `end-${result}`);
  retryButton.hidden = result === "win";
  countdown.parentElement.hidden = result === "win";
  finalTitle.textContent = result === "win" ? "YOU WIN!" : "CONTINUE?";
  finalMessage.textContent = result === "win" ? "完全勝利！ また遊んでね！" : "リベンジする？";
  retryButton.textContent = "リベンジする";
  endOverlay.hidden = false;
  const routeId = handleGalleryUnlockForEnding(result);

  if (result === "win") {
    AudioManager.playSound("youwin");
    setCharacter("panic");
    showMessage(randomLine(dialogue.playerLeadBig.cpuLose), "is-result is-lose", { typewriter: true });
    await wait(2400);

    if (flowId !== state.flowId) {
      return;
    }

    await showRouteEnding(routeId);

    if (flowId !== state.flowId) {
      return;
    }

    if (state.trueEndingQueued) {
      await showTrueEnding();
    }

    if (flowId === state.flowId) {
      returnToTitleWithBlackout();
    }
    return;
  }

  setCharacter("smug");
  AudioManager.playSound("continue");
  showMessage(randomLine(dialogue.cpuLeadBig.cpuWin), "is-result is-win", { typewriter: true });
  startContinueCountdown();
}

function restartMatch() {
  AudioManager.initAudio();
  AudioManager.switchBgm("normal");
  AudioManager.playSound("start");
  cancelEndFlow();
  clearCinematicCutIn();
  resetSceneDialogState();
  cancelMessageTyping();
  clearResultLabel();
  clearCharacterBeat();
  hideInputGuide(false);
  state.finalConfirmHand = null;
  closeGallery(false);
  endOverlay.hidden = true;
  sceneOverlay.hidden = true;
  sceneOverlay.classList.remove("has-illustration");
  sceneIllustration.hidden = true;
  state.started = true;
  state.busy = false;
  state.ended = false;
  cabinet.classList.remove("is-scene", "scene-intro", "scene-playerWin", "scene-playerLose", "is-ended", "end-win", "end-lose");
  updateGalleryButton();
  resetScore();
  showIntroThenReady();
}

function addRoundScore(result) {
  const scoreChange = {
    bonus: 1,
    warningStarted: false,
    chanceStarted: false,
    finalStarted: false,
    finalResolved: false,
    finalResult: null,
    postTrueNewRecord: false,
  };

  if (result === "draw") {
    state.draw += 1;
    scoreChange.postTrueNewRecord = checkPostTrueDrawRecord();

    if (state.draw >= DRAW_WARNING_COUNT && !state.drawWarningShown) {
      state.drawWarningShown = true;
      scoreChange.warningStarted = true;
    }

    if (state.draw >= CHANCE_DRAW_COUNT && !state.chance) {
      setChanceMode(true);
      state.routeReachedChance = true;
      scoreChange.chanceStarted = true;
    }

    if (state.draw >= FINAL_DRAW_COUNT && !state.finalJanken && getGalleryProgress().trueEndSeen !== true) {
      setFinalJankenMode(true);
      state.routeReachedFinal = true;
      if (!state.chance) {
        setChanceMode(true);
        state.routeReachedChance = true;
      }
      scoreChange.finalStarted = true;
    }

    return scoreChange;
  }

  if (state.finalJanken) {
    scoreChange.finalResolved = true;
    scoreChange.finalResult = result;
    if (result === "win") {
      state.win = MATCH_POINT;
    } else if (result === "lose") {
      state.lose = MATCH_POINT;
    }
    return scoreChange;
  }

  const bonus = state.chance ? 2 : 1;
  scoreChange.bonus = bonus;
  state[result] = Math.min(MATCH_POINT, state[result] + bonus);
  return scoreChange;
}

async function startGame() {
  if (state.started || state.busy) {
    return;
  }

  if (DEBUG_MODE) {
    console.time("startGame");
  }

  const flowId = ++state.flowId;
  state.busy = true;
  startButton.disabled = true;
  closeGallery(false);
  if (galleryButton) {
    galleryButton.hidden = true;
    galleryButton.classList.remove("is-new");
  }
  if (relationResetButton) {
    relationResetButton.hidden = true;
  }
  endOverlay.hidden = true;
  sceneOverlay.hidden = true;
  sceneOverlay.classList.remove("has-illustration");
  sceneIllustration.hidden = true;
  clearCinematicCutIn();
  resetSceneDialogState();
  cancelMessageTyping();
  clearResultLabel();
  clearCharacterBeat();
  hideInputGuide(false);
  state.finalConfirmHand = null;
  setSelectedButton();
  setButtonsEnabled(false);
  updateGalleryButton();

  AudioManager.initAudio();
  AudioManager.playSound("start");
  AudioManager.prepareForGameplay();

  await Promise.race([startupAssetsReady || preloadStartupAssets(), wait(LOW_POWER_MODE ? 650 : 400)]);
  await wait(60);

  if (flowId !== state.flowId) {
    return;
  }

  state.started = true;
  state.ended = false;
  cabinet.classList.add("is-playing");
  updateGalleryButton();
  window.setTimeout(() => {
    if (state.started && !state.ended) {
      AudioManager.switchBgm("normal");
    }
  }, 120);
  showIntroThenReady();

  if (DEBUG_MODE) {
    console.timeEnd("startGame");
  }
}

async function playRound(player) {
  if (!state.started || state.busy || state.ended) {
    return;
  }

  if (DEBUG_MODE) {
    console.time("playRound");
  }

  const endPlayRoundTimer = () => {
    if (DEBUG_MODE) {
      console.timeEnd("playRound");
    }
  };

  state.busy = true;
  const flowId = state.flowId;
  state.finalConfirmHand = null;
  cabinet.classList.remove("is-final-confirm");
  stopChanceMessages();
  resetRoundView();
  AudioManager.playSound("select");
  setSelectedButton(player);
  setButtonsEnabled(false);

  const callMode = state.nextCallMode;
  const cpu = chooseCpuHand(player);
  const result = judge(player, cpu);
  const scoreChange = addRoundScore(result);

  const calls = callMode === "draw" ? ["あいこで"] : ["ジャン", "ケン"];
  const revealCall = callMode === "draw" ? "しょ！" : "ポン！";

  for (const [index, call] of calls.entries()) {
    const callSound = callMode === "draw" ? "call1" : index === 0 ? "call1" : "call2";
    const beatClass = callMode === "draw" ? "is-beat-1" : index === 0 ? "is-beat-1" : "is-beat-2";
    showMessage(call, "is-calling");
    AudioManager.playJankenCallSfx(callSound);
    playCharacterBeat(beatClass);
    await wait(420);
    if (flowId !== state.flowId) {
      endPlayRoundTimer();
      return;
    }
  }

  showMessage(revealCall, "is-calling");
  AudioManager.playJankenCallSfx("call3");
  playCharacterBeat("is-beat-3");
  await wait(40);
  if (flowId !== state.flowId) {
    endPlayRoundTimer();
    return;
  }

  renderHand(playerHand, player);
  renderHand(cpuHand, cpu);
  AudioManager.playSound("handPop");
  await wait(150);
  if (flowId !== state.flowId) {
    endPlayRoundTimer();
    return;
  }

  updateScore();
  const cpuMood = cpuMoodForResult(result);
  if (scoreChange.bonus > 1) {
    setCharacter("excited");
  } else if (result === "win") {
    setCharacter(state.win - state.lose >= 4 ? "panic" : "worried");
  } else if (result === "lose") {
    setCharacter(state.lose - state.win >= 4 ? "smug" : "happy");
  } else {
    setCharacter(state.chance ? "excited" : "normal");
  }
  setResultLabel(result, scoreChange.bonus, scoreChange.finalResolved);

  if (scoreChange.finalResolved) {
    const finalLine = result === "win"
      ? randomLine(dialogue.final.cpuLose)
      : randomLine(dialogue.final.cpuWin);
    AudioManager.playSound(result === "win" ? "win" : "lose");
    showMessage(finalLine, `is-result is-${cpuMood} player-${result} is-final-entry`, { typewriter: true });
  } else if (scoreChange.finalStarted) {
    state.nextCallMode = "draw";
    await showFinalJankenEntry();
    endPlayRoundTimer();
    return;
  } else if (scoreChange.chanceStarted) {
    state.chanceMessageIndex = 0;
    setCharacter("excited");
    triggerCinematicCutIn("chance");
    AudioManager.playSound("chance");
    AudioManager.switchBgm("chance");
    showMessage(randomLine(CHANCE_ENTRY_LINES), "is-result is-draw player-draw is-chance-entry", { typewriter: true });
  } else if (scoreChange.warningStarted) {
    setCharacter("worried");
    AudioManager.playSound("draw");
    showMessage(randomLine(DRAW_WARNING_LINES), "is-result is-draw player-draw is-draw-warning", { typewriter: true });
  } else if (scoreChange.bonus > 1 && result === "win") {
    AudioManager.playSound("win");
    showMessage(randomLine(dialogue.chance.cpuLose), "is-result is-lose player-win is-double", { typewriter: true });
  } else if (scoreChange.bonus > 1 && result === "lose") {
    AudioManager.playSound("lose");
    showMessage(randomLine(dialogue.chance.cpuWin), "is-result is-win player-lose is-double", { typewriter: true });
  } else if (scoreChange.postTrueNewRecord) {
    setCharacter(state.draw >= 10 ? "excited" : "happy");
    AudioManager.playSound("draw");
    showMessage(postTrueNewRecordLine(), "is-result is-draw player-draw", {
      typewriter: true,
      maxDuration: 760,
    });
  } else if (state.finalJanken && result === "draw") {
    AudioManager.playSound("draw");
    showMessage(randomLine(FINAL_JANKEN_IDLE_LINES), "is-result is-draw player-draw is-final-entry", { typewriter: true });
  } else if (state.chance && result === "draw") {
    AudioManager.playSound("draw");
    showMessage(randomLine(dialogue.chance.draw), "is-result is-draw player-draw", { typewriter: true });
  } else {
    AudioManager.playSound(result);
    showMessage(resultText(result), `is-result is-${cpuMood} player-${result}`, { typewriter: true });
  }

  state.nextCallMode = result === "draw" ? "draw" : "normal";

  const roundEndsMatch = scoreChange.finalResolved || state.win >= MATCH_POINT || state.lose >= MATCH_POINT;
  const resultPause = roundEndsMatch
    ? 2200
    : scoreChange.chanceStarted
      ? 2000
      : scoreChange.warningStarted
        ? 1700
        : 1350;

  await wait(resultPause);

  if (flowId !== state.flowId) {
    endPlayRoundTimer();
    return;
  }

  if (roundEndsMatch) {
    endGame(scoreChange.finalResolved ? scoreChange.finalResult : state.win >= MATCH_POINT ? "win" : "lose");
    endPlayRoundTimer();
    return;
  }

  state.busy = false;
  state.finalConfirmHand = null;
  setSelectedButton();
  setButtonsEnabled(true);
  updateCharacterByScore();
  showNextInputPrompt();
  endPlayRoundTimer();
}

characterImage.addEventListener("error", useFallbackCharacter);
sceneCharacterImage.addEventListener("error", useFallbackSceneCharacter);
sceneIllustration.addEventListener("error", fallbackSceneIllustration);
startButton.addEventListener("click", startGame);
retryButton.addEventListener("click", restartMatch);
galleryButton?.addEventListener("click", openGallery);
relationResetButton?.addEventListener("click", () => {
  resetGalleryProgress();
  updateGalleryButton();
  updateRelationResetButton();
  showTitle();
});
galleryCloseButton?.addEventListener("click", () => closeGallery());
galleryPrevButton?.addEventListener("click", () => moveGallery(-1));
galleryNextButton?.addEventListener("click", () => moveGallery(1));
galleryImage?.addEventListener("click", replayTrueEndFromGallery);
sceneOverlay?.addEventListener("pointerup", advanceSceneDialog);
sceneNextButton?.addEventListener("click", advanceSceneDialog);
document.addEventListener("keydown", handleKeyboardShortcut);
muteButton.addEventListener("click", () => {
  AudioManager.initAudio();
  if (trackDebugToggleTap()) {
    AudioManager.playSound("select");
    return;
  }

  AudioManager.toggleMute();
  AudioManager.playSound("select");
});

choiceButtons.forEach((button) => {
  const isLocked = () => isChoiceInputLocked(button);

  button.addEventListener("pointerdown", (event) => {
    if (isLocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    button.classList.add("is-pressing");
  });

  button.addEventListener("pointerup", (event) => {
    if (isLocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    clearChoicePressState(button);
  });

  button.addEventListener("pointercancel", (event) => {
    if (isLocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    clearChoicePressState(button);
  });

  button.addEventListener("pointerleave", (event) => {
    if (isLocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    clearChoicePressState(button);
  });

  button.addEventListener("click", (event) => {
    if (isLocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    handleChoiceButtonClick(button.dataset.hand);
  });
});

document.querySelectorAll(".choice-hand-image").forEach((image) => {
  image.addEventListener(
    "error",
    () => {
      const button = image.closest(".choice");
      const hand = hands[button?.dataset.hand];
      if (hand) {
        image.replaceWith(document.createTextNode(hand.symbol));
      }
    },
    { once: true }
  );
});

useFallbackCharacter();
applyPerformanceModeClass();
preloadStartupAssets();
scheduleIdleTask(() => {
  preloadCharacterImages();
}, LOW_POWER_MODE ? 1200 : 700);
scheduleIdleTask(() => {
  if (!LOW_POWER_MODE) {
    preloadSceneImages();
  }
}, LOW_POWER_MODE ? 3500 : 1400);
setCharacter("normal");
AudioManager.loadMutedPreference();
if (!LOW_POWER_MODE) {
  scheduleIdleTask(() => {
    AudioManager.initAudio();
  }, 1800);
}
AudioManager.updateMuteButton();
if (galleryButton) {
  galleryButton.hidden = true;
  galleryButton.classList.remove("is-new");
}
updateGalleryButton();
if (DEBUG_MODE) {
  toggleDebugMode(true);
}
setButtonsEnabled(false);
updateScore();
