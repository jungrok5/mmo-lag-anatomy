/* =========================================================================
   i18n.js — 번역. 한국어가 원문이고, 다른 언어는 빌드가 window.I18N 에 사전을 넣는다.
   규칙은 docs/I18N_GUIDE.md.

   TR`한국어 ${값} 문장`   화면에 나오는 한국어 글자는 모두 이 태그로 감싼다.
                           사전의 열쇠는 원문 그대로이고, ${…} 자리는 {0}, {1} …로 바뀐다.
                           예: TR`원인 ${n}가지` → 열쇠 "원인 {0}가지" → 영어 "{0} causes"
                           사전에 없으면(한국어 판 포함) 원문을 그대로 돌려준다.
   I18N.t(문자열)          데이터처럼 이미 만들어진 문자열 하나를 번역
   I18N.applyData(객체)    객체 안의 한국어 문자열을 모두 번역(빌드 도구가 DATA에 쓴다)

   브라우저와 Node 도구(tools/site.cjs 등)가 함께 쓴다.
   ========================================================================= */
(function (g) {
  const I = g.I18N || (g.I18N = {});
  if (!I.lang) I.lang = 'ko';
  if (!I.dict) I.dict = {};
  const HAN = /[가-힣]/;
  // 같은 자리의 태그는 같은 strings 배열을 받으므로 열쇠를 한 번만 만든다
  const keys = new WeakMap();
  const keyOf = strs => {
    let k = keys.get(strs);
    if (k === undefined) {
      k = strs[0];
      for (let i = 1; i < strs.length; i++) k += '{' + (i - 1) + '}' + strs[i];
      keys.set(strs, k);
    }
    return k;
  };
  g.TR = function (strs) {
    const k = keyOf(strs);
    const t = I.dict[k];
    const n = arguments.length - 1;
    if (t === undefined) {
      if (!n) return k;
      let out = strs[0];
      for (let i = 0; i < n; i++) out += String(arguments[i + 1]) + strs[i + 1];
      return out;
    }
    if (!n) return t;
    const vals = arguments;
    return t.replace(/\{(\d+)\}/g, (m, i) => (+i < n ? vals[+i + 1] : m));
  };
  I.t = s => (typeof s === 'string' && I.dict[s] !== undefined ? I.dict[s] : s);
  I.applyData = function walk(o) {
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = typeof o[i] === 'string' ? (HAN.test(o[i]) ? I.t(o[i]) : o[i]) : walk(o[i]); return o; }
    if (o && typeof o === 'object') { for (const k of Object.keys(o)) { const v = o[k]; o[k] = typeof v === 'string' ? (HAN.test(v) ? I.t(v) : v) : walk(v); } return o; }
    return o;
  };
})(typeof window !== 'undefined' ? window : globalThis);
