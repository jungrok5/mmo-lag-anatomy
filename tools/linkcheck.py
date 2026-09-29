#!/usr/bin/env python3
"""출처 링크 점검: 원인 카드(ref)와 장별 출처(secRefs)의 주소를 모두 열어 보고 실패한 것만 출력한다.
사용: python3 tools/linkcheck.py [--all]   (curl 필요, 프록시 환경 변수를 그대로 따른다)"""
import json, os, subprocess, sys, concurrent.futures as cf
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
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
# 사이트마다 막는 User-Agent가 달라서(예: dev.mysql.com은 "Mozilla/5.0 linkcheck"를 막고 curl 기본값은 받음)
# 몇 가지로 차례로 열어 보고 하나라도 열리면 통과. 일시적인 연결 끊김(000)도 한 번 더 시도한다.
AGENTS = [None, 'Mozilla/5.0 linkcheck', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36']
def check(u):
    code, err = 'ERR', ''
    for ua in AGENTS + [None]:
        r = subprocess.run(['curl', '-sS', '-o', '/dev/null', '-L', '--max-time', '25', *(['-A', ua] if ua else []), '-w', '%{http_code}', u], capture_output=True, text=True)
        code, err = r.stdout.strip() or 'ERR', r.stderr.strip()[:120]
        if code.isdigit() and 200 <= int(code) < 400:
            break
    return u, code, err
bad = 0
with cf.ThreadPoolExecutor(8) as ex:
    for u, code, err in ex.map(check, refs):
        ok = code.isdigit() and 200 <= int(code) < 400
        if not ok: bad += 1
        if not ok or '--all' in sys.argv:
            print(f"{code}\t{u}\t{', '.join(refs[u][:4])}{' …' if len(refs[u]) > 4 else ''}\t{err}")
print(f"# {len(refs)} urls, {bad} failed", file=sys.stderr)
sys.exit(1 if bad else 0)
