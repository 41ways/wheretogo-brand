// ══════════════════════════════ 찾기 (한글·영문 이름·별칭·초성·업종)
var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
function cho(s){
  return Array.from(s).map(function(c){
    var k = c.charCodeAt(0) - 0xAC00;
    return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : c;
  }).join('');
}
function norm(s){ return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[\s·\-.&'’!+]/g, '').toLowerCase(); }

/* 업종 이름을 끝까지 치면 그 업종 브랜드를 전부 가나다순으로 — 커피 → 커피·차 브랜드, 럭셔리 → 럭셔리 하우스·슈퍼카·뷰티.
   대분류·중분류 이름을 · 로 쪼갠 낱말에 한국에서 흔히 쓰는 말을 더했다. 브랜드 이름과 똑같은 말이면 브랜드가 먼저다 */
var GROUPS = {};
var GROUP_EXTRA = {
  '명품':['럭셔리하우스', '하이엔드시계', '주얼리', '럭셔리뷰티'], '화장품':['뷰티·퍼스널케어'], '코스메틱':['뷰티·퍼스널케어'],
  '카페':['커피·차', '카페체인'], '술':['주류'], '맥주':['주류'], '햄버거':['패스트푸드'], '치킨':['배달·프랜차이즈'],
  '차':['완성차', '럭셔리·슈퍼카', '전기차'], '자동차':['자동차·모빌리티'], '슈퍼카':['럭셔리·슈퍼카'], '오토바이':['이륜차'],
  '폰':['스마트폰·가전'], '가전':['스마트폰·가전'], 'IT':['전자·IT'], '앱':['인터넷·플랫폼·게임'], 'SNS':['SNS·메신저'],
  'OTT':['콘텐츠스트리밍'], '스트리밍':['콘텐츠스트리밍'], '엔터':['엔터테인먼트·음반'], '기획사':['엔터테인먼트·음반'],
  '재벌':['한국재벌'], '그룹':['기업집단'], '대기업':['기업집단'], '항공':['항공사'], '호텔':['호텔·리조트'], '테마파크':['크루즈·테마파크'],
  '쇼핑':['유통·이커머스'], '온라인쇼핑':['이커머스'], '마트':['대형마트·창고형'], '카드':['카드·결제'], '코인':['암호화폐'],
  '석유':['석유·가스'], '조선':['조선·중공업'], '방산':['항공우주·방산'], '택배':['택배·특송'], '해운':['해운'],
  '운동화':['신발'], '스포츠':['스포츠·아웃도어'], '향수':['향수·니치향수'], '편집숍':['뷰티편집숍', '명품·패션플랫폼'],
  '제약':['제약', '바이오', '일반의약품·소비자헬스'], '장난감':['완구·캐릭터'], '캐릭터':['완구·캐릭터']
};
function buildGroups(){
  var add = function(word, i){ var w = norm(word); if (w.length < 2 && !/^[a-z]+$/.test(w)) return; (GROUPS[w] = GROUPS[w] || new Set()).add(i); };
  var byName = {};
  U.forEach(function(u, i){
    [u.sector, u.sub].forEach(function(s){
      (byName[norm(s)] = byName[norm(s)] || []).push(i);
      add(s, i);
      s.split('·').forEach(function(p){ add(p, i); });
    });
  });
  Object.keys(GROUP_EXTRA).forEach(function(w){
    GROUP_EXTRA[w].forEach(function(s){ (byName[norm(s)] || []).forEach(function(i){ add(w, i); }); });
  });
}
function regionQuery(q){
  q = norm(q);
  var grp = GROUPS[q];
  if (!grp || grp.size < 2) return null;
  if (U.some(function(u){ return u.keys.some(function(k){ return k === q; }); })) return null;
  return Array.from(grp).sort(function(a, b){ return U[a].name < U[b].name ? -1 : 1; });
}
function search(q){
  var rg = regionQuery(q);
  HL = rg; draw();
  if (rg) return rg;
  q = norm(q);
  if (!q) return [];
  var onlyCho = /^[ㄱ-ㅎ]+$/.test(q), out = [];
  U.forEach(function(u, i){
    var sc = null;            // 낮을수록 위. 딱 맞으면 -1
    if (onlyCho) {
      if (u.cho.indexOf(q) === 0) sc = 0;
      else if (u.cho.indexOf(q) > 0) sc = 2;
    } else {
      u.keys.forEach(function(k, j){
        var s = k === q ? -1 : k.indexOf(q) === 0 ? 0 : k.indexOf(q) > 0 ? 1 : null;
        if (s !== null) { s += j ? .5 : 0; if (sc === null || s < sc) sc = s; }   // 한글 이름이 영문·별칭보다 반 계단 위
      });
    }
    if (sc !== null) out.push([sc, u.name.length, i]);
  });
  out.sort(function(a, b){ return a[0] - b[0] || a[1] - b[1] || (U[a[2]].name < U[b[2]].name ? -1 : 1); });
  return out.slice(0, 8).map(function(x){ return x[2]; });
}

