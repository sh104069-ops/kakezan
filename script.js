'use strict';
/* ============================================================
 *  かけざんクエスト  script.js
 *  体験的に かけ算を学ぶ RPG形式の学習アプリ
 *  - 1の段〜20の段 × 5ステージ（しくみ／じゅんばん／ばらばら／ぶんしょう／ボス）
 *  - Apple Pencil 等での手書き数字認識（$P Point-Cloud Recognizer＋本人の字の学習）
 *  - 記録は端末のブラウザ（localStorage）に保存。CSV出力・JSONバックアップ対応
 * ============================================================ */

// ---------- 基本ユーティリティ ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const app = $('#app');

// ---------- データ定義 ----------
const AREAS = [
  { name: 'はじまりの むら', mon: '🐛', mname: 'イモムシン' },
  { name: 'みどりの そうげん', mon: '🐌', mname: 'ノロノロン' },
  { name: 'カエルの いけ', mon: '🐸', mname: 'ケロッパ' },
  { name: 'へびの こみち', mon: '🐍', mname: 'ニョロリン' },
  { name: 'こうもりの どうくつ', mon: '🦇', mname: 'バッサン' },
  { name: 'おおかみの もり', mon: '🐺', mname: 'ガルルン' },
  { name: 'さそりの さばく', mon: '🦂', mname: 'チクリン' },
  { name: 'くもの すの とう', mon: '🕷️', mname: 'アミアミ' },
  { name: 'いのししの やま', mon: '🐗', mname: 'ドスコイン' },
  { name: 'きつねの やしろ', mon: '🦊', mname: 'コンコン' },
  { name: 'わしの たにま', mon: '🦅', mname: 'バサバード' },
  { name: 'ワニの ぬま', mon: '🐊', mname: 'ガブリン' },
  { name: 'サメの うみ', mon: '🦈', mname: 'キバザメ' },
  { name: 'タコの いわば', mon: '🐙', mname: 'クネクネ' },
  { name: 'きょうりゅうの くに', mon: '🦖', mname: 'ティラドン' },
  { name: 'おばけの やかた', mon: '👻', mname: 'ヒュードロ' },
  { name: 'ほねの はかば', mon: '💀', mname: 'ガイコツン' },
  { name: 'からくり こうじょう', mon: '🤖', mname: 'ギアロボ' },
  { name: 'うちゅうの もん', mon: '👾', mname: 'ピコピコン' },
  { name: 'りゅうの しろ', mon: '🐉', mname: 'ドラゴン' },
].map((a, i) => Object.assign(a, { c: `hsl(${(i * 19 + 100) % 360}, 55%, 50%)` }));

const ITEMS = ['🍎', '🍊', '🍓', '🍩', '⭐', '🍪', '🌸', '🍇', '🍬', '🥚', '🍙', '🎈', '🐟', '🍋', '🧁', '🌰', '🍑', '🍐', '🍒', '💎'];

const STAGES = [
  { id: 1, name: 'しくみの ほこら', icon: '⛩️', desc: 'え を うごかして かけざんの しくみを しらべよう', n: 3 },
  { id: 2, name: 'じゅんばんの もり', icon: '🌲', desc: '×1 から ×10 まで じゅんばんに 10もん', n: 10 },
  { id: 3, name: 'ばらばらの どうくつ', icon: '🕳️', desc: 'ばらばらの じゅんばんで 10もん', n: 10 },
  { id: 4, name: 'ことばの まち', icon: '🏘️', desc: 'え を みて ぶんしょうもんだい 5もん', n: 5 },
  { id: 5, name: 'ボスの しろ', icon: '🏰', desc: 'ボスと たいけつ！ ばらばら 10もん', n: 10 },
];
const stageTotal = st => (STAGES[st - 1] || {}).n || 10;
const stageName = st => st === 'T' ? 'ふくしゅうの とう' : st === 'N' ? 'にがて とっくん' : (STAGES[st - 1] || {}).name || '';

const WORDS = [
  { it: '🍎', nm: 'りんご', u: 'こ', g: 'ふくろ', gc: 'つ', v: 'はいって います' },
  { it: '✏️', nm: 'えんぴつ', u: '本', g: 'はこ', gc: 'つ', v: 'はいって います' },
  { it: '🍓', nm: 'いちご', u: 'こ', g: 'おさら', gc: 'まい', v: 'のって います' },
  { it: '🧒', nm: 'こども', u: '人', g: 'ながいす', gc: 'きゃく', v: 'すわって います' },
  { it: '🐟', nm: 'さかな', u: 'ひき', g: 'すいそう', gc: 'つ', v: 'およいで います' },
  { it: '🍪', nm: 'クッキー', u: 'まい', g: 'はこ', gc: 'つ', v: 'はいって います' },
  { it: '🥚', nm: 'たまご', u: 'こ', g: 'パック', gc: 'つ', v: 'はいって います' },
  { it: '🌷', nm: 'チューリップ', u: '本', g: 'かびん', gc: 'つ', v: 'さして あります' },
  { it: '⚽', nm: 'ボール', u: 'こ', g: 'かご', gc: 'つ', v: 'はいって います' },
  { it: '🍬', nm: 'あめ', u: 'こ', g: 'ふくろ', gc: 'つ', v: 'はいって います' },
];

const AVATARS = ['🧙', '🧝', '🦸', '🥷', '🧑‍🚀', '🤴', '👸', '🧚'];
const SHOP = [
  { id: 'w1', e: '🗡️', name: 'きの けん', price: 50, slot: 'weapon' },
  { id: 'h1', e: '🎩', name: 'まほうの ぼうし', price: 80, slot: 'head' },
  { id: 's1', e: '🛡️', name: 'まもりの たて', price: 120, slot: 'shield' },
  { id: 'w2', e: '⚔️', name: 'はがねの けん', price: 200, slot: 'weapon' },
  { id: 'p1', e: '🐕', name: 'なかまの いぬ', price: 300, slot: 'pet' },
  { id: 'w3', e: '🪄', name: 'ひかりの つえ', price: 400, slot: 'weapon' },
  { id: 'h2', e: '👑', name: 'おうかん', price: 600, slot: 'head' },
  { id: 'p2', e: '🦄', name: 'ユニコーン', price: 900, slot: 'pet' },
];
const SLOT_NAME = { weapon: 'ぶき', head: 'あたま', shield: 'たて', pet: 'なかま' };

// ---------- 保存データ ----------
const KEY = 'kakezan-quest-v1';
const DEF_SETTINGS = { penOnly: false, sound: true, input: 'pen', unlockAll: false };
let DB;
function loadDB() {
  try { DB = JSON.parse(localStorage.getItem(KEY)); } catch (e) { DB = null; }
  if (!DB || !Array.isArray(DB.players)) DB = { players: [], cur: null, settings: {} };
  DB.settings = Object.assign({}, DEF_SETTINGS, DB.settings);
  DB.players.forEach(fixPlayer);
}
function fixPlayer(p) {
  p.lv = p.lv || 1; p.exp = p.exp || 0; p.gold = p.gold || 0;
  p.items = p.items || []; p.equip = p.equip || {}; p.prog = p.prog || {};
  p.hist = p.hist || []; p.miss = p.miss || {}; p.ink = p.ink || {};
  return p;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(DB)); }
  catch (e) { toast('ほぞんに しっぱい しました'); }
}
const P = () => DB.players.find(p => p.id === DB.cur);
const newPlayer = (name, avatar) => fixPlayer({ id: 'p' + Date.now(), name, avatar, created: Date.now() });
const expNeed = lv => 30 + lv * 20;
const maxHP = lv => 20 + lv * 4;
const stageRec = (p, dan, st) => (p.prog[dan] || {})[st];
const isDanUnlocked = (p, dan) => DB.settings.unlockAll || dan === 1 || !!(stageRec(p, dan - 1, 5) || {}).cleared;
const isStageUnlocked = (p, dan, st) => DB.settings.unlockAll || st === 1 || !!(stageRec(p, dan, st - 1) || {}).cleared;
const clearedDans = p => AREAS.map((_, i) => i + 1).filter(d => (stageRec(p, d, 5) || {}).cleared);
const starStr = n => '★'.repeat(n || 0) + '☆'.repeat(3 - (n || 0));
const fmtTime = s => s >= 60 ? `${Math.floor(s / 60)}ふん${s % 60}びょう` : `${s}びょう`;
const pad2 = n => String(n).padStart(2, '0');
const fmtDate = t => { const d = new Date(t); return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const ymd = () => { const d = new Date(); return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`; };

// ---------- こうかおん ----------
let AC = null;
function beep(type) {
  if (!DB.settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const seq = {
      ok: [[660, .08], [880, .12]], hit: [[220, .06], [150, .12]], ng: [[300, .12], [200, .2]],
      win: [[523, .1], [659, .1], [784, .1], [1047, .28]], lv: [[784, .1], [988, .1], [1175, .1], [1568, .32]], tap: [[620, .03]],
    }[type];
    if (!seq) return;
    let t = AC.currentTime;
    seq.forEach(([f, d]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(.07, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d); t += d;
    });
  } catch (e) { /* 音が出せない環境は無視 */ }
}

// ============================================================
//  手書き数字認識  ($P Point-Cloud Recognizer)
//  Vatavu, Anthony & Wobbrock (2012) のアルゴリズムを実装
// ============================================================
// <RECOG>
const Recog = (() => {
  const N = 32;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function pathLen(pts) { let d = 0; for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) d += dist(pts[i - 1], pts[i]); return d; }
  function resample(src, n) {
    const pts = src.map(p => ({ x: p.x, y: p.y, id: p.id }));
    const I = pathLen(pts) / (n - 1); let D = 0; const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].id !== pts[i - 1].id) continue;
      const d = dist(pts[i - 1], pts[i]);
      if (d > 0 && D + d >= I) {
        const t = (I - D) / d;
        const q = { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y), id: pts[i].id };
        out.push(q); pts.splice(i, 0, q); D = 0;
      } else D += d;
    }
    while (out.length < n) out.push(pts[pts.length - 1]);
    return out.slice(0, n);
  }
  function scale(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    const s = Math.max(x1 - x0, y1 - y0) || 1;
    return pts.map(p => ({ x: (p.x - x0) / s, y: (p.y - y0) / s, id: p.id }));
  }
  function center(pts) {
    let cx = 0, cy = 0; pts.forEach(p => { cx += p.x; cy += p.y; }); cx /= pts.length; cy /= pts.length;
    return pts.map(p => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
  }
  const normalize = pts => center(scale(resample(pts, N)));
  function cloudDist(a, b, start) {
    const n = a.length, used = new Array(n).fill(false); let sum = 0, i = start;
    do {
      let idx = -1, min = Infinity;
      for (let j = 0; j < n; j++) if (!used[j]) { const d = dist(a[i], b[j]); if (d < min) { min = d; idx = j; } }
      used[idx] = true;
      sum += (1 - ((i - start + n) % n) / n) * min;
      i = (i + 1) % n;
    } while (i !== start);
    return sum;
  }
  function match(a, b) {
    const n = a.length, step = Math.floor(Math.sqrt(n)); let min = Infinity;
    for (let i = 0; i < n; i += step) min = Math.min(min, cloudDist(a, b, i), cloudDist(b, a, i));
    return min;
  }
  // --- 数字のお手本（0〜100 の座標。y は下向き） ---
  const L = (...c) => { const p = []; for (let i = 0; i < c.length; i += 2) p.push([c[i], c[i + 1]]); return p; };
  const A = (cx, cy, rx, ry, t0, t1) => { const p = [], st = t1 > t0 ? 10 : -10; for (let t = t0; st > 0 ? t <= t1 : t >= t1; t += st) { const r = t * Math.PI / 180; p.push([cx + rx * Math.cos(r), cy + ry * Math.sin(r)]); } return p; };
  const S = (...s) => [].concat(...s);
  const DEF = {
    '0': [[A(50, 50, 28, 45, -90, 270)], [A(50, 50, 20, 45, -100, 260)], [A(50, 50, 34, 42, -80, 280)]],
    '1': [[L(50, 5, 50, 95)], [L(32, 24, 50, 5, 50, 95)], [L(32, 24, 50, 5, 50, 95), L(30, 95, 70, 95)]],
    '2': [[S(A(50, 30, 26, 24, -165, 20), L(74, 38, 20, 95, 82, 95))], [S(A(50, 28, 28, 22, -170, 30), L(72, 40, 18, 95, 85, 95))]],
    '3': [[S(A(48, 27, 24, 22, -160, 90), A(48, 72, 26, 23, -90, 160))], [S(L(22, 8, 75, 8, 45, 42), A(48, 70, 27, 25, -90, 160))]],
    '4': [[L(58, 5, 15, 65, 85, 65), L(62, 35, 62, 95)], [L(25, 5, 20, 58, 82, 58), L(68, 8, 68, 95)], [L(60, 95, 60, 5, 15, 65, 85, 65)]],
    '5': [[S(L(30, 5, 27, 45), A(48, 67, 28, 25, -125, 150)), L(30, 5, 78, 5)], [S(L(78, 5, 30, 5, 27, 45), A(48, 67, 28, 25, -125, 150))]],
    '6': [[S(L(70, 5, 32, 50), A(50, 70, 24, 24, 190, 550))], [S(L(65, 5, 40, 32, 28, 62), A(50, 70, 22, 24, 180, 540))]],
    '7': [[L(15, 8, 85, 8, 40, 95)], [L(15, 24, 15, 8, 85, 8, 45, 95)], [L(15, 8, 85, 8, 55, 95)]],
    '8': [[S(A(50, 28, 20, 22, 90, 450), A(50, 72, 24, 23, -90, 270))], [S(A(50, 26, 18, 21, 90, 450), A(50, 70, 26, 25, -90, 270))]],
    '9': [[S(A(50, 30, 22, 23, 0, 360), L(72, 30, 68, 95))], [S(A(48, 30, 22, 23, 0, 360), L(70, 30, 70, 95))], [S(A(50, 30, 22, 23, 0, 360), L(72, 30, 70, 70, 55, 95))]],
  };
  const base = [];
  for (const d in DEF) {
    for (const strokes of DEF[d]) {
      for (const k of [0, -0.18, 0.18]) { // 少し傾いた字にも対応させる
        const pts = [];
        strokes.forEach((s, id) => s.forEach(([x, y]) => pts.push({ x: x + k * (y - 50), y, id })));
        base.push({ d, pts: normalize(pts) });
      }
    }
  }
  function classify(raw, extra) {
    if (!raw || raw.length < 2 || pathLen(raw) < 4) return null;
    const c = normalize(raw); const scores = {};
    for (const t of base.concat(extra || [])) {
      const s = match(c, t.pts);
      if (!(t.d in scores) || s < scores[t.d]) scores[t.d] = s;
    }
    const ranked = Object.keys(scores).sort((a, b) => scores[a] - scores[b]);
    return { digit: ranked[0], ranked, norm: c };
  }
  return { classify, normalize };
})();
// </RECOG>

let _ltCache = null;
function learnedTemplates() {
  const p = P(); if (!p) return [];
  if (_ltCache && _ltCache.id === p.id) return _ltCache.list;
  const list = [];
  Object.keys(p.ink || {}).forEach(d => (p.ink[d] || []).forEach(pts => list.push({ d, pts: pts.map(([x, y]) => ({ x, y })) })));
  _ltCache = { id: p.id, list };
  return list;
}
function learnInk(box, d) {
  const p = P(); if (!p || !box.strokes.length) return;
  const r = box.result || Recog.classify(box.raw());
  if (!r) return;
  const arr = p.ink[d] = p.ink[d] || [];
  arr.push(r.norm.map(q => [+q.x.toFixed(3), +q.y.toFixed(3)]));
  if (arr.length > 6) arr.shift();
  _ltCache = null; save();
}

// ---------- 手書きキャンバス ----------
class InkBox {
  constructor(canvas, opts) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.o = Object.assign({ recog: true, guide: true, lw: 7, color: '#1d1b3a', onChange: null }, opts || {});
    this.strokes = []; this.digit = null; this.result = null; this.timer = null; this.drawing = false;
    this.resize(); this._bind();
  }
  resize() {
    const r = this.c.getBoundingClientRect(); if (!r.width) return;
    const d = window.devicePixelRatio || 1;
    this.w = r.width; this.h = r.height;
    this.c.width = Math.round(r.width * d); this.c.height = Math.round(r.height * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0); this.redraw();
  }
  _pt(e) { const r = this.c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
  _bind() {
    const c = this.c;
    c.addEventListener('pointerdown', e => {
      if (DB.settings.penOnly && e.pointerType === 'touch') return;
      e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (_) { }
      if (!this.w) this.resize();
      this.drawing = true; this.pid = e.pointerId;
      clearTimeout(this.timer); this.timer = null;
      this.cur = [this._pt(e)]; this.strokes.push(this.cur); this.redraw();
      if (this.o.onChange) this.o.onChange();
    });
    c.addEventListener('pointermove', e => {
      if (!this.drawing || e.pointerId !== this.pid) return;
      e.preventDefault();
      const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      (co && co.length ? co : [e]).forEach(ev => this.cur.push(this._pt(ev)));
      this.redraw();
    });
    const end = e => {
      if (!this.drawing || e.pointerId !== this.pid) return;
      this.drawing = false;
      if (this.o.recog) {
        this.timer = setTimeout(() => { this.timer = null; this.recognize(); }, 600);
        if (this.o.onChange) this.o.onChange();
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }
  redraw() {
    const g = this.ctx; if (!this.w) return;
    g.clearRect(0, 0, this.w, this.h);
    if (this.o.guide) {
      g.save(); g.strokeStyle = 'rgba(80,90,160,.18)'; g.setLineDash([6, 6]); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(this.w / 2, 8); g.lineTo(this.w / 2, this.h - 8); g.moveTo(8, this.h / 2); g.lineTo(this.w - 8, this.h / 2); g.stroke(); g.restore();
    }
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = this.o.color; g.lineWidth = this.o.lw;
    for (const s of this.strokes) {
      g.beginPath();
      s.forEach(([x, y], i) => { const X = x * this.w, Y = y * this.h; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
      if (s.length === 1) g.lineTo(s[0][0] * this.w + .1, s[0][1] * this.h);
      g.stroke();
    }
  }
  raw() {
    const k = (this.h || 1) / (this.w || 1); const pts = [];
    this.strokes.forEach((s, id) => s.forEach(([x, y]) => pts.push({ x: x * 100, y: y * 100 * k, id })));
    return pts;
  }
  recognize() {
    if (!this.strokes.length) { this.digit = null; this.result = null; }
    else { const r = Recog.classify(this.raw(), learnedTemplates()); this.result = r; this.digit = r ? r.digit : null; }
    if (this.o.onChange) this.o.onChange();
  }
  flush() { if (this.timer) { clearTimeout(this.timer); this.timer = null; this.recognize(); } }
  clear() {
    clearTimeout(this.timer); this.timer = null;
    this.strokes = []; this.digit = null; this.result = null; this.redraw();
    if (this.o.onChange) this.o.onChange();
  }
}

// ---------- こたえの にゅうりょく ----------
let PAD = null, MEMO = null;
function mountPad(el) {
  const mode = DB.settings.input;
  if (mode === 'pen') {
    el.innerHTML = `<div class="pad pen-pad">
      <p class="pad-guide">✏️ 1つの ますに すうじを 1つ かいてね</p>
      <div class="ink-row">${[0, 1, 2].map(i => `<div class="ink-cell"><canvas class="ink" data-i="${i}"></canvas><button class="ink-read" data-act="pickDigit" data-i="${i}">　</button></div>`).join('')}</div>
      <div class="pad-tools"><button class="btn small" data-act="padClear">🧽 ぜんぶ けす</button><button class="btn small ghost" data-act="toggleInput">🔢 ボタンで こたえる</button></div>
      <p class="pad-guide" style="margin-top:8px;font-size:13px">よみとりが ちがう ときは、したの すうじを おして なおしてね（あなたの じを おぼえるよ）</p>
    </div>`;
    const boxes = $$('canvas.ink', el).map(c => new InkBox(c, { onChange: onPadChange }));
    PAD = { mode, boxes, value: () => boxes.map(b => { b.flush(); return b.digit == null ? '' : b.digit; }).join(''), clear: () => boxes.forEach(b => b.clear()) };
  } else {
    el.innerHTML = `<div class="pad key-pad">
      <div class="key-disp" id="keyDisp">　</div>
      <div class="keys">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(k => `<button class="key" data-act="key" data-k="${k}">${k}</button>`).join('')}
        <button class="key" data-act="key" data-k="C" style="font-size:22px">けす</button><button class="key" data-act="key" data-k="0">0</button><button class="key" data-act="key" data-k="B">⌫</button></div>
      <div class="pad-tools"><button class="btn small ghost" data-act="toggleInput">✏️ ペンで かく</button></div>
    </div>`;
    PAD = { mode, buf: '', value() { return this.buf; }, clear() { this.buf = ''; onPadChange(); } };
  }
  onPadChange();
}
function onPadChange() {
  if (!PAD) return;
  let v;
  if (PAD.mode === 'pen') {
    PAD.boxes.forEach((b, i) => {
      const btn = $(`.ink-read[data-i="${i}"]`);
      if (btn) btn.textContent = b.timer || b.drawing ? '…' : b.digit != null ? b.digit : (b.strokes.length ? '？' : '　');
    });
    v = PAD.boxes.map(b => b.digit == null ? '' : b.digit).join('');
  } else {
    v = PAD.buf; const d = $('#keyDisp'); if (d) d.textContent = v || '　';
  }
  const qa = $('#qAns');
  if (qa && B && !B.revealed && !B.busy) qa.textContent = v || '？';
}
function openDigitPicker(i) {
  if (!PAD || PAD.mode !== 'pen') return;
  PAD.boxes[i].flush();
  openModal(`<h3>この ますの すうじは どれ？</h3>
    <p class="note">ただしい すうじを えらぶと、あなたの じの かきかたを おぼえて つぎから よみとりやすく なるよ。</p>
    <div class="digit-pick">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button class="key" data-act="setDigit" data-i="${i}" data-d="${d}">${d}</button>`).join('')}</div>
    <div class="modal-btns"><button class="btn" data-act="clearBox" data-i="${i}">🧽 この ますを けす</button><button class="btn" data-act="closeModal">とじる</button></div>`);
}
function toggleMemo() {
  const m = $('#memo'); if (!m) return;
  m.classList.toggle('hidden');
  if (!m.classList.contains('hidden')) {
    if (!MEMO) MEMO = new InkBox($('#memoCv'), { recog: false, guide: false, lw: 3, color: '#333' });
    else MEMO.resize();
  }
}
function closeMemo() { const m = $('#memo'); if (m) m.classList.add('hidden'); }

// ---------- 画面の切りかえ ----------
let CUR = null, B = null, L = null;
function go(fn, ...args) {
  B = null; PAD = null; MEMO = null; closeModal();
  CUR = { fn, args }; fn(...args); window.scrollTo(0, 0);
}
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="modal-box">${html}</div>`; m.classList.remove('hidden'); }
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; }
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2200); }
function anim(sel, cls, ms) { const el = $(sel); if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms || 600); }
function popText(sel, text, cls) {
  const box = $(sel); if (!box) return;
  const d = document.createElement('div'); d.className = 'pop ' + (cls || ''); d.textContent = text;
  box.appendChild(d); setTimeout(() => d.remove(), 1000);
}

// ---------- 共通パーツ ----------
function heroSprite(p, size) {
  const e = p.equip || {}; const it = id => (SHOP.find(s => s.id === id) || {}).e || '';
  return `<span class="hero-sprite ${size || ''}"><span class="hs-body">${p.avatar}</span>${e.head ? `<span class="hs-head">${it(e.head)}</span>` : ''}${e.weapon ? `<span class="hs-weapon">${it(e.weapon)}</span>` : ''}${e.shield ? `<span class="hs-shield">${it(e.shield)}</span>` : ''}${e.pet ? `<span class="hs-pet">${it(e.pet)}</span>` : ''}</span>`;
}
function heroBar(p) {
  const need = expNeed(p.lv);
  return `<header class="herobar">
    <div class="hb-hero">${heroSprite(p, 'sm')}<div><div class="hb-name">${esc(p.name)}</div><div class="hb-lv">Lv.${p.lv} <span class="expbar"><i style="width:${Math.min(100, p.exp / need * 100)}%"></i></span></div></div></div>
    <div class="hb-gold">💰 ${p.gold} G</div>
    <nav class="hb-nav"><button class="btn small" data-act="shop">🏪 おみせ</button><button class="btn small" data-act="records">📜 きろく</button><button class="btn small" data-act="settings" aria-label="せってい">⚙️</button><button class="btn small" data-act="toTitle" aria-label="タイトルへ">🚪</button></nav>
  </header>`;
}
// まとまりの え（n こずつ が m つぶん）
function groupsHTML(n, m, item, opts) {
  opts = opts || {};
  const total = n * m;
  const size = total > 120 ? 'xs' : total > 60 ? 's' : total > 24 ? 'm' : 'l';
  const one = item === 'dot' ? '<span class="it dot"></span>' : `<span class="it">${item}</span>`;
  let html = `<div class="groups sz-${size}">`;
  for (let g = 1; g <= m; g++) {
    let inner = '';
    if (n > 10) { inner += `<span class="ten">${'<i></i>'.repeat(10)}<em>10</em></span>` + one.repeat(n - 10); }
    else inner = one.repeat(n);
    html += `<div class="grp"><div class="grp-items">${inner}</div>${opts.count ? `<div class="grp-cnt">${n * g}</div>` : ''}</div>`;
  }
  return html + '</div>';
}

// ============================================================
//  タイトル画面
// ============================================================
function countBadges(p) { return clearedDans(p).length; }
function renderTitle() {
  const ps = DB.players;
  app.innerHTML = `<div class="screen title-screen">
    <div class="logo"><div class="logo-sub">たいけんして まなぶ</div><h1>かけざん<br>クエスト</h1><div class="logo-icons">⚔️🐉✖️🏰</div></div>
    <div class="panel">
      <h2>📖 ぼうけんの しょ</h2>
      ${ps.length ? `<div class="slots">${ps.map(p => `<div class="slot">
          <button class="slot-main" data-act="load" data-id="${p.id}"><span class="slot-av">${p.avatar}</span><span class="slot-name">${esc(p.name)}</span><span class="slot-lv">Lv.${p.lv}</span><span class="slot-badge">🏅${countBadges(p)}</span></button>
          <button class="slot-del" data-act="delPlayer" data-id="${p.id}" aria-label="けす">🗑️</button></div>`).join('')}</div>`
      : '<p class="muted">まだ ぼうけんの しょが ありません。</p>'}
      <button class="btn primary big" data-act="newPlayer">✨ あたらしく はじめる</button>
    </div>
    <div class="footer-links"><button class="btn small ghost" data-act="settings">⚙️ せってい</button><button class="btn small ghost" data-act="exportAll">📥 きろくを CSVで だす</button></div>
  </div>`;
}
function openNewPlayer() {
  openModal(`<h2>✨ あたらしい ゆうしゃ</h2>
    <label class="field-label" for="np-name">なまえ</label>
    <input id="np-name" class="text-in" maxlength="10" placeholder="なまえを いれてね" autocomplete="off">
    <label class="field-label">すがた</label>
    <div class="avatar-pick">${AVATARS.map((a, i) => `<button class="av ${i === 0 ? 'on' : ''}" data-act="pickAv" data-av="${a}">${a}</button>`).join('')}</div>
    <div class="modal-btns"><button class="btn" data-act="closeModal">やめる</button><button class="btn primary" data-act="createPlayer">ぼうけんへ ▶</button></div>`);
}

// ============================================================
//  ワールドマップ
// ============================================================
function renderMap() {
  const p = P(); if (!p) return renderTitle();
  const tiles = AREAS.map((ar, i) => {
    const dan = i + 1, open = isDanUnlocked(p, dan), pr = p.prog[dan] || {};
    const marks = STAGES.map(s => `<i class="${(pr[s.id] || {}).cleared ? 'on' : ''}"></i>`).join('');
    const badge = (pr[5] || {}).cleared;
    return `<button class="tile ${open ? '' : 'locked'} ${badge ? 'mastered' : ''}" style="--c:${ar.c}" data-act="${open ? 'area' : 'lockedArea'}" data-dan="${dan}">
      <span class="tile-dan">${dan}の だん</span><span class="tile-mon">${open ? ar.mon : '🔒'}</span><span class="tile-name">${ar.name}</span><span class="tile-marks">${marks}</span>${badge ? '<span class="tile-badge">🏅</span>' : ''}</button>`;
  }).join('');
  const towerOpen = towerDans(p).length >= 2;
  const nigateN = Object.keys(p.miss).length;
  app.innerHTML = `<div class="screen map-screen">${heroBar(p)}
    <div class="map-title"><h2>🗺️ ワールドマップ</h2><p>ボスを たおすと つぎの くにへ すすめるよ</p></div>
    <div class="tiles">${tiles}
      <button class="tile tower ${towerOpen ? '' : 'locked'}" data-act="${towerOpen ? 'tower' : 'lockedTower'}"><span class="tile-dan">ふくしゅう</span><span class="tile-mon">${towerOpen ? '🗼' : '🔒'}</span><span class="tile-name">ふくしゅうの とう</span><span class="tile-sub">クリアした だんから 10もん</span></button>
      <button class="tile nigate ${nigateN ? '' : 'locked'}" data-act="${nigateN ? 'nigate' : 'lockedNigate'}"><span class="tile-dan">とっくん</span><span class="tile-mon">${nigateN ? '🔥' : '🔒'}</span><span class="tile-name">にがて とっくん</span><span class="tile-sub">まちがえた もんだい ${nigateN}こ</span></button>
    </div></div>`;
}
function towerDans(p) {
  const c = clearedDans(p);
  if (c.length < 2 && DB.settings.unlockAll) return [2, 3, 4, 5, 6, 7, 8, 9];
  return c;
}

// ============================================================
//  エリア（だん）画面
// ============================================================
function renderArea(dan) {
  const p = P(), ar = AREAS[dan - 1];
  const cards = STAGES.map(s => {
    const r = stageRec(p, dan, s.id) || {}, open = isStageUnlocked(p, dan, s.id);
    return `<button class="stage-card ${open ? '' : 'locked'} ${r.cleared ? 'cleared' : ''}" data-act="${open ? 'stage' : 'lockedStage'}" data-dan="${dan}" data-st="${s.id}">
      <span class="sc-icon">${open ? s.icon : '🔒'}</span>
      <span class="sc-body"><b>${s.id}. ${s.name}</b><small>${s.desc}</small></span>
      <span class="sc-rec">${r.plays ? `${starStr(r.stars)}<br><small>さいこう ${r.best}/${s.n}</small>` : '<small>まだ</small>'}</span></button>`;
  }).join('');
  app.innerHTML = `<div class="screen area-screen" style="--c:${ar.c}">${heroBar(p)}
    <div class="area-head"><button class="btn small" data-act="map">◀ マップ</button>
      <div class="area-title"><span class="area-mon">${ar.mon}</span><div><h2>${dan}の だん</h2><p>${ar.name}</p></div></div>
      <button class="btn small" data-act="table" data-dan="${dan}">📋 ${dan}の だんの ひょう</button></div>
    <div class="stage-list">${cards}</div></div>`;
}
function openTable(dan) {
  openModal(`<h2>📋 ${dan}の だん</h2>
    <div class="kuku">${[...Array(10)].map((_, i) => `<div><span class="c-one">${dan}</span> × <span class="c-many">${i + 1}</span> = <b class="c-all">${dan * (i + 1)}</b></div>`).join('')}</div>
    <p class="note">いくつぶんが 1 ふえるたびに、こたえは ${dan} ずつ ふえるよ。</p>
    <div class="modal-btns"><button class="btn primary" data-act="closeModal">とじる</button></div>`);
}

// ============================================================
//  ステージ1  しくみの ほこら（体験）
// ============================================================
function renderLearn(dan) { L = { dan, m: 1, seen: new Set([1]) }; drawLearn(); }
function drawLearn() {
  const { dan, m } = L, item = ITEMS[(dan - 1) % ITEMS.length], total = dan * m;
  const add = Array(m).fill(dan).join(' + ');
  const dec = dan > 10 ? `<div class="dec">🔎 ${dan} は「10 と ${dan - 10}」。<br><b>10 × ${m} = ${10 * m}</b> と <b>${dan - 10} × ${m} = ${(dan - 10) * m}</b> を あわせて<br>${10 * m} + ${(dan - 10) * m} = <b class="c-all">${total}</b></div>` : '';
  const ready = L.seen.size >= 10;
  app.innerHTML = `<div class="screen learn-screen">
    <div class="topbar"><button class="btn small" data-act="area" data-dan="${dan}">◀ もどる</button><div class="tb-title">⛩️ しくみの ほこら ・ ${dan}の だん</div><div style="width:84px"></div></div>
    <div class="learn-grid">
      <section class="panel learn-pic">
        <p class="lead">${item} が <b class="c-one">${dan}こ</b> ずつ はいった ふくろが <b class="c-many">${m}つ</b> あるよ。<br>ぜんぶで <b class="c-all">${total}こ</b>。</p>
        ${groupsHTML(dan, m, item, { count: true })}
      </section>
      <section class="panel learn-ctrl">
        <div class="stepper">
          <button class="btn round" data-act="lm" data-d="-1" ${m <= 1 ? 'disabled' : ''} aria-label="へらす">−</button>
          <div class="stepper-val"><small>いくつぶん</small><b>${m}</b></div>
          <button class="btn round" data-act="lm" data-d="1" ${m >= 10 ? 'disabled' : ''} aria-label="ふやす">＋</button>
        </div>
        <div class="formula-box">
          <div class="f-row"><span class="f-label">たしざん</span><span class="f-add">${add} = ${total}</span></div>
          <div class="f-row big"><span class="f-label">かけざん</span><span><b class="c-one">${dan}</b> × <b class="c-many">${m}</b> = <b class="c-all">${total}</b></span></div>
          <div class="f-legend"><span class="c-one">■ 1つぶんの かず</span><span class="c-many">■ いくつぶん</span><span class="c-all">■ ぜんぶの かず</span></div>
          ${dec}
          <p class="tip">💡 いくつぶんが 1 ふえると、こたえは <b class="c-one">${dan}</b> ふえるよ。</p>
        </div>
        <div class="seen">${[...Array(10)].map((_, i) => `<button class="${L.seen.has(i + 1) ? 'on' : ''} ${m === i + 1 ? 'cur' : ''}" data-act="lset" data-m="${i + 1}">${i + 1}</button>`).join('')}</div>
        <button class="btn primary big" data-act="learnCheck" ${ready ? '' : 'disabled'}>${ready ? '🎯 たしかめ バトルへ！' : `＋を おして 10まで しらべよう（${L.seen.size}/10）`}</button>
      </section>
    </div></div>`;
}

// ============================================================
//  バトル（ステージ1〜5・ふくしゅう・にがて）
// ============================================================
function makeWord(a, b) {
  const w = WORDS[rand(0, WORDS.length - 1)];
  const set = new Set([`${a} × ${b}`]);
  if (a !== b) set.add(`${b} × ${a}`);
  set.add(`${a} + ${b}`);
  if (set.size < 3) set.add(`${a} × ${b + 1}`);
  return Object.assign({}, w, { choices: shuffle([...set]) });
}
function makeQuestions(dan, st) {
  const ms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  if (st === 1) return shuffle(ms).slice(0, 3).map(b => ({ a: dan, b }));
  if (st === 2) return ms.map(b => ({ a: dan, b }));
  if (st === 4) return shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5).map(b => ({ a: dan, b, w: makeWord(dan, b) }));
  return shuffle(ms).map(b => ({ a: dan, b }));
}
function foeFor(dan, st) {
  if (st === 'T') return { e: '🗿', name: 'とうの まもりがみ', cls: 'boss' };
  if (st === 'N') return { e: '🌑', name: 'にがての かげ', cls: '' };
  const ar = AREAS[dan - 1];
  if (st === 1) return { e: '🎯', name: 'れんしゅうの まと', cls: '' };
  if (st === 3) return { e: ar.mon, name: 'つよい ' + ar.mname, cls: 'strong' };
  if (st === 4) return { e: '🧑‍🌾', name: 'こまっている むらびと', cls: 'npc' };
  if (st === 5) return { e: ar.mon, name: ar.mname + 'キング', cls: 'boss' };
  return { e: ar.mon, name: ar.mname, cls: '' };
}
const cur = () => B.qs[B.i];

function startBattle(dan, st, qs) {
  const p = P();
  closeModal(); PAD = null; MEMO = null; CUR = { fn: null, args: [] };
  qs = qs || makeQuestions(dan, st);
  B = {
    dan, st, qs, i: 0, first: 0, hints: 0, shikiMiss: 0, miss: [], t0: Date.now(),
    mmax: qs.length * 2, mhp: qs.length * 2, hpMax: maxHP(p.lv), hp: maxHP(p.lv),
    attempt: 0, phase: 'ans', busy: false, revealed: false, hintOn: false, foe: foeFor(dan, st),
  };
  drawBattleFrame(); nextQ(); window.scrollTo(0, 0);
}
function startTower() {
  const p = P(), dans = towerDans(p);
  if (dans.length < 2) { toast('🔒 ボスを 2ひき たおすと ひらくよ'); return; }
  startBattle(0, 'T', [...Array(10)].map(() => ({ a: dans[rand(0, dans.length - 1)], b: rand(1, 10) })));
}
function startNigate() {
  const p = P(); const keys = Object.keys(p.miss).sort((a, b) => p.miss[b] - p.miss[a]).slice(0, 10);
  if (!keys.length) { toast('にがてな もんだいは ないよ！'); return; }
  startBattle(0, 'N', shuffle(keys.map(k => { const [a, b] = k.split('×').map(Number); return { a, b }; })));
}

function drawBattleFrame() {
  const p = P(), f = B.foe;
  const title = B.st === 'T' || B.st === 'N' ? `${B.st === 'T' ? '🗼' : '🔥'} ${stageName(B.st)}` : `${B.dan}の だん ・ ${STAGES[B.st - 1].icon} ${stageName(B.st)}`;
  const bg = B.dan ? AREAS[B.dan - 1].c : '#6b5bd6';
  app.innerHTML = `<div class="screen battle-screen">
    <div class="topbar"><button class="btn small" data-act="quit">◀ やめる</button><div class="tb-title">${title}</div><div class="qcount" id="qcount"></div></div>
    <div class="battle-grid">
      <section class="b-left">
        <div class="field" id="field" style="--c:${bg}">
          <div class="fighter hero-box" id="heroBox"><div id="heroSp" class="sp">${heroSprite(p, 'lg')}</div><div class="nm">${esc(p.name)} <small>Lv.${p.lv}</small></div><div class="bar"><i id="heroBar" class="hp"></i></div><div class="bar-t" id="heroHpT"></div></div>
          <div class="vs">VS</div>
          <div class="fighter foe-box ${f.cls}" id="foeBox">${f.cls === 'boss' ? '<span class="crown">👑</span>' : ''}<div id="foeSp" class="sp foe-sp">${f.e}</div><div class="nm">${f.name}</div><div class="bar"><i id="foeBar" class="mhp"></i></div><div class="bar-t">${B.st === 4 ? 'おねがい' : 'HP'}</div></div>
        </div>
        <div class="msg panel" id="msg"></div>
        <div class="question panel" id="question"></div>
        <div class="hint panel" id="hint"></div>
      </section>
      <section class="b-right"><div class="panel answer-panel"><div id="answerArea"></div><div class="actions" id="actions"></div></div></section>
    </div>
    <div class="memo-sheet hidden" id="memo"><div class="memo-head"><b>📝 けいさん メモ</b><span><button class="btn small" data-act="memoClear">🧽 けす</button> <button class="btn small" data-act="memo">✖ とじる</button></span></div><canvas id="memoCv"></canvas></div>
  </div>`;
  updateBars();
}
function updateBars() {
  const m = $('#foeBar'); if (m) m.style.width = (B.mhp / B.mmax * 100) + '%';
  const h = $('#heroBar'); if (h) h.style.width = (B.hp / B.hpMax * 100) + '%';
  const t = $('#heroHpT'); if (t) t.textContent = `HP ${B.hp}/${B.hpMax}`;
}
function setMsg(html) { const m = $('#msg'); if (m) m.innerHTML = html; }

function nextQ() {
  const q = cur();
  B.attempt = 0; B.busy = false; B.revealed = false;
  B.phase = q.w ? 'shiki' : 'ans';
  B.hintOn = B.st === 1 || B.st === 2 || B.st === 4; // しくみ・じゅんばん・ぶんしょうは え を さいしょから だす
  $('#qcount').textContent = `${B.i + 1} / ${B.qs.length}`;
  const f = B.foe;
  if (B.st === 4) setMsg(`むらびと「${q.w.nm}が ぜんぶで いくつ あるか しりたいんじゃ。まずは <b>しき</b>を えらんでおくれ」`);
  else setMsg(B.i === 0 ? `${f.name}が あらわれた！ もんだいに こたえて こうげきだ！` : `つぎの もんだい！ ${f.name}は まだ たっている！`);
  drawQuestion(); drawHint(); drawInput(); drawActions();
}
function storyHTML(q, hl) {
  const A = hl ? `<b class="c-one">${q.a}${q.w.u}</b>` : `${q.a}${q.w.u}`;
  const Bn = hl ? `<b class="c-many">${q.b}${q.w.gc}</b>` : `${q.b}${q.w.gc}`;
  return `${q.w.g}が ${Bn} あります。<br>1つの ${q.w.g}に ${q.w.nm}が ${A}ずつ ${q.w.v}。<br>${q.w.nm}は ぜんぶで なん${q.w.u} ですか？`;
}
function drawQuestion() {
  const q = cur(), el = $('#question');
  const calc = `<div class="q-calc ${q.w ? 'small' : ''}"><span class="c-one">${q.a}</span><span class="op">×</span><span class="c-many">${q.b}</span><span class="op">=</span><span class="q-ans" id="qAns">？</span>${q.w ? `<span class="unit">${q.w.u}</span>` : ''}</div>`;
  if (q.w) el.innerHTML = `<p class="story">${storyHTML(q, B.hintOn || B.phase === 'ans')}</p>${B.phase === 'ans' ? calc : ''}`;
  else el.innerHTML = calc;
}
function drawHint() {
  const el = $('#hint'), q = cur();
  if (!B.hintOn) { el.innerHTML = '<p class="hint-off">💡 こまったら「ヒント」を おしてね</p>'; return; }
  const item = q.w ? q.w.it : 'dot';
  const showCnt = B.attempt >= 1 || B.revealed;
  const lines = [];
  if (q.w) {
    lines.push(`1つの ${q.w.g}に <b class="c-one">${q.a}${q.w.u}</b>、それが <b class="c-many">${q.b}${q.w.gc}</b> ぶん`);
    if (B.phase === 'shiki' && q.shikiMiss) lines.push('しきは「<b class="c-one">1つぶんの かず</b> × <b class="c-many">いくつぶん</b>」の じゅんばんで かくよ');
  } else lines.push(`<b class="c-one">${q.a}</b> が <b class="c-many">${q.b}</b>つ ぶん`);
  if (B.phase === 'ans') {
    if (B.st === 2 && q.b > 1) lines.push(`${q.a} × ${q.b - 1} = ${q.a * (q.b - 1)}　→　あと <b class="c-one">${q.a}</b> ふやすと…？`);
    if ((showCnt || B.st !== 2) && q.b > 1) lines.push(Array(q.b).fill(q.a).join(' + '));
    if (q.a > 10) lines.push(`10 × ${q.b} = ${10 * q.b}　と　${q.a - 10} × ${q.b} = ${(q.a - 10) * q.b}　を あわせると…？`);
  }
  el.innerHTML = `<div class="hint-pic">${groupsHTML(q.a, q.b, item, { count: showCnt })}</div><div class="hint-txt">${lines.map(l => `<p>${l}</p>`).join('')}</div>`;
}
function drawInput() {
  const el = $('#answerArea'), q = cur();
  if (B.phase === 'shiki') {
    PAD = null;
    el.innerHTML = `<div class="shiki"><p class="pad-guide">📝 どの しきに なるかな？</p>${q.w.choices.map(c => `<button class="btn choice" data-act="shiki" data-c="${c}">${c}</button>`).join('')}</div>`;
  } else mountPad(el);
}
function drawActions() {
  const el = $('#actions');
  if (B.revealed) { el.innerHTML = '<button class="btn primary big" data-act="nextQ">つぎへ ▶</button>'; return; }
  if (B.phase === 'shiki') { el.innerHTML = '<button class="btn" data-act="hint">💡 ヒント</button>'; return; }
  el.innerHTML = `<button class="btn" data-act="hint">💡 ヒント</button><button class="btn" data-act="memo">📝 メモ</button><button class="btn primary big" data-act="answer">${B.st === 4 ? '🤝 こたえる' : '⚔️ こうげき！'}</button>`;
}
function chooseShiki(c, btn) {
  const q = cur(); if (B.busy) return;
  if (c === `${q.a} × ${q.b}`) {
    beep('ok'); B.phase = 'ans';
    setMsg(`そうだね！ しきは <b>${c}</b>。<br>こたえを かいて むらびとに おしえて あげよう！`);
    drawQuestion(); drawHint(); drawInput(); drawActions();
  } else {
    beep('ng'); if (!q.shikiMiss) B.shikiMiss++; q.shikiMiss = true;
    if (btn) { btn.disabled = true; btn.classList.add('shake'); }
    if (!B.hintOn) { B.hintOn = true; B.hints++; }
    setMsg(`おしい！ 1つの ${q.w.g}に ${q.a}${q.w.u}。それが ${q.b}${q.w.gc} ぶん だから…<br>「1つぶんの かず × いくつぶん」で かんがえよう。`);
    drawQuestion(); drawHint();
  }
}
function submitAnswer() {
  if (!B || B.busy || B.phase !== 'ans' || !PAD) return;
  const v = PAD.value();
  if (v === '') { setMsg('すうじを かいてから こたえてね ✏️'); anim('#answerArea', 'shake', 400); return; }
  const q = cur();
  if (+v === q.a * q.b) onCorrect(); else onWrong(v);
}
async function onCorrect() {
  const q = cur(), p = P(), tok = B, ans = q.a * q.b;
  B.busy = true;
  const first = B.attempt === 0; if (first) B.first++;
  const qa = $('#qAns'); if (qa) { qa.textContent = ans; qa.classList.add('ok'); }
  B.mhp = Math.max(0, B.mhp - (first ? 2 : 1));
  if (first && B.st === 'N') { const k = `${q.a}×${q.b}`; if (p.miss[k]) { p.miss[k]--; if (p.miss[k] <= 0) delete p.miss[k]; save(); } }
  beep('ok');
  if (B.st !== 4) anim('#heroSp', 'attack', 500);
  setTimeout(() => {
    if (B !== tok) return;
    beep('hit');
    if (B.st !== 4) { anim('#foeSp', 'hurt', 500); popText('#foeBox', first ? '💥かいしん！' : '⚡ヒット！', 'hit'); }
    else popText('#foeBox', '😊ありがとう！', 'hit');
    updateBars();
    if (B.mhp <= 0) { const fb = $('#foeBox'); if (fb && B.st !== 4) fb.classList.add('down'); }
  }, 260);
  if (B.st === 4) setMsg(`むらびと「ありがとう！ ${q.w.nm}は ぜんぶで <b>${ans}${q.w.u}</b> じゃな！」`);
  else setMsg(`せいかい！ ${q.a} × ${q.b} = <b>${ans}</b>　${first ? 'かいしんの いちげき！' : 'こうげきが あたった！'}`);
  await sleep(1400);
  if (B !== tok) return;
  B.i++;
  if (B.i >= B.qs.length) finishBattle(); else nextQ();
}
function onWrong(v) {
  const q = cur(), p = P(), ans = q.a * q.b;
  if (B.attempt === 0) {
    const k = `${q.a}×${q.b}`; p.miss[k] = (p.miss[k] || 0) + 1;
    B.miss.push(`${q.a} × ${q.b} = ${ans}`); save();
  }
  B.attempt++;
  beep('ng');
  if (B.st !== 4) {
    const d = rand(2, 4); B.hp = Math.max(1, B.hp - d);
    anim('#foeSp', 'attack-l', 500);
    setTimeout(() => { anim('#heroSp', 'hurt', 500); popText('#heroBox', `-${d}`, 'dmg'); updateBars(); }, 260);
  }
  if (B.attempt === 1) {
    setMsg(`${esc(v)} では ないみたい…。<br>${B.st === 4 ? 'え' : 'ヒント'}を よく みて もういちど！`);
    if (!B.hintOn) { B.hintOn = true; }
    drawHint(); PAD.clear();
  } else {
    B.revealed = true;
    const qa = $('#qAns'); if (qa) { qa.textContent = ans; qa.classList.add('reveal'); }
    setMsg(`こたえは <b>${ans}</b> だよ。${q.a} が ${q.b}つ ぶんで ${ans}。<br>え で たしかめたら「つぎへ」を おそう。つぎは できるよ！`);
    drawHint(); drawActions();
  }
}
function finishBattle() {
  const p = P(), b = B;
  const total = b.qs.length, sec = Math.round((Date.now() - b.t0) / 1000);
  const ratio = b.first / total;
  const stars = ratio >= 1 ? 3 : ratio >= .8 ? 2 : ratio >= .6 ? 1 : 0;
  let exp = b.first * 10 + stars * 5, gold = b.first * 5 + stars * 5;
  if (b.st === 5) { exp *= 2; if (stars) gold += 50; }
  let unlock = null;
  if (typeof b.st === 'number') {
    const pr = p.prog[b.dan] = p.prog[b.dan] || {};
    const r = pr[b.st] = pr[b.st] || { best: 0, stars: 0, cleared: false, plays: 0 };
    const wasCleared = r.cleared;
    r.plays++;
    if (b.first > r.best || (b.first === r.best && (!r.time || sec < r.time))) r.time = sec;
    r.best = Math.max(r.best, b.first); r.stars = Math.max(r.stars, stars);
    if (stars >= 1) r.cleared = true;
    if (b.st === 5 && r.cleared && !wasCleared && b.dan < 20 && !DB.settings.unlockAll) unlock = b.dan + 1;
  }
  p.hist.unshift({ t: Date.now(), dan: b.dan, st: b.st, c: b.first, n: total, sec, hint: b.hints, shiki: b.shikiMiss, miss: b.miss.join(' / ') });
  if (p.hist.length > 1000) p.hist.length = 1000;
  p.exp += exp; p.gold += gold;
  let up = 0; while (p.exp >= expNeed(p.lv)) { p.exp -= expNeed(p.lv); p.lv++; up++; }
  save();
  B = null; PAD = null; MEMO = null;
  beep(up ? 'lv' : 'win');
  renderResult({ dan: b.dan, st: b.st, foe: b.foe, win: b.mhp <= 0, first: b.first, total, sec, stars, exp, gold, up, lv: p.lv, unlock, miss: b.miss });
}
function renderResult(R) {
  let head;
  if (R.st === 4) head = R.win ? 'むらびとの おねがいを ぜんぶ かなえた！' : 'むらびとが よろこんでいるよ！';
  else head = R.win ? `${R.foe.name}を たおした！` : `${R.foe.name}は にげていった… もういちど ちょうせん しよう！`;
  let btns;
  if (R.st === 'T') btns = '<button class="btn" data-act="map">🗺️ マップへ</button><button class="btn primary" data-act="tower">🔁 もういちど</button>';
  else if (R.st === 'N') btns = '<button class="btn" data-act="records">📜 きろくへ</button><button class="btn primary" data-act="map">🗺️ マップへ</button>';
  else {
    btns = `<button class="btn" data-act="stage" data-dan="${R.dan}" data-st="${R.st}">🔁 もういちど</button><button class="btn" data-act="area" data-dan="${R.dan}">◀ ${R.dan}の だんへ</button>`;
    if (R.stars >= 1) {
      if (R.st < 5) btns += `<button class="btn primary" data-act="stage" data-dan="${R.dan}" data-st="${R.st + 1}">つぎの ステージ ▶</button>`;
      else if (R.dan < 20) btns += `<button class="btn primary" data-act="area" data-dan="${R.dan + 1}">${R.dan + 1}の だんへ ▶</button>`;
    }
  }
  app.innerHTML = `<div class="screen result-screen"><div class="panel result">
    <div class="res-foe ${R.win && R.st !== 4 ? 'defeated' : ''}">${R.foe.e}</div>
    <h2>${head}</h2>
    <div class="stars big">${starStr(R.stars)}</div>
    <div class="res-score">${R.total}もん ちゅう ${R.first}もん いっぱつ せいかい！</div>
    <div class="res-row"><span>⏱️ じかん</span><b>${fmtTime(R.sec)}</b></div>
    <div class="res-row"><span>✨ けいけんち</span><b>+${R.exp}</b></div>
    <div class="res-row"><span>💰 ゴールド</span><b>+${R.gold} G</b></div>
    ${R.up ? `<div class="levelup">🎉 レベルアップ！ Lv.${R.lv} に なった！</div>` : ''}
    ${R.unlock ? `<div class="unlock">🗺️ ${R.unlock}の だんへ いけるように なった！</div>` : ''}
    ${R.st === 5 && R.stars >= 1 ? `<div class="unlock">🏅 ${R.dan}の だん マスター！</div>` : ''}
    ${R.miss.length ? `<div class="res-miss"><b>📌 もういちど みておこう</b>${R.miss.map(m => `<span>${m}</span>`).join('')}</div>` : '<div class="res-perfect">🌟 パーフェクト！ すごい！</div>'}
    <div class="modal-btns">${btns}</div>
  </div></div>`;
  CUR = { fn: null, args: [] }; window.scrollTo(0, 0);
}

// ============================================================
//  おみせ
// ============================================================
function renderShop() {
  const p = P();
  const list = SHOP.map(it => {
    const own = p.items.includes(it.id), eq = p.equip[it.slot] === it.id;
    return `<div class="shop-item ${own ? 'own' : ''}"><span class="si-e">${it.e}</span><div class="si-b"><b>${it.name}</b><small>${SLOT_NAME[it.slot]}</small></div>
      ${own ? `<button class="btn small ${eq ? 'primary' : ''}" data-act="equip" data-id="${it.id}">${eq ? 'そうびちゅう' : 'そうびする'}</button>`
      : `<button class="btn small" data-act="buy" data-id="${it.id}" ${p.gold < it.price ? 'disabled' : ''}>💰 ${it.price}G</button>`}</div>`;
  }).join('');
  app.innerHTML = `<div class="screen shop-screen">${heroBar(p)}
    <div class="panel"><div class="panel-head"><button class="btn small" data-act="map">◀ マップ</button><h2>🏪 ぶきや・どうぐや</h2></div>
      <div class="shop-hero">${heroSprite(p, 'lg')}<p>もんだいに せいかい すると ゴールドが もらえるよ。<br>そうびを かって ゆうしゃを かっこよく しよう！</p></div>
      <div class="shop-list">${list}</div></div></div>`;
}

// ============================================================
//  きろく
// ============================================================
function renderRecords(tab) {
  const p = P(); tab = tab || 'stage';
  const tabs = [['stage', '🏆 ステージ'], ['hist', '🕒 りれき'], ['nigate', '🔥 にがて']];
  const plays = p.hist.length, sumC = p.hist.reduce((s, h) => s + h.c, 0), sumN = p.hist.reduce((s, h) => s + h.n, 0);
  let body = '';
  if (tab === 'stage') {
    body = `<div class="tbl-wrap"><table class="rec"><thead><tr><th>だん</th>${STAGES.map(s => `<th>${s.icon}<br><small>${s.name}</small></th>`).join('')}</tr></thead><tbody>
      ${AREAS.map((a, i) => { const dan = i + 1; return `<tr><th>${dan}</th>${STAGES.map(s => { const r = stageRec(p, dan, s.id); return `<td class="${r && r.cleared ? 'clr' : ''}">${r && r.plays ? `<span class="st">${starStr(r.stars)}</span><small>${r.best}/${s.n}${r.time ? ` ・ ${fmtTime(r.time)}` : ''}</small>` : '<span class="muted">−</span>'}</td>`; }).join('')}</tr>`; }).join('')}
    </tbody></table></div>`;
  } else if (tab === 'hist') {
    body = p.hist.length ? `<div class="tbl-wrap"><table class="rec"><thead><tr><th>にちじ</th><th>だん</th><th>ステージ</th><th>いっぱつ せいかい</th><th>じかん</th><th>ヒント</th><th>まちがえた もんだい</th></tr></thead><tbody>
      ${p.hist.slice(0, 200).map(h => `<tr><td>${fmtDate(h.t)}</td><td>${h.dan || '−'}</td><td>${stageName(h.st)}</td><td>${h.c} / ${h.n}</td><td>${fmtTime(h.sec)}</td><td>${h.hint || 0}</td><td style="text-align:left">${h.miss || ''}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="muted">まだ きろくが ありません。</p>';
  } else {
    const keys = Object.keys(p.miss).sort((a, b) => p.miss[b] - p.miss[a]);
    body = keys.length ? `<p>まちがえた かいすうが おおい じゅんに ならんで いるよ。とっくんで いっぱつ せいかい すると へっていくよ。</p>
      <div class="nigate-list">${keys.map(k => `<span>${k.replace('×', ' × ')} <small>${p.miss[k]}かい</small></span>`).join('')}</div>
      <button class="btn primary big" data-act="nigate">🔥 にがて とっくんを する</button>` : '<p class="res-perfect">にがてな もんだいは ないよ！ すごい！</p>';
  }
  app.innerHTML = `<div class="screen records-screen">${heroBar(p)}
    <div class="panel"><div class="panel-head"><button class="btn small" data-act="map">◀ マップ</button><h2>📜 ${esc(p.name)} の きろく</h2></div>
      <div class="rec-summary"><div>あそんだ かいすう<b>${plays}</b></div><div>いっぱつ せいかいりつ<b>${sumN ? Math.round(sumC / sumN * 100) : 0}%</b></div><div>マスターした だん<b>🏅 ${countBadges(p)}</b></div><div>レベル<b>Lv.${p.lv}</b></div></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="btn small tab ${tab === k ? 'on' : ''}" data-act="recTab" data-tab="${k}">${l}</button>`).join('')}
        <span style="flex:1"></span><button class="btn small" data-act="exportMe">📥 CSV（この こ）</button><button class="btn small" data-act="exportAll">📥 CSV（ぜんいん）</button></div>
      ${body}</div></div>`;
}
function download(text, name, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function exportCSV(all) {
  const ps = all ? DB.players : [P()].filter(Boolean);
  const rows = [['名前', '日時', '段', 'ステージ', '一発正答数', '問題数', '一発正答率(%)', '所要時間(秒)', 'ヒント使用', '式選択の誤り', '誤答した問題']];
  ps.forEach(p => p.hist.slice().reverse().forEach(h => rows.push([p.name, fmtDate(h.t), h.dan || '-', stageName(h.st), h.c, h.n, Math.round(h.c / h.n * 100), h.sec, h.hint || 0, h.shiki || 0, h.miss || ''])));
  if (rows.length === 1) { toast('まだ きろくが ありません'); return; }
  const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  download(csv, `kakezan_kiroku_${ymd()}.csv`, 'text/csv');
}

// ============================================================
//  せってい
// ============================================================
function openSettings() {
  const s = DB.settings;
  openModal(`<h2>⚙️ せってい</h2>
    <label class="sw"><input type="checkbox" data-set="penOnly" ${s.penOnly ? 'checked' : ''}><span>ペンだけで かく（ゆび・てのひらは はんのう しない）</span></label>
    <label class="sw"><input type="checkbox" data-set="sound" ${s.sound ? 'checked' : ''}><span>こうかおん</span></label>
    <div class="set-row"><span>こたえの にゅうりょく</span><select data-set="input"><option value="pen" ${s.input === 'pen' ? 'selected' : ''}>ペンで かく</option><option value="key" ${s.input === 'key' ? 'selected' : ''}>ボタン</option></select></div>
    <label class="sw"><input type="checkbox" data-set="unlockAll" ${s.unlockAll ? 'checked' : ''}><span>すべての 段・ステージを 開放する（教師用：2の段から始める 等）</span></label>
    <hr><h3>データ（教師用）</h3>
    <div class="set-btns">
      <button class="btn small" data-act="exportAll">📥 全員の記録をCSV出力</button>
      <button class="btn small" data-act="backup">💾 バックアップ保存</button>
      <button class="btn small" data-act="restoreBtn">📂 バックアップ読込</button>
      ${P() ? '<button class="btn small" data-act="resetInk">✏️ 手書き学習をリセット</button>' : ''}
    </div>
    <input type="file" id="restoreIn" accept=".json,application/json" hidden>
    <p class="note">記録はこの端末のブラウザ内に保存されます。端末を変えるときや、ブラウザのデータを消去する前は「バックアップ保存」をしてください。<br>
    手書きの読み取りが違ったときに正しい数字を選ぶと、その子の字を覚えて認識しやすくなります。</p>
    <div class="modal-btns"><button class="btn primary" data-act="closeSettings">とじる</button></div>`);
}
function restore(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (!d || !Array.isArray(d.players)) throw new Error('bad');
      if (!confirm('いまの データを バックアップで うわがき します。よろしいですか？')) return;
      DB = d; DB.settings = Object.assign({}, DEF_SETTINGS, DB.settings); DB.players.forEach(fixPlayer);
      _ltCache = null; save(); go(P() ? renderMap : renderTitle); toast('バックアップを よみこみました');
    } catch (e) { toast('よみこめませんでした'); }
  };
  fr.readAsText(file);
}

// ============================================================
//  イベント
// ============================================================
const ACT = {
  newPlayer: () => openNewPlayer(),
  pickAv: t => { $$('.av').forEach(b => b.classList.remove('on')); t.classList.add('on'); },
  createPlayer: () => {
    const name = ($('#np-name').value || '').trim() || 'ゆうしゃ';
    const on = $('.av.on'); const av = on ? on.dataset.av : AVATARS[0];
    const p = newPlayer(name, av); DB.players.push(p); DB.cur = p.id; save(); go(renderMap);
    toast(`ようこそ、${name}！ ぼうけんの はじまりだ！`);
  },
  load: t => { DB.cur = t.dataset.id; save(); go(renderMap); },
  delPlayer: t => {
    const p = DB.players.find(x => x.id === t.dataset.id);
    if (p && confirm(`「${p.name}」の ぼうけんの しょを けしますか？\n（きろくも ぜんぶ きえます）`)) {
      DB.players = DB.players.filter(x => x !== p); if (DB.cur === p.id) DB.cur = null; save(); go(renderTitle);
    }
  },
  toTitle: () => { DB.cur = null; save(); go(renderTitle); },
  map: () => go(renderMap),
  area: t => go(renderArea, +t.dataset.dan),
  lockedArea: () => toast('🔒 まえの だんの ボスを たおすと いけるよ'),
  lockedStage: () => toast('🔒 まえの ステージを クリアすると ひらくよ'),
  lockedTower: () => toast('🔒 ボスを 2ひき たおすと ひらくよ'),
  lockedNigate: () => toast('まちがえた もんだいが あると ひらくよ'),
  stage: t => { const dan = +t.dataset.dan, st = +t.dataset.st; if (st === 1) go(renderLearn, dan); else startBattle(dan, st); },
  table: t => openTable(+t.dataset.dan),
  lm: t => { L.m = Math.max(1, Math.min(10, L.m + Number(t.dataset.d))); L.seen.add(L.m); beep('tap'); drawLearn(); },
  lset: t => { L.m = +t.dataset.m; L.seen.add(L.m); beep('tap'); drawLearn(); },
  learnCheck: () => startBattle(L.dan, 1),
  tower: () => startTower(),
  nigate: () => startNigate(),
  hint: () => { if (!B || B.busy) return; if (!B.hintOn) { B.hintOn = true; B.hints++; } if (cur().w) { drawQuestion(); onPadChange(); } drawHint(); },
  memo: () => toggleMemo(),
  memoClear: () => { if (MEMO) MEMO.clear(); },
  answer: () => submitAnswer(),
  nextQ: () => { if (!B) return; B.i++; if (B.i >= B.qs.length) finishBattle(); else nextQ(); },
  shiki: t => chooseShiki(t.dataset.c, t),
  quit: () => {
    if (!B || !confirm('たたかいを やめて もどりますか？\n（この たたかいの きろくは のこりません）')) return;
    const d = B.dan, st = B.st; B = null;
    if (typeof st === 'number') go(renderArea, d); else go(renderMap);
  },
  padClear: () => { if (PAD) PAD.clear(); },
  toggleInput: () => { DB.settings.input = DB.settings.input === 'pen' ? 'key' : 'pen'; save(); if (B && B.phase === 'ans') drawInput(); },
  key: t => {
    if (!PAD || PAD.mode !== 'key') return;
    const k = t.dataset.k;
    if (k === 'C') PAD.buf = ''; else if (k === 'B') PAD.buf = PAD.buf.slice(0, -1); else if (PAD.buf.length < 3) PAD.buf += k;
    beep('tap'); onPadChange();
  },
  pickDigit: t => openDigitPicker(+t.dataset.i),
  setDigit: t => {
    if (!PAD || PAD.mode !== 'pen') return;
    const b = PAD.boxes[+t.dataset.i], d = String(t.dataset.d);
    if (b.strokes.length && b.digit !== d) { learnInk(b, d); toast(`「${d}」の かきかたを おぼえたよ`); }
    b.digit = d; closeModal(); onPadChange();
  },
  clearBox: t => { if (PAD && PAD.boxes) PAD.boxes[+t.dataset.i].clear(); closeModal(); },
  closeModal: () => closeModal(),
  shop: () => go(renderShop),
  buy: t => {
    const p = P(), it = SHOP.find(s => s.id === t.dataset.id);
    if (!it || p.gold < it.price || p.items.includes(it.id)) return;
    p.gold -= it.price; p.items.push(it.id); p.equip[it.slot] = it.id; save(); beep('win');
    toast(`${it.e} ${it.name}を てに いれた！`); renderShop();
  },
  equip: t => {
    const p = P(), it = SHOP.find(s => s.id === t.dataset.id); if (!it) return;
    if (p.equip[it.slot] === it.id) delete p.equip[it.slot]; else p.equip[it.slot] = it.id;
    save(); renderShop();
  },
  records: () => go(renderRecords, 'stage'),
  recTab: t => go(renderRecords, t.dataset.tab),
  settings: () => openSettings(),
  closeSettings: () => { closeModal(); if (CUR && CUR.fn) CUR.fn(...CUR.args); },
  exportMe: () => exportCSV(false),
  exportAll: () => exportCSV(true),
  backup: () => download(JSON.stringify(DB), `kakezan_backup_${ymd()}.json`, 'application/json'),
  restoreBtn: () => { const f = $('#restoreIn'); if (f) f.click(); },
  resetInk: () => { const p = P(); if (p && confirm('おぼえた てがき もじを リセット しますか？')) { p.ink = {}; _ltCache = null; save(); toast('リセット しました'); } },
};
document.addEventListener('click', e => {
  if (e.target.id === 'modal') { closeModal(); return; }
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const fn = ACT[t.dataset.act];
  if (fn) fn(t, e);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'restoreIn' && t.files && t.files[0]) { restore(t.files[0]); return; }
  const k = t.dataset && t.dataset.set; if (!k) return;
  DB.settings[k] = t.type === 'checkbox' ? t.checked : t.value; save();
  if (k === 'input' && B && B.phase === 'ans') drawInput();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && $('#np-name') && document.activeElement === $('#np-name')) ACT.createPlayer();
});
document.addEventListener('gesturestart', e => e.preventDefault());
let rzT = null;
window.addEventListener('resize', () => {
  clearTimeout(rzT);
  rzT = setTimeout(() => { if (PAD && PAD.boxes) PAD.boxes.forEach(b => b.resize()); if (MEMO) MEMO.resize(); }, 150);
});

// ---------- はじまり ----------
loadDB();
if (P()) go(renderMap); else go(renderTitle);
