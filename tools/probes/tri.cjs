const fs=require('fs'),vm=require('vm');const c={};c.window=c;vm.createContext(c);
['data.js',...fs.readdirSync('src/js').filter(f=>/^causes-\d/.test(f)).sort()].forEach(f=>vm.runInContext(fs.readFileSync('src/js/'+f,'utf8'),c));
const [who,when,sym]=process.argv.slice(2).map(s=>s.split(','));
const sc=c.DATA.causes.map(x=>{let s=0;const wi=x.who.indexOf(who[0]);if(wi>=0)s+=wi===0?3:2;else s-=2;when.forEach(w=>{const i=x.when.indexOf(w);if(i>=0)s+=i===0?2:1.5});sym.forEach(y=>{const i=x.sym.indexOf(y);if(i>=0)s+=i===0?3:2});return [s,x.id,x.who.join('/'),x.when.join('/'),x.sym.join('/')]}).sort((a,b)=>b[0]-a[0]).slice(0,8);
console.log(process.argv.slice(2).join(' | ')+'\n'+sc.map(r=>'  '+r.join('  ')).join('\n'));
