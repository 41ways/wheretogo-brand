// node test-game.js — 정답 순서·유사도 순위·점수·힌트가 말이 되는지 본다
import { UNITS, N, INDEX, EPOCH, kstDay, puzzleNo, answerIndex, judge, ranks, hints, MODEL } from './src/game.js';
const assert = (c, m) => { if (!c) { console.error('실패:', m); process.exit(1); } };
const id = s => { assert(INDEX.has(s), s); return INDEX.get(s); };
const name = i => UNITS[i].name;

assert(N === 1603, '브랜드 수 ' + N);
assert(puzzleNo(kstDay(Date.UTC(2026, 8, 14, 15))) === 1, '9/15 가 1번');
assert(puzzleNo(kstDay(Date.UTC(2026, 8, 14, 14, 59))) === 0, '9/15 자정 전은 0번');

// 한 바퀴(N일) 안에 같은 정답이 없어야
const seen = new Set();
for (let d = EPOCH; d < EPOCH + N; d++) seen.add(answerIndex(d, 'salt-a'));
assert(seen.size === N, '한 바퀴 중복');
assert(answerIndex(EPOCH, 'salt-a') !== answerIndex(EPOCH, 'salt-b') || answerIndex(EPOCH + 1, 'salt-a') !== answerIndex(EPOCH + 1, 'salt-b'), '소금이 순서를 바꿔야');

// 파이썬(export_game.py)이 계산한 상위 20 과 같아야 — 양자화 반올림으로 순서가 한두 자리 바뀌는 건 허용
let t0 = Date.now();
for (const [a, top] of Object.entries(MODEL.golden)) {
  const r = ranks(id(a));
  const mine = UNITS.map((_, i) => i).filter(i => r[i] >= 1 && r[i] <= 20).map(i => UNITS[i].id);
  const overlap = top.filter(x => mine.includes(x)).length;
  assert(overlap >= 18, a + ' 상위 20 겹침 ' + overlap);
  assert(r[id(top[0])] <= 2, a + ' 1위가 ' + top[0] + ' 가 아님 (' + r[id(top[0])] + ')');
}
console.log('파이썬과 상위 20 일치 ·', Object.keys(MODEL.golden).length, '개 정답 ·', ((Date.now() - t0) / Object.keys(MODEL.golden).length).toFixed(1), 'ms/정답');

// 순위: 정답 0, 나머지 1..N-1 이 한 번씩
const ans = id('lamborghini');
const rs = Array.from(ranks(ans)).sort((a, b) => a - b);
assert(rs.every((r, i) => r === i), '순위가 0..N-1');
const near = UNITS.map((_, i) => judge(ans, i)).sort((a, b) => a.rank - b.rank).slice(1, 8);
console.log('람보르기니 근처', near.map(j => name(INDEX.get(j.id)) + ' ' + j.score.toFixed(2) + (j.near.length ? '[' + j.near.join('·') + ']' : '')).join(', '));
assert(ranks(ans)[id('ferrari')] <= 5, '람보르기니-페라리');

// 점수
const all = UNITS.map((_, i) => judge(ans, i));
assert(all[ans].score === 100, '정답이 100점');
const byRank = all.slice().sort((a, b) => a.rank - b.rank);
assert(byRank.every((j, i) => i === 0 || j.score < byRank[i - 1].score), '가까울수록 높은 점수');
assert(byRank[1].score === 99.94 && byRank[N - 1].score > 0, '1위 99.94, 꼴찌도 0 초과');

// 힌트: 정답엔 없음, 셋 이하, 먼 곳은 대체로 없음
assert(hints(ans, ans).length === 0, '정답 힌트 없음');
assert(all.every(j => j.near.length <= 3), '힌트 셋 이하');
const farHint = byRank.slice(-200).filter(j => j.near.length).length;
console.log('먼 200곳 중 힌트 붙은 곳', farHint);
console.log('파텍필립 → 람보르기니 힌트', hints(id('patek-philippe'), id('lamborghini')));
console.log('통과');
