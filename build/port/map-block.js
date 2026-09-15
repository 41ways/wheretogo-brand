// ══════════════════════════════ 지도 — 의미 지도
/* 브랜드 1,603개를 임베딩 유사도로 펼친 좌표(t-SNE). 가까이 모인 점일수록 닮은 브랜드다.
   캔버스 한 장에 그린다. 휠·손가락 벌리기로 확대, 끌어서 이동. 확대하면 이름이 보인다 */
var VIEW = { k:1, x:0, y:0 };          // 배율과 왼쪽 위 (지도 좌표 0~1)
var CV = null, CTX = null, CW = 0, DPR = 1, HOV = -1, HL = null, ARMED = -1;
var PAD = .035, KMAX = 14;
function cssv(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function nx(u){ return PAD + u.x * (1 - 2 * PAD); }
function ny(u){ return PAD + (1 - u.y) * (1 - 2 * PAD); }
function sx(u){ return (nx(u) - VIEW.x) * VIEW.k * CW; }
function sy(u){ return (ny(u) - VIEW.y) * VIEW.k * CW; }
function clampView(){
  VIEW.k = Math.max(1, Math.min(KMAX, VIEW.k));
  var span = 1 / VIEW.k;
  VIEW.x = Math.max(0, Math.min(1 - span, VIEW.x));
  VIEW.y = Math.max(0, Math.min(1 - span, VIEW.y));
}
function zoomAt(px, py, f){
  var mx = VIEW.x + px / (VIEW.k * CW), my = VIEW.y + py / (VIEW.k * CW);
  VIEW.k *= f; clampView();
  VIEW.x = mx - px / (VIEW.k * CW); VIEW.y = my - py / (VIEW.k * CW); clampView();
  draw();
}
function focusOn(i){
  if (VIEW.k < 2.2) return;                 // 전체를 보고 있으면 그대로 둔다
  var u = U[i], span = 1 / VIEW.k, x = nx(u), y = ny(u);
  if (x > VIEW.x + span * .1 && x < VIEW.x + span * .9 && y > VIEW.y + span * .1 && y < VIEW.y + span * .9) return;
  VIEW.x = x - span / 2; VIEW.y = y - span / 2; clampView();
}

function buildMap(){
  CV = $('#map'); CTX = CV.getContext('2d');
  var wrap = $('#mapwrap'), tip = $('#tip');
  function size(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    CW = wrap.clientWidth;
    CV.width = CW * DPR; CV.height = CW * DPR;
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(size).observe(wrap); else addEventListener('resize', size);
  size();

  var ptrs = {}, drag = null, pinch = null, moved = false, touch = false;
  function local(e){ var r = CV.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function nearest(px, py){
    var best = -1, bd = (touch ? 16 : 10) * (touch ? 16 : 10);
    for (var i = 0; i < U.length; i++) {
      var dx = sx(U[i]) - px, dy = sy(U[i]) - py, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function showTip(i, px, py){
    if (i < 0) { tip.hidden = true; return; }
    var u = U[i], g = guessOf(u.id);
    if (!easyOn() && !g && !(S.answer && S.answer.id === u.id)) { tip.hidden = true; return; }   // 하드 모드: 부른 곳만
    tip.innerHTML = esc(u.name) + '<small>' + esc(g ? (g.correct ? '정답' : pts(g.score) + ' · ' + g.rank + '번째')
      : (touch && ARMED === i ? '한 번 더 누르면 부르기' : u.sub)) + '</small>';
    tip.style.left = Math.max(60, Math.min(CW - 60, px)) + 'px';
    tip.style.top = py + 'px';
    tip.hidden = false;
  }
  function hover(e){
    var p = local(e), i = nearest(p[0], p[1]);
    if (i !== HOV) { HOV = i; draw(); }
    CV.classList.toggle('onpt', i >= 0 && easyOn());
    showTip(i, p[0], p[1]);
  }

  CV.addEventListener('pointerdown', function(e){
    touch = e.pointerType !== 'mouse';
    CV.setPointerCapture(e.pointerId);
    ptrs[e.pointerId] = local(e);
    var ids = Object.keys(ptrs);
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: VIEW.k }; drag = null; moved = true;
    } else { drag = { p: ptrs[e.pointerId], x: VIEW.x, y: VIEW.y }; moved = false; }
  });
  CV.addEventListener('pointermove', function(e){
    if (!(e.pointerId in ptrs)) { hover(e); return; }
    ptrs[e.pointerId] = local(e);
    var ids = Object.keys(ptrs);
    if (pinch && ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (pinch.k * d / pinch.d) / VIEW.k);
      return;
    }
    if (drag) {
      var p = ptrs[e.pointerId], dx = p[0] - drag.p[0], dy = p[1] - drag.p[1];
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      if (moved && VIEW.k > 1) {
        VIEW.x = drag.x - dx / (VIEW.k * CW); VIEW.y = drag.y - dy / (VIEW.k * CW); clampView(); draw();
        tip.hidden = true;
        return;
      }
    }
    hover(e);
  });
  function up(e){
    delete ptrs[e.pointerId];
    if (Object.keys(ptrs).length < 2) pinch = null;
    if (!Object.keys(ptrs).length) {
      var wasDrag = moved; drag = null;
      if (!wasDrag && e.type === 'pointerup') click(e);
    }
  }
  CV.addEventListener('pointerup', up);
  CV.addEventListener('pointercancel', up);
  CV.addEventListener('pointerleave', function(){ if (!Object.keys(ptrs).length) { HOV = -1; tip.hidden = true; draw(); } });
  function click(e){
    var p = local(e), i = nearest(p[0], p[1]);
    if (i < 0) { ARMED = -1; return; }
    if (!easyOn()) { hover(e); return; }
    /* 손가락은 처음 누르면 이름만 — 같은 점을 한 번 더 눌러야 부른다 */
    if (touch && ARMED !== i) { ARMED = i; HOV = i; draw(); showTip(i, p[0], p[1]); return; }
    ARMED = -1; tip.hidden = true;
    guess(i);
  }
  CV.addEventListener('wheel', function(e){
    e.preventDefault();
    var p = local(e);
    zoomAt(p[0], p[1], Math.exp(-e.deltaY * (e.deltaMode === 1 ? .05 : .0022)));
    tip.hidden = true;
  }, { passive:false });
  $('#zIn').addEventListener('click', function(){ zoomAt(CW / 2, CW / 2, 1.8); });
  $('#zOut').addEventListener('click', function(){ zoomAt(CW / 2, CW / 2, 1 / 1.8); });
  $('#zAll').addEventListener('click', function(){ VIEW.k = 1; VIEW.x = VIEW.y = 0; draw(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
}

function draw(){
  if (!CTX || !CW) return;
  var g = CTX, k = VIEW.k;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.clearRect(0, 0, CW, CW);
  var hint = document.querySelector('.maphint'); if (hint) hint.style.opacity = k > 1 ? 0 : 1;   // 확대하면 이름과 겹치므로 숨긴다
  var cDot = cssv('--land-line'), cInk = cssv('--ink'), cPanel = cssv('--sea'), cAcc = cssv('--accent'), cFaint = cssv('--faint');
  var small = U.length < 400;   // 유명 모드처럼 목록이 작으면 점을 키우고 덜 확대해도 이름을 보인다
  var r = Math.min(small ? 5 : 3.4, 1.35 * Math.sqrt(k)) * (CW < 480 ? .85 : 1) * (small ? 1.7 : 1);
  var inView = function(u){ var x = sx(u), y = sy(u); return x > -20 && y > -20 && x < CW + 20 && y < CW + 20; };
  var sug = $('#sug'), hl = HL && sug && !sug.hidden ? new Set(HL) : null, got = {};
  S.list.forEach(function(q){ got[q.id] = q; });
  var ansId = S.answer && S.answer.id;

  // 모든 브랜드
  g.fillStyle = cDot;
  for (var i = 0; i < U.length; i++) {
    var u = U[i];
    if (got[u.id] || u.id === ansId || (hl && hl.has(i)) || !inView(u)) continue;
    g.beginPath(); g.arc(sx(u), sy(u), r, 0, 6.2832); g.fill();
  }
  // 찾기 목록에 뜬 곳 (업종 이름으로 찾았을 때)
  if (hl) {
    g.fillStyle = cInk;
    hl.forEach(function(i){ var u = U[i]; if (!got[u.id] && u.id !== ansId) { g.beginPath(); g.arc(sx(u), sy(u), r + 1.2, 0, 6.2832); g.fill(); } });
  }
  // 부른 곳 — 먼 곳부터 칠해 가까운 곳이 위로
  S.list.slice().sort(function(a, b){ return b.rank - a.rank; }).forEach(function(q){
    var u = U[BY[q.id]]; if (!u || q.correct) return;
    var x = sx(u), y = sy(u), rr = r + 2.6;
    g.beginPath(); g.arc(x, y, rr + 1.6, 0, 6.2832); g.fillStyle = cPanel; g.fill();
    g.beginPath(); g.arc(x, y, rr, 0, 6.2832); g.fillStyle = heat(q.rank); g.fill();
    if (q.id === S.lastId) { g.beginPath(); g.arc(x, y, rr + 4, 0, 6.2832); g.strokeStyle = cInk; g.lineWidth = 1.6; g.stroke(); }
  });
  if (ansId && BY[ansId] != null) {
    var a = U[BY[ansId]], ax = sx(a), ay = sy(a);
    g.beginPath(); g.arc(ax, ay, r + 8, 0, 6.2832); g.strokeStyle = cAcc; g.lineWidth = 2.4; g.stroke();
    g.beginPath(); g.arc(ax, ay, r + 3.4, 0, 6.2832); g.fillStyle = cInk; g.fill();
  }
  if (HOV >= 0) {
    var h = U[HOV];
    g.beginPath(); g.arc(sx(h), sy(h), r + 5, 0, 6.2832); g.strokeStyle = easyOn() ? cAcc : cInk; g.lineWidth = 1.6; g.stroke();
  }

  // 이름 — 부른 곳은 늘, 확대하면 보이는 곳까지
  var placed = [];
  function label(u, txt, font, color){
    g.font = font;
    var w = g.measureText(txt).width, x = sx(u) + 7, y = sy(u) - 6;
    if (x + w > CW - 4) x = sx(u) - 7 - w;
    for (var t = 0; t < placed.length; t++) {
      var p = placed[t];
      if (x < p[0] + p[2] && x + w > p[0] && Math.abs(y - p[1]) < 13) return false;
    }
    placed.push([x, y, w]);
    g.lineWidth = 3; g.strokeStyle = cPanel; g.strokeText(txt, x, y);
    g.fillStyle = color; g.fillText(txt, x, y);
    return true;
  }
  g.textBaseline = 'middle';
  var mono = '"Gothic A1",system-ui,sans-serif';
  if (ansId && BY[ansId] != null) label(U[BY[ansId]], U[BY[ansId]].name, '700 13px ' + mono, cInk);
  if (S.lastId && BY[S.lastId] != null && S.lastId !== ansId) label(U[BY[S.lastId]], U[BY[S.lastId]].name, '700 12.5px ' + mono, cInk);
  S.list.slice().sort(function(a, b){ return a.rank - b.rank; }).forEach(function(q){
    if (q.id !== S.lastId && q.id !== ansId && inView(U[BY[q.id]])) label(U[BY[q.id]], U[BY[q.id]].name, '600 11px ' + mono, cInk);
  });
  if (k >= (small ? 1.5 : 2.6) && easyOn()) {
    var budget = 90;
    for (var j = 0; j < U.length && budget > 0; j++) {
      var v = U[j];
      if (got[v.id] || !inView(v)) continue;
      if (label(v, v.name, '500 10.5px ' + mono, cFaint)) budget--;
    }
  }
}
function paintMap(){ draw(); }

