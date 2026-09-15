/* 유사도 게임 엔진 — 브랜드 목록과 압축 모델을 받아 순위·점수·힌트를 계산한다.
   기본(1,603개)과 유명 모드(200개)가 같은 코드를 쓴다. 모델은 brand-embedding 의 embed/export_game.py 가 만든다 */

export function hash(str) {                       // xmur3
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function b64(s) {
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function makeGame(DATA, MODEL, { step = 0.06, freeKey = 'free' } = {}) {
  const UNITS = DATA.brands.map(b => ({ id: b.id, name: b.name, full: b.name + (b.en && b.en !== b.name ? ' (' + b.en + ')' : '') }));
  const N = UNITS.length;
  const INDEX = new Map(UNITS.map((u, i) => [u.id, i]));
  if (MODEL.n !== N) throw new Error('모델과 브랜드 목록의 개수가 다름');
  const HINT_PCT = MODEL.hint_pct || 0.05;
  /* 출신은 한국 브랜드가 많아 먼 곳에도 자주 겹친다 — 순위가 이 비율 안일 때만 힌트로 (없으면 늘) */
  const ORIGIN_MAX = MODEL.origin_rank_frac ? Math.round(N * MODEL.origin_rank_frac) : Infinity;

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

  const cache = new Map();
  function info(a) {
    let r = cache.get(a);
    if (!r) {
      const { cos, sim } = rowOf(a);
      const order = Int32Array.from({ length: N }, (_, i) => i).sort((x, y) => sim[y] - sim[x] || x - y).filter(i => i !== a);
      const rank = new Int16Array(N);
      order.forEach((i, k) => { rank[i] = k + 1; });
      const edge = {}, buf = new Float32Array(N);
      for (const b of BLOCKS) {
        let m = 0;
        for (let j = 0; j < N; j++) if (j !== a && !Number.isNaN(cos[b][j])) buf[m++] = cos[b][j];
        const vals = buf.subarray(0, m).sort();
        edge[b] = m ? vals[m - Math.max(1, Math.floor(m * HINT_PCT))] : Infinity;
      }
      r = { rank, cos, edge, sim };
      if (cache.size > 64) cache.delete(cache.keys().next().value);
      cache.set(a, r);
    }
    return r;
  }
  const ranks = a => info(a).rank;

  const HINT_SKIP = new Set(['scale']);
  function hints(a, g) {
    if (a === g) return [];
    const { cos, edge, rank } = info(a);
    return BLOCKS.filter(b => !HINT_SKIP.has(b) && !Number.isNaN(cos[b][g]) && cos[b][g] >= edge[b] && cos[b][g] > 0
                              && !(b === 'origin' && rank[g] > ORIGIN_MAX))
      .sort((x, y) => W[y] - W[x]).slice(0, 3).map(b => MODEL.labels[b]);
  }

  function score(ans, guess) {
    const r = ranks(ans)[guess];
    return r === 0 ? 100 : Math.round((100 - r * step) * 100) / 100;
  }
  const freeAnswer = (rid, salt) => hash(salt + ':' + freeKey + ':' + rid) % N;
  const judge = (ans, guess) => ({ id: UNITS[guess].id, score: score(ans, guess), rank: ranks(ans)[guess], correct: ans === guess, near: hints(ans, guess) });

  return { UNITS, N, INDEX, MODEL, ranks, hints, score, judge, freeAnswer, similarity: (a, g) => info(a).sim[g] };
}
