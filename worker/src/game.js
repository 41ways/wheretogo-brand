/* 행선지4: Brand — 정답 고르기와 유사도·순위·점수. 서버와 테스트가 같이 쓴다
   유사도 모델은 brand-embedding 저장소의 embed/export_game.py 가 만든다 (model.json). */
import DATA from '../../data/brands.json' with { type: 'json' };
import MODEL from './model.json' with { type: 'json' };

export const UNITS = DATA.brands.map(b => ({ id: b.id, name: b.name, full: b.name + (b.en && b.en !== b.name ? ' (' + b.en + ')' : '') }));
export const N = UNITS.length;
export const INDEX = new Map(UNITS.map((u, i) => [u.id, i]));
if (MODEL.n !== N) throw new Error('model.json 과 brands.json 의 브랜드 수가 다름');

/* 한국 날짜 번호. 자정(KST)에 다음 문제로 넘어간다 */
export const kstDay = (ms = Date.now()) => Math.floor((ms + 9 * 3600e3) / 86400e3);
/* 1번 문제 = 2026-09-15 (KST) */
export const EPOCH = kstDay(Date.UTC(2026, 8, 14, 15));
export const puzzleNo = day => day - EPOCH + 1;

function hash(str) {                       // xmur3
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* N일에 한 바퀴. 한 바퀴 안에서는 같은 브랜드가 두 번 나오지 않는다 */
const orders = new Map();
export function answerIndex(day, salt) {
  const k = day - EPOCH;
  const cycle = Math.floor(k / N), pos = ((k % N) + N) % N;
  const key = salt + ':' + cycle;
  let order = orders.get(key);
  if (!order) {
    const rnd = mulberry32(hash(key));
    order = UNITS.map((_, i) => i);
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    orders.set(key, order);
  }
  return order[pos];
}

// ══════════════════════════════════ 유사도
function b64(s) {
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/* 실수 묶음: int8 벡터와 "이 묶음이 있음" 비트 */
const DENSE = Object.entries(MODEL.dense).map(([name, d]) => {
  const raw = b64(d.data), bits = b64(d.has);
  const v = new Int8Array(raw.buffer, raw.byteOffset, raw.length);
  const norm = new Float32Array(N), has = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    has[i] = (bits[i >> 3] >> (7 - (i & 7))) & 1;
    let s = 0;
    for (let k = 0, o = i * d.dim; k < d.dim; k++) s += v[o + k] * v[o + k];
    norm[i] = Math.sqrt(s);
  }
  return { name, dim: d.dim, v, norm, has };
});
const ID = MODEL.ids;
/* 원-핫 묶음은 번호가 같은지로 코사인이 바로 나온다 (export_game.py compact_cos 와 같은 식) */
const CATEG = {
  category: (a, j) => (0.36 * (ID.sector[a] === ID.sector[j]) + (ID.category[a] === ID.category[j])) / 1.36,
  origin: (a, j) => ((ID.country[a] === ID.country[j]) + 0.49 * (ID.region[a] === ID.region[j])) / 1.49,
  family: (a, j) => +(ID.root[a] === ID.root[j]),
};
const W = MODEL.weights, BLOCKS = Object.keys(W);

/* 정답 a 에 대해 모든 브랜드의 묶음별 코사인(없으면 NaN)과 합친 유사도 */
function rowOf(a) {
  const cos = {};
  for (const d of DENSE) {
    if (!(d.name in W)) continue;
    const c = new Float32Array(N).fill(NaN);
    if (d.has[a] && d.norm[a] > 0) {
      const oa = a * d.dim;
      for (let j = 0; j < N; j++) {
        if (!d.has[j] || d.norm[j] === 0) continue;
        let s = 0;
        for (let k = 0, oj = j * d.dim; k < d.dim; k++) s += d.v[oa + k] * d.v[oj + k];
        c[j] = s / (d.norm[a] * d.norm[j]);
      }
    }
    cos[d.name] = c;
  }
  for (const [name, f] of Object.entries(CATEG)) {
    const c = new Float32Array(N);
    for (let j = 0; j < N; j++) c[j] = f(a, j);
    cos[name] = c;
  }
  const sim = new Float64Array(N);
  for (let j = 0; j < N; j++) {
    let num = 0, den = 0;
    for (const b of BLOCKS) {
      const c = cos[b][j];
      if (Number.isNaN(c)) continue;
      num += W[b] * c; den += W[b];
    }
    sim[j] = den > 0 ? (num / den) * Math.min(1, den / MODEL.full_share) : 0;
  }
  return { cos, sim };
}

/* 정답에서 가까운 순서. 정답 자신은 0, 가장 가까운 브랜드가 1. 같은 유사도면 목록 순서로 */
const cache = new Map();
function info(a) {
  let r = cache.get(a);
  if (!r) {
    const { cos, sim } = rowOf(a);
    const order = Int32Array.from({ length: N }, (_, i) => i).sort((x, y) => sim[y] - sim[x] || x - y).filter(i => i !== a);
    const rank = new Int16Array(N);
    order.forEach((i, k) => { rank[i] = k + 1; });
    /* 묶음별로 정답과 가장 닮은 5% 경계 — 힌트에 쓴다 */
    const edge = {}, buf = new Float32Array(N);
    for (const b of BLOCKS) {
      let m = 0;
      for (let j = 0; j < N; j++) if (j !== a && !Number.isNaN(cos[b][j])) buf[m++] = cos[b][j];
      const vals = buf.subarray(0, m).sort();          // 형식 배열 정렬(오름차순)이 일반 배열보다 몇 배 빠르다
      edge[b] = m ? vals[m - Math.max(1, Math.floor(m * 0.05))] : Infinity;
    }
    r = { rank, cos, edge, sim };
    if (cache.size > 64) cache.delete(cache.keys().next().value);
    cache.set(a, r);
  }
  return r;
}
export const ranks = a => info(a).rank;
export const similarity = (a, g) => info(a).sim[g];

/* 힌트 — 부른 곳이 정답과 특히 닮은 묶음(그 묶음에서 정답과 가장 닮은 5% 안). 가중치 큰 순, 셋까지.
   유사도 수치는 보내지 않는다. "상품이 닮았다" 정도라 정답을 역산할 수 없다 */
const HINT_SKIP = new Set(['scale']);
export function hints(a, g) {
  if (a === g) return [];
  const { cos, edge } = info(a);
  return BLOCKS.filter(b => !HINT_SKIP.has(b) && !Number.isNaN(cos[b][g]) && cos[b][g] >= edge[b] && cos[b][g] > 0)
    .sort((x, y) => W[y] - W[x]).slice(0, 3).map(b => MODEL.labels[b]);
}

/* 점수 — 정답이 100점, 그 밖은 가까운 순서 한 계단마다 0.06점씩. 소수 둘째 자리까지.
   유사도 값을 그대로 주면 여러 번 불러 정답을 좁히는 단서가 되므로 순서만 담는다 */
const STEP = 0.06;
export function score(ans, guess) {
  const r = ranks(ans)[guess];
  return r === 0 ? 100 : Math.round((100 - r * STEP) * 100) / 100;
}

/* 무한 연습 — 판마다 서버가 무작위 표(rid)를 내주고, 정답은 그 표를 비밀값으로 섞어 되찾는다 */
export function freeAnswer(rid, salt) {
  return hash(salt + ':free:' + rid) % N;
}

export function judge(ans, guess) {
  return { id: UNITS[guess].id, score: score(ans, guess), rank: ranks(ans)[guess], correct: ans === guess, near: hints(ans, guess) };
}

export { MODEL };
