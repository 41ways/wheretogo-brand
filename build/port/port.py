# 행선지(wheretogo) index.html → 행선지4: Brand index.html
#   python3 build/port/port.py ../wheretogo/index.html index.html
# 행선지 화면이 바뀌면 다시 돌린다. 바꿀 문장이 원본에 없으면 assert 로 멈추니, 그 자리를 새 원본에 맞춰 고친다.
import hashlib, re, sys
from pathlib import Path

SRC, DST = sys.argv[1], sys.argv[2]
HERE = Path(__file__).parent
ROOT = HERE.parent.parent
WORD = 'BRAND'
s = open(SRC, encoding='utf-8').read()


def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:100])
    s = s.replace(a, b)


def block(start, end, new, keep_end=True):
    global s
    i = s.index(start); j = s.index(end, i)
    s = s[:i] + new + (s[j:] if keep_end else s[j + len(end):])


N = 1603
VER = hashlib.sha1((ROOT / 'data' / 'brands.json').read_bytes()).hexdigest()[:10]

# ── 머리
rep('<title>행선지 — 오늘의 시·군 맞히기</title>', '<title>행선지4: Brand — 오늘의 브랜드 맞히기</title>')
s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="브랜드 {N:,}개 가운데 오늘의 브랜드를 맞히는 하루 한 문제 게임. 설명·상품·가격대·시가총액 같은 특징을 임베딩해 닮은 순서로 점수를 매긴다.">', s, 1)
s = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="행선지4: Brand — 오늘의 브랜드 맞히기">', s, 1)
s = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="에르메스부터 카길까지 {N:,}개 중 오늘의 브랜드를 찾아라. 닮은 순서 점수만 보고, 제일 적게 불러 맞힌 사람이 1등.">', s, 1)
rep("<text y='26' font-size='26'>📍</text>", "<text y='26' font-size='26'>🏷️</text>")

# ── 색: 강조색만 자홍으로 가른다 (World 는 군청, Cosmo 는 금빛)
rep('--accent:#e0301e; --accent-soft:#fae2de;', '--accent:#c2185b; --accent-soft:#fbe4ee;')
rep('--rule:#111111; --stamp:#e0301e;', '--rule:#111111; --stamp:#c2185b;')
rep('--accent:#ff4a38; --accent-soft:#38201c;', '--accent:#ff5c9d; --accent-soft:#3a1827;')
rep('--rule:#f2f1ee; --stamp:#ff4a38;', '--rule:#f2f1ee; --stamp:#ff5c9d;')
rep('.redbar{width:min(620px,84%);height:8px;background:var(--accent);margin-top:30px}',
    '.redbar{width:min(620px,84%);height:8px;background:var(--accent);margin-top:30px}\n.bigname .two{color:var(--accent)}')
rep('.legend i{flex:1;height:6px;background:linear-gradient(90deg,#e0301e,#e96e5a 28%,#f0b6aa 60%,#b9b7b0)}',
    '.legend i{flex:1;height:6px;background:linear-gradient(90deg,#c2185b,#de6a9c 28%,#ecb8d0 60%,#b9b7b0)}')

# ── 지도 → 캔버스 의미 지도
rep('.map{position:relative;background:var(--sea);border:1px solid var(--line)}\n.map svg{display:block;width:100%;height:auto}',
    '''.map{position:relative;background:var(--sea);border:1px solid var(--line);aspect-ratio:1/1;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
.map canvas{display:block;width:100%;height:100%;cursor:grab}
.map canvas.onpt{cursor:pointer}
.map canvas:active{cursor:grabbing}
.zbtns{position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:5px;z-index:4}
.zbtns button{width:32px;height:30px;border:1.5px solid var(--ink);background:var(--panel);font-size:16px;font-weight:700;line-height:1;padding:0}
.zbtns button:hover{border-color:var(--accent);color:var(--accent)}
.zbtns #zAll{font-size:10.5px;letter-spacing:-.02em}
.maphint{position:absolute;left:10px;bottom:8px;font-size:10.5px;color:var(--faint);pointer-events:none;letter-spacing:.03em}
.nr{display:block;font-size:11px;color:var(--accent);margin-top:2px;letter-spacing:.02em}
.last .near{grid-column:1/-1;font-size:12px;color:var(--dim);margin-top:4px}
.last .near b{color:var(--accent);font-weight:700}
.bcard{text-align:center;margin:0 0 14px}
.bcard .sec{font-size:11px;color:var(--faint);letter-spacing:.1em}
.bcard .prod{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:8px}
.bcard .prod span{font-size:11.5px;border:1px solid var(--line);padding:2px 8px;color:var(--dim)}''')
rep('<h1 class="bigname">행선지</h1>', '<h1 class="bigname">행선지<span class="two">4</span></h1>')
rep('<p class="eyebrow">오늘의 시·군 맞히기</p>', f'<p class="eyebrow">{WORD} · 오늘의 브랜드 맞히기</p>')
block('    <p class="lede">전국 시·군', '    <div class="tstats"', f'''    <p class="lede">브랜드 <b id="tn">{N:,}</b>곳 가운데 오늘 한 곳이 정답입니다.<br>
      부른 브랜드가 정답과 <b>몇 번째로 닮았는지</b>만 알려 줍니다.<br>
      닮음은 설명·상품·가격대·시가총액까지 섞어서 잽니다.</p>
''')
rep('<h1 id="toTitle" title="처음으로"><span class="ttl">행선지</span> <span class="no" id="no"></span></h1>',
    f'<h1 id="toTitle" title="처음으로"><span class="ttl">행선지<span style="color:var(--accent)">4</span></span> <span class="w" style="font-family:var(--mono);font-size:.46em;font-weight:600;color:var(--accent);letter-spacing:.06em">{WORD}</span> <span class="no" id="no"></span></h1>')
rep('<p class="sub">가까운 순서만 보고 오늘의 시·군을 맞히세요.</p>', '<p class="sub">닮은 순서만 보고 오늘의 브랜드를 맞히세요.</p>')
rep('<section class="card mapbox" aria-label="지도">', '<section class="card mapbox" aria-label="의미 지도">')
rep('        <svg id="map" role="img" aria-label="전국 시·군 지도"></svg>',
    '''        <canvas id="map" role="img" aria-label="브랜드 의미 지도 — 닮은 브랜드끼리 가까이 모여 있습니다"></canvas>
        <div class="zbtns"><button id="zIn" type="button" aria-label="확대">+</button><button id="zOut" type="button" aria-label="축소">−</button><button id="zAll" type="button">전체</button></div>
        <div class="maphint">닮은 브랜드끼리 모여 있습니다 · 휠·두 손가락으로 확대</div>''')
rep('<div class="legend"><span>가까움</span><i></i><span>멂</span></div>', '<div class="legend"><span>닮음</span><i></i><span>다름</span></div>')
rep('<div class="credit">경계 vuski/admdongkor (2026.7.1 행정동) · 청사 위치 © OpenStreetMap 기여자</div>',
    '<div class="credit">브랜드 특징 11개 묶음 임베딩 · 지도는 t-SNE · 시가총액 Yahoo Finance · <a href="https://github.com/41ways/brand-embedding" style="color:inherit">brand-embedding</a></div>')
rep('placeholder="시·군 이름 (수원, 경기, ㅊㅊ …)"', 'placeholder="브랜드 이름 (나이키, apple, 커피 …)"')
rep('<thead><tr><th>#</th><th>시·군</th><th style="text-align:right">점수</th><th>가까운 순서</th></tr></thead>',
    '<thead><tr><th>#</th><th>브랜드</th><th style="text-align:right">점수</th><th>닮은 순서</th></tr></thead>')
rep('<div class="listhead"><span id="count">부른 곳 0</span><span>가까운 순</span></div>', '<div class="listhead"><span id="count">부른 곳 0</span><span>닮은 순</span></div>')
rep('<div class="empty" id="empty">아무 데나 하나 불러 보세요.<br>점수를 보고 좁혀 가면 됩니다.</div>',
    '<div class="empty" id="empty">아무 브랜드나 하나 불러 보세요.<br>점수와 "닮은 점"을 보고 좁혀 가면 됩니다.</div>')

# ── 규칙
block('      <li>매일 자정(한국 시간)에 전국', '    </ul>', f'''      <li>매일 자정(한국 시간)에 브랜드 <b>{N:,}곳</b> 중 하나가 정답이 됩니다. 럭셔리 하우스부터 곡물 무역회사, 작은 국내 브랜드까지 모두 정답이 될 수 있습니다.</li>
      <li>한 곳을 부르면 그 브랜드가 <b>정답과 몇 번째로 닮았는지</b>와 그 순서로 매긴 <b>100점 만점 점수</b>를 알려 줍니다. 한 계단마다 <b>0.06점</b>씩 낮아집니다 — 1번째로 닮았으면 99.94점.</li>
      <li>닮음은 브랜드마다 모은 특징 11가지를 임베딩해 잽니다 — <b>설명</b>, 파는 <b>상품</b>, 브랜드 <b>이미지</b>(원형), 대표 <b>가격대</b>, 업계 안 위치, <b>업종</b>, 창업·소유, <b>시가총액</b>, 출신, 소속 그룹, 인지도. 업종이 달라도 가격대와 이미지가 닮으면 가까워집니다.</li>
      <li>부른 곳이 어떤 특징에서 정답과 특히 닮았으면(그 특징에서 정답과 가장 닮은 5% 안) <b>닮은 점</b>으로 알려 줍니다 — 예: <b>상품 · 가격대</b>.</li>
      <li>지도는 닮은 브랜드끼리 모이게 펼친 <b>의미 지도</b>입니다. 점에 마우스를 올리면 이름이 보이고, <b>눌러서 바로 부를 수</b> 있습니다 (손가락은 한 번 눌러 이름을 보고 한 번 더 눌러 부릅니다). 휠이나 두 손가락으로 확대하면 이름이 보입니다.</li>
      <li><b>하루 한 판</b>입니다. 맞히거나 포기하면 그날은 끝이고, <b>무한 모드</b>는 오늘 문제와 따로 정답을 뽑아 몇 판이든 할 수 있습니다 (순위에 오르지 않습니다).</li>
      <li><b>하드 모드</b>는 무한 모드에서 지도 도움을 끈 판입니다. 점 이름이 보이지 않고 <b>이름을 적어서만</b> 부릅니다.</li>
      <li>시계는 <b>첫 추측부터</b> 정답까지 서버가 잽니다. 순위는 <b>적게 부른 순</b>, 횟수가 같으면 빠른 순입니다. 포기하면 순위에 오르지 않습니다.</li>
      <li>한글·영문 이름과 별칭, 초성으로 찾을 수 있습니다 — <b>ㄴㅇㅋ</b> → 나이키, <b>lvmh</b>. 업종 이름을 치면 그 업종이 모두 나오고 지도에 표시됩니다 — <b>커피</b>, <b>슈퍼카</b>, <b>명품</b>, <b>재벌</b>.</li>
      <li>브랜드 특징은 LLM 으로 모은 뒤 검사한 값이고, 시가총액은 상장사 티커로 받은 시세입니다. 틀린 곳이 있을 수 있습니다.</li>
''')

# ── 스크립트
rep("var API = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname) ? 'http://localhost:8832' : 'https://eodigun.41ways.workers.dev';",
    "var API = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname) ? 'http://localhost:8841' : 'https://wheretogo-brand.41ways.workers.dev';")
rep("var SHARE_URL = 'https://41ways.github.io/wheretogo/';", "var SHARE_URL = 'https://41ways.github.io/wheretogo-brand/';")
s = s.replace("'eodigun-", "'brand-").replace("'wheretogo-free'", "'brand-free'").replace("'wheretogo-hard'", "'brand-hard'")
rep('  day:null, no:null, n:165, offset:0,', f'  day:null, no:null, n:{N}, offset:0,')
rep('var STOPS = [[0,[185,183,176]],[.55,[240,182,170]],[.82,[233,110,90]],[1,[224,48,30]]];',
    'var STOPS = [[0,[185,183,176]],[.55,[236,184,208]],[.82,[222,106,156]],[1,[194,24,91]]];')
rep("  if (rank <= 3) return '코앞';\n  if (rank <= 10) return '아주 가까움';\n  if (rank <= 30) return '가까움';\n  if (rank <= 70) return '그럭저럭';\n  if (rank <= 120) return '멂';\n  return '아주 멂';",
    "  if (rank <= 5) return '코앞';\n  if (rank <= 25) return '아주 닮음';\n  if (rank <= 100) return '닮음';\n  if (rank <= 300) return '그럭저럭';\n  if (rank <= 800) return '다름';\n  return '아주 다름';")
rep("'지도에 마우스를 올려 보고, 눌러서 부르세요. 이름을 적어도 됩니다.'", "'지도 점에 마우스를 올려 보고, 눌러서 부르세요. 이름을 적어도 됩니다.'")
rep("'지도를 누르면 이름이 보이고, 한 번 더 누르면 부릅니다.'", "'지도 점을 누르면 이름이 보이고, 한 번 더 누르면 부릅니다.'")

block('// ══════════════════════════════ 지도\n', '// ══════════════════════════════ 찾기 (이름·초성)', (HERE / 'map-block.js').read_text())
block('// ══════════════════════════════ 찾기 (이름·초성)', 'var sugIdx = [], sugSel = 0', (HERE / 'search-block.js').read_text())
rep("  box.hidden = false;\n}", "  box.hidden = false;\n  draw();\n}")
rep("  if (!sugIdx.length) { msg('\"' + q + '\" — 그런 시·군은 없습니다', true); return; }",
    "  if (!sugIdx.length) { msg('\"' + q + '\" — 그런 브랜드는 없습니다', true); return; }")
rep("  /* 도·권역 이름만 친 채 Enter 는 목록 첫 곳을 부르지 않는다 — 골라야 부른다 */", "  /* 업종 이름만 친 채 Enter 는 목록 첫 곳을 부르지 않는다 — 골라야 부른다 */")

rep('var M = null;            // map.json', 'var M = null;            // (행선지 지도 자리 — 쓰지 않음)')

# 부른 결과에 닮은 점(near)을 담는다
rep("    S.list.push({ id:r.id, score:r.score, rank:r.rank, correct:r.correct, no:S.list.length + 1 });",
    "    S.list.push({ id:r.id, score:r.score, rank:r.rank, correct:r.correct, near:r.near || [], no:S.list.length + 1 });\n    focusOn(BY[r.id]);")
rep("      S.list = m.list.map(function(g, i){ return { id:g.id, score:g.score, rank:g.rank, correct:g.correct, no:i + 1 }; });",
    "      S.list = m.list.map(function(g, i){ return { id:g.id, score:g.score, rank:g.rank, correct:g.correct, near:g.near || [], no:i + 1 }; });")
rep("      '<div class=\"rk num\">' + (S.n - 1) + '곳 중 ' + g.rank + '번째로 가까움</div>' +",
    "      '<div class=\"rk num\">' + (S.n - 1) + '곳 중 ' + g.rank + '번째로 닮음</div>' +\n" +
    "      '<div class=\"near\">' + (g.near && g.near.length ? '닮은 점 <b>' + esc(g.near.join(' · ')) + '</b>' : '특별히 닮은 점 없음') + '</div>' +")
rep("'</b><span class=\"s\">' + esc(u.sub) + '</span></td>' +",
    "'</b><span class=\"s\">' + esc(u.sub) + '</span>' + (g.near && g.near.length ? '<span class=\"nr\">' + esc(g.near.join(' · ')) + '</span>' : '') + '</td>' +")
rep("  var sq = S.list.map(function(g){ return g.correct ? '📍' : g.rank <= 5 ? '🟥' : g.rank <= 25 ? '🟧' : '⬜'; });",
    "  var sq = S.list.map(function(g){ return g.correct ? '🏷️' : g.rank <= 25 ? '🟪' : g.rank <= 100 ? '🟥' : g.rank <= 300 ? '🟧' : '⬜'; });")
rep("  var t = '행선지 제' + S.no + '호 — '", "  var t = '행선지4 Brand 제' + S.no + '호 — '")
s = s.replace("'📍 '", "'🏷️ '")

# 정답 칸 윤곽 → 브랜드 카드
block('/* 정답 칸의 윤곽', 'function renderDone(){', '''/* 정답 브랜드 — 업종과 파는 상품 */
function shapeSvg(id){
  var i = BY[id];
  if (i == null) return '';
  var u = U[i];
  return '<div class="bcard"><div class="sec">' + esc(u.sector + ' › ' + u.sub + ' · ' + u.country) + '</div>' +
    (u.products && u.products.length ? '<div class="prod">' + u.products.map(function(p){ return '<span>' + esc(p) + '</span>'; }).join('') + '</div>' : '') + '</div>';
}

''')

# 시작 — 브랜드 목록을 받고 지도를 세운다
block("fetch('map.json').then(function(r){ return r.json(); }).then(function(m){", "  buildMap();", f'''fetch('data/brands.json?v={VER}').then(function(r){{ return r.json(); }}).then(function(m){{
  U = m.brands;
  U.forEach(function(u, i){{
    BY[u.id] = i;
    u.cho = cho(u.name);
    u.keys = [norm(u.name), norm(u.en)].concat(u.alias.map(norm)).filter(Boolean);
  }});
  buildGroups();
''')
rep("}).catch(function(e){ msg('지도를 못 불러왔습니다: ' + e.message, true); });", "}).catch(function(e){ msg('브랜드 목록을 못 불러왔습니다: ' + e.message, true); });")

leftover = [w for w in ('시·군', '청사', 'map.json', 'eodigun', '도·권역') if w in s]
assert not leftover, leftover
open(DST, 'w', encoding='utf-8').write(s)
print('ok', len(s) // 1024, 'KB')
