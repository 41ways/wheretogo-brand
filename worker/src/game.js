/* 행선지4: Brand — 정답 고르기와 유사도·순위·점수. 서버와 테스트가 같이 쓴다
   유사도 모델은 brand-embedding 저장소의 embed/export_game.py 가 만든다 (model.json). */
import DATA from '../../data/brands.json' with { type: 'json' };
import MODEL from './model.json' with { type: 'json' };

import FAMOUS_DATA from '../../data/brands_famous.json' with { type: 'json' };
import FAMOUS_MODEL from './model_famous.json' with { type: 'json' };
import { makeGame, hash } from './engine.js';

/* 기본 판(1,603개) — 오늘의 문제·순위·무한·하드 모드 */
const BASE = makeGame(DATA, MODEL, { step: 0.06, freeKey: 'free' });
export const { UNITS, N, INDEX, ranks, hints, score, judge, freeAnswer, similarity } = BASE;
/* 유명 모드(200개) — 기록 없는 연습 판. 점수는 한 계단 0.5점 */
export const FAMOUS = makeGame(FAMOUS_DATA, FAMOUS_MODEL, { step: 0.5, freeKey: 'famous' });

/* 한국 날짜 번호. 자정(KST)에 다음 문제로 넘어간다 */
export const kstDay = (ms = Date.now()) => Math.floor((ms + 9 * 3600e3) / 86400e3);
/* 1번 문제 = 2026-09-15 (KST) */
export const EPOCH = kstDay(Date.UTC(2026, 8, 14, 15));
export const puzzleNo = day => day - EPOCH + 1;

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

export { MODEL };
