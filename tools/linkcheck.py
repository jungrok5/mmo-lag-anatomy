#!/usr/bin/env python3
"""출처 링크 점검: 원인 카드(ref)와 장별 출처(secRefs)의 주소를 모두 열어 보고 실패한 것만 출력한다.
사용: python3 tools/linkcheck.py [--all]   (curl 필요, 프록시 환경 변수를 그대로 따른다)"""
import json, re, subprocess, sys, concurrent.futures as cf
node = r"""
const fs=require('fs'),vm=require('vm');const c={};c.window=c;vm.createContext(c);
const f=['data.js',...fs.readdirSync('src/js').filter(x=>/^causes-\d+\.js$/.test(x)).sort(),...fs.readdirSync('src/js').filter(x=>/^refs-.+\.js$/.test(x)).sort()];
f.forEach(x=>vm.runInContext(fs.readFileSync('src/js/'+x,'utf8'),c));
const m={};const add=(r,w)=>{(m[r.u]=m[r.u]||[]).push(w)};
c.DATA.causes.forEach(x=>(x.ref||[]).forEach(r=>add(r,x.id)));
Object.entries(c.DATA.secRefs||{}).forEach(([k,l])=>l.forEach(r=>add(r,'#'+k)));
console.log(JSON.stringify(m));
"""
refs = json.loads(subprocess.run(['node', '-e', node], capture_output=True, text=True, check=True).stdout)
def check(u):
    r = subprocess.run(['curl', '-sS', '-o', '/dev/null', '-L', '--max-time', '25', '-A', 'Mozilla/5.0 linkcheck', '-w', '%{http_code}', u], capture_output=True, text=True)
    return u, r.stdout.strip() or 'ERR', r.stderr.strip()[:120]
bad = 0
with cf.ThreadPoolExecutor(8) as ex:
    for u, code, err in ex.map(check, refs):
        ok = code.isdigit() and 200 <= int(code) < 400
        if not ok: bad += 1
        if not ok or '--all' in sys.argv:
            print(f"{code}\t{u}\t{', '.join(refs[u][:4])}{' …' if len(refs[u]) > 4 else ''}\t{err}")
print(f"# {len(refs)} urls, {bad} failed", file=sys.stderr)
sys.exit(1 if bad else 0)
