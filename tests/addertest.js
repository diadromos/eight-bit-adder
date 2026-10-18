const puppeteer=require('puppeteer-core');const fs=require('fs');
const B='http://127.0.0.1:8770/';const R=[];const ok=(name,pass,info='')=>{R.push({name,pass,info});console.log((pass?'PASS ':'FAIL ')+name+(info?' — '+info:''))};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const errs=[];
async function open(q,w=1280,extra){const p=await b.newPage();p.on('pageerror',e=>errs.push(q+': '+e.message));
 p.on('console',m=>{if(m.type()==='error')errs.push(q+': console '+m.text())});
 if(extra)await extra(p);
 await p.setViewport({width:w,height:900});await p.goto(B+q,{waitUntil:'networkidle0'});await p.waitForFunction('window.APP&&APP.ready');return p;}

// 1. exhaustive gate-level check (all 256*256*2)
let p=await open('?stage=ripple&mode=instant');
let r=await p.evaluate(()=>{let bad=[],n=0;const sg=x=>x>=128?x-256:x;const t0=performance.now();
 for(let a=0;a<256;a++)for(let b=0;b<256;b++)for(let c=0;c<2;c++){n++;const o=SIM.add(a,b,c),t=a+b+c,s=sg(a)+sg(b)+c;
  if(o.sum!==(t&255)||o.cout!==(t>>8)||o.overflow!==((s<-128||s>127)?1:0))bad.push([a,b,c]);}
 return {n,bad:bad.slice(0,5),nb:bad.length,ms:Math.round(performance.now()-t0)}});
ok('exhaustive gate-level sum/cout/overflow',r.nb===0,`${r.n} combos, ${r.nb} mismatches, ${r.ms} ms`);

// 2. UI readouts for edge cases + random combos (through the page's controls/state, instant mode)
r=await p.evaluate(()=>{const cases=[[255,1,0],[127,1,0],[128,128,0],[0,0,0],[255,255,1],[255,0,1],[127,0,1],[200,100,0],[100,50,0],[1,127,0],[0,255,1]];
 for(let i=0;i<800;i++)cases.push([Math.random()*256|0,Math.random()*256|0,Math.random()*2|0]);
 const sg=x=>x>=128?x-256:x;let bad=[];
 for(const [a,b,c] of cases){APP.setAB(a,b,c);const t=a+b+c,s=sg(a)+sg(b)+c;
  const sum=document.querySelector('#sum').dataset.value,co=document.querySelector('#cout').dataset.value,ov=document.querySelector('#overflow').dataset.value;
  const bin=document.querySelector('#sumBin').textContent.replace(/\s/g,'');
  const exp=[t&255,t>>8,(s<-128||s>127)?1:0];
  const okk=+sum===exp[0]&&+co===exp[1]&&+ov===exp[2]&&bin===(t&255).toString(2).padStart(8,'0')&&
   document.querySelector('#cout').classList.contains('on')===!!exp[1]&&document.querySelector('#overflow').classList.contains('on')===!!exp[2]&&
   document.querySelector('#aHex').value===a.toString(16).toUpperCase().padStart(2,'0')&&+document.querySelector('#bDec').value===b&&
   document.querySelector('#sumSigned').textContent===String(sg(t&255));
  if(!okk)bad.push([a,b,c,sum,co,ov,bin]);}
 return {n:cases.length,bad:bad.slice(0,5)}});
ok('UI readouts (#sum bin/dec, #cout, #overflow, hex/dec, signed) incl. 255+1,127+1,128+128,0+0',r.bad.length===0,`${r.n} cases ${JSON.stringify(r.bad)}`);

// 3. Joseph's worked checks table vs simulator
const md=fs.readFileSync('/workspace/eight-bit-adder/docs/page-text.md','utf8');
const rows=md.split('### Worked checks')[1].split('\n').filter(l=>/^\| \d/.test(l));
r=await p.evaluate(rows=>rows.map(l=>{const c=l.split('|').map(s=>s.trim()).filter(Boolean);const [a,b]=c[0].split('+').map(Number),cin=+c[1];
 const o=SIM.add(a,b,cin);const sg=x=>x>=128?x-256:x;
 const exp={total:o.cout*256+o.sum,sum:o.sum,co:o.cout?'on':'off',ov:o.overflow?'on':'off'};
 const signedOK=c[4].includes(String(sg(o.sum)))||(c[4].endsWith('reads as 0')&&o.sum===0);
 return {row:c[0]+' cin '+cin,ok:+c[2]===exp.total&&+c[3]===exp.sum&&c[5]===exp.co&&c[6]===exp.ov&&signedOK,got:exp,doc:c.slice(2)}}),rows);
ok("Joseph's worked checks match simulator",r.length===5&&r.every(x=>x.ok),r.map(x=>x.row+(x.ok?' ok':' MISMATCH '+JSON.stringify(x))).join('; '));
// overflow paragraph examples
r=await p.evaluate(()=>[SIM.add(200,100,0),SIM.add(100,50,0),SIM.add(127,0,1)]);
ok('Overflow paragraph examples (200+100, 100+50, 127+0+1)',r[0].sum===44&&r[0].cout===1&&r[0].overflow===0&&r[1].sum===150&&r[1].cout===0&&r[1].overflow===1&&r[2].sum===128&&r[2].overflow===1&&r[2].cout===0,JSON.stringify(r));
await p.close();

// 4. truth tables on the page vs gate-level nets and arithmetic
async function tableRows(p,sel){return p.evaluate(sel=>[...document.querySelectorAll(sel+' tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim())),sel);}
p=await open('?stage=half&mode=instant');
let t=await tableRows(p,'#tt-half');
r=await p.evaluate(t=>t.every(([a,b,s,c])=>{const v=SIM.NETS.half.run({A:+a,B:+b});return +s===(a^b)&&+c===(a&b)&&SIM.NETS.half.get(v,'S')===+s&&SIM.NETS.half.get(v,'C')===+c}),t);
ok('half adder truth table (page) correct + matches gate net',t.length===4&&r,JSON.stringify(t));
// row highlight follows inputs
await p.click('#haA');await p.click('#haB');
r=await p.evaluate(()=>[...document.querySelectorAll('#tt-half tbody tr')].findIndex(tr=>tr.classList.contains('cur')));
ok('half truth-table row highlight (A=1,B=1 -> row 3)',r===3,'row '+r);
await p.close();
p=await open('?stage=full&mode=instant');
t=await tableRows(p,'#tt-full');
r=await p.evaluate(t=>t.every(([a,b,c,s,co])=>{const v=SIM.NETS.full.run({A:+a,B:+b,Cin:+c}),tot=+a+ +b+ +c;return +s===(tot&1)&&+co===(tot>>1)&&SIM.NETS.full.get(v,'S')===+s&&SIM.NETS.full.get(v,'Cout')===+co}),t);
ok('full adder truth table (page) correct + matches gate net',t.length===8&&r,'');
await p.close();
p=await open('?stage=gates&mode=instant');
let gres=[];
for(const g of ['AND','OR','NOT','XOR']){
 await p.click(`#gatePick [data-gate=${g}]`);await sleep(50);
 const tabs=await p.evaluate(()=>[...document.querySelectorAll('#tt-gates table')].map(tb=>[...tb.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(td=>+td.textContent.trim()))));
 const good=await p.evaluate((g,tabs)=>{const n=SIM.NETS['gate-'+g];const f={AND:(a,b)=>a&b,OR:(a,b)=>a|b,NOT:a=>a^1,XOR:(a,b)=>a^b}[g];
  let okk=tabs[0].every(r=>{if(g==='NOT'){const v=n.run({one:1,A:r[0],B:0});return r[1]===f(r[0])&&n.get(v,'out')===r[1]}
   const v=n.run({one:1,A:r[0],B:r[1]});return r[2]===f(r[0],r[1])&&n.get(v,'out')===r[2]});
  if(g==='XOR'){okk=okk&&tabs.length===2&&tabs[1].every(r=>{const v=n.run({one:1,A:r[0],B:r[1]});return ['o1','a1','n1','out'].every((w,k)=>n.get(v,w)===r[2+k])&&r[6]===(r[0]^r[1])})}
  return okk},g,tabs);
 gres.push(g+(good?' ok':' BAD'));}
ok('gate truth tables AND/OR/NOT/XOR (+ XOR built from OR/AND/NOT) match gate nets',gres.every(s=>s.endsWith('ok')),gres.join(', '));
// stage-1 levels: package / expand / symbol toggle with Henri's transition
await p.click('#package');await sleep(1300);
let lv=await p.evaluate(()=>[...document.querySelectorAll('.lv-layer.vis')].map(e=>e.id).join());
await p.click('#expand');await sleep(900);let lv2=await p.evaluate(()=>[...document.querySelectorAll('.lv-layer.vis')].map(e=>e.id).join());
await p.click('#symbolToggle');await sleep(900);let lv3=await p.evaluate(()=>[...document.querySelectorAll('.lv-layer.vis')].map(e=>e.id).join());
ok('stage 1 package -> module, expand -> symbol, toggle -> switches',lv==='lv-module'&&lv2==='lv-gate'&&lv3==='lv-circuit',[lv,lv2,lv3].join(' | '));
// XOR switch-level lamp
await p.click('#gatePick [data-gate=XOR]');await p.click('#gateA');await sleep(50);
r=await p.evaluate(()=>document.querySelector('#lv-circuit [data-lamp]').classList.contains('on'));
await p.click('#gateB');await sleep(50);
let r2=await p.evaluate(()=>document.querySelector('#lv-circuit [data-lamp]').classList.contains('on'));
ok('XOR relay circuit: lamp on for A=1,B=0 and off for A=1,B=1',r===true&&r2===false);
await p.close();
p=await open('?stage=switch');
let s0=await p.evaluate(()=>document.querySelector('[data-lamp]').classList.contains('on'));await p.click('#sw');
let s1=await p.evaluate(()=>[document.querySelector('[data-lamp]').classList.contains('on'),[...document.querySelectorAll('#tt-switch tbody tr')].findIndex(t=>t.classList.contains('cur'))]);
ok('stage 0: clicking #sw lights the lamp, table row "closed" highlighted',s0===false&&s1[0]===true&&s1[1]===1,JSON.stringify(s1));
await p.close();

// 5. step mode reaches final state; carry settles in order bit0 -> bit7
for(const depth of [0,1]){
p=await open(`?stage=ripple&mode=step&depth=${depth}`);
await p.evaluate(()=>APP.setAB(127,1,0));
const known=[];let steps=0;
const snap=()=>p.evaluate(()=>{const o={};for(let i=1;i<=8;i++){const e=document.querySelector(`#stage-ripple [data-w="c${i}"]`);o[i]=!e?'none':e.classList.contains('unknown')?'?':e.classList.contains('on')?'1':'0'}return o});
let s=await snap();
while(await p.evaluate(()=>!document.querySelector('#step').disabled)&&steps<40){await p.click('#step');steps++;s=await snap();for(let i=1;i<=8;i++)if(known[i]===undefined&&s[i]!=='?')known[i]=steps;}
const fin=await p.evaluate(()=>({sum:document.querySelector('#sum').dataset.value,co:document.querySelector('#cout').dataset.value,ov:document.querySelector('#overflow').dataset.value,settled:document.body.dataset.settled,info:document.querySelector('#stepInfo').textContent}));
const order=known.slice(1);const inc=order.every((v,k)=>k===0||v>order[k-1]);
ok(`step mode (${depth?'gate view':'card chain'}) reaches final 127+1=128, carry settles bit0->bit7 in order`,fin.sum==='128'&&fin.co==='0'&&fin.ov==='1'&&fin.settled==='1'&&inc&&s[7]==='1'&&s[8]==='0',`steps=${steps}, carry known at steps ${JSON.stringify(order)}, final ${JSON.stringify(fin)}`);
await p.close();}

// slow mode: unknowns early, settle in order, final correct
p=await open('?stage=ripple&mode=slow&depth=1');
await p.evaluate(()=>{document.querySelector('#speed').value=740;document.querySelector('#speed').dispatchEvent(new Event('input'));APP.setAB(127,1,0)});
const times={};const t0=Date.now();let unknownSeen=0;
while(Date.now()-t0<4000){const st=await p.evaluate(()=>{const o={};for(let i=1;i<=8;i++){const e=document.querySelector(`#stage-ripple [data-w="c${i}"]`);o[i]=e.classList.contains('unknown')?'?':e.classList.contains('on')?'1':'0'}o.x=document.querySelectorAll('#stage-ripple .wire.unknown').length;o.settled=document.body.dataset.settled;return o});
 if(st.x>0)unknownSeen=Math.max(unknownSeen,st.x);for(let i=1;i<=8;i++)if(st[i]!=='?'&&times[i]===undefined)times[i]=Date.now()-t0;if(st.settled==='1')break;await sleep(15);}
const tv=Object.values(times);
ok('slow mode: unsettled wires dimmed, carry settles bit0->bit7 in time order, ends settled',unknownSeen>0&&tv.length===8&&tv.every((v,k)=>k===0||v>=tv[k-1])&&tv[7]>tv[0]&&await p.evaluate(()=>document.querySelector('#sum').dataset.value==='128'),`max dim wires ${unknownSeen}, carry ms ${JSON.stringify(times)}`);
await p.close();

// 6. layout: no horizontal overflow, tap targets, all stages and depths, both widths
let lay=[];
for(const w of [390,1280])for(const q of ['stage=switch','stage=gates','stage=gates&gate=XOR','stage=half','stage=full','stage=ripple','stage=ripple&depth=1','stage=gates&depth=0','stage=full&depth=1','stage=full&depth=0','stage=half&depth=0']){
 p=await open('?mode=instant&'+q,w);await sleep(150);
 const m=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bw:document.body.scrollWidth}));
 lay.push({w,q,...m,ok:m.sw<=m.cw});await p.close();}
ok('no horizontal page overflow at 390 and 1280 (all stages/depths)',lay.every(x=>x.ok),lay.filter(x=>!x.ok).map(x=>`${x.w} ${x.q} ${x.sw}>${x.cw}`).join('; ')||`${lay.length} layouts checked`);
for(const w of [390,1280]){p=await open('?stage=ripple&mode=instant',w);
 const sz=await p.evaluate(()=>[...document.querySelectorAll('#inputs .bit:not([hidden])')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [e.id,Math.round(r.width*10)/10,Math.round(r.height)]}));
 const small=sz.filter(([,w,h])=>w<40||h<40);ok(`bit toggles >= 40px at ${w}`,small.length===0&&sz.length===17,`${sz.length} toggles, min width ${Math.min(...sz.map(s=>s[1]))}px${small.length?' small: '+JSON.stringify(small):''}`);
 if(w===390){const sc=await p.evaluate(async()=>{APP.setDepth(1);await new Promise(r=>setTimeout(r,300));const mid={page:document.documentElement.scrollWidth,vis:getComputedStyle(document.body).overflowX};await new Promise(r=>setTimeout(r,1200));const s=document.querySelector('#rippleScroll');return {sw:s.scrollWidth,cw:s.clientWidth,left:s.scrollLeft,page:document.documentElement.scrollWidth,mid}});
  ok('390: 8-bit gate view scrolls inside its panel, page does not (page clipped while morph ghosts fly)',sc.sw>sc.cw&&sc.page<=390&&sc.mid.vis==='clip',JSON.stringify(sc));}
 await p.close();}

// 7. inputs sync + controls
p=await open('?stage=ripple&mode=instant',390);
await p.click('#a0');await p.click('#a7');
let s1b=await p.evaluate(()=>[document.querySelector('#aDec').value,document.querySelector('#aHex').value,document.querySelector('#a7').getAttribute('aria-pressed')]);
await p.click('#bDec',{clickCount:3});await p.keyboard.type('200');
let s2=await p.evaluate(()=>[document.querySelector('#bHex').value,[...Array(8)].map((_,i)=>document.querySelector('#b'+(7-i)).textContent[0]).join('')]);
await p.click('#aHex',{clickCount:3});await p.keyboard.type('ff');
let s3=await p.evaluate(()=>[document.querySelector('#aDec').value,document.querySelector('#sum').dataset.value,document.querySelector('#cout').dataset.value]);
await p.click('#cin');let s4=await p.evaluate(()=>document.querySelector('#sum').dataset.value);
await p.click('#reset');let s5=await p.evaluate(()=>[APP.S.a,APP.S.b,APP.S.cin,document.querySelector('#sum').dataset.value]);
await p.click('#random');let s6=await p.evaluate(()=>{const S=APP.S;return +document.querySelector('#sum').dataset.value===((S.a+S.b+S.cin)&255)});
ok('input sync: bits <-> #aDec/#aHex, typed decimal/hex, cin, reset, random',s1b.join()==='129,81,true'&&s2.join()==='C8,11001000'&&s3.join()==='255,199,1'&&s4==='200'&&s5.join()==='0,0,0,0'&&s6,JSON.stringify([s1b,s2,s3,s4,s5,s6]));
// zoom
await p.evaluate(()=>APP.setAB(127,1,0));await p.select('#zoom','7');
let z=await p.evaluate(()=>({row:[...document.querySelectorAll('#tt-zoom tbody tr')].findIndex(t=>t.classList.contains('cur')),lbl:[...document.querySelectorAll('#draw-zoom [data-lbl]')].map(e=>e.textContent),vals:[...document.querySelectorAll('#draw-zoom .val')].map(e=>e.textContent)}));
ok('zoom bit 7 (127+1): row A=0,B=0,Cin=1 highlighted; every wire shows a value',z.row===1&&z.lbl.join()==='A7=0,B7=0,c7=1,S7=1,c8=0'&&z.vals.every(v=>v==='0'||v==='1'),JSON.stringify(z));
await p.close();

// 8. reduced motion -> instant by default
p=await open('?stage=ripple',1280,async p=>p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]));
r=await p.evaluate(()=>[APP.S.mode,document.querySelector('#mode [aria-checked=true]').dataset.mode]);
ok('prefers-reduced-motion defaults to Instant',r.join()==='instant,instant',r.join());await p.close();
p=await open('?stage=ripple',1280);r=await p.evaluate(()=>APP.S.mode);ok('default mode without reduced motion',r==='slow',r);
// tooltips coverage
const tips=JSON.parse(fs.readFileSync('/workspace/eight-bit-adder/docs/tooltips.json','utf8'));
// every id must exist and carry the exact text on at least one stage (#sw only exists while Stage 0 is drawn)
r=await p.evaluate(async tips=>{const seen={},wrong=new Set();
 for(const st of ['ripple','switch','gates','half','full']){APP.setStage(st);await new Promise(r=>setTimeout(r,80));
  for(const k in tips){const e=document.querySelector(k);if(!e)continue;if(e.getAttribute('title')===tips[k])seen[k]=seen[k]||st;else wrong.add(k+'@'+st)}}
 const miss=Object.keys(tips).filter(k=>!seen[k]);return {miss,wrong:[...wrong],sw:seen['#sw']||null}},tips);
ok(`all ${Object.keys(tips).length} tooltips applied verbatim (every stage, incl. #sw on Stage 0)`,r.miss.length===0&&r.wrong.length===0&&r.sw==='switch',JSON.stringify(r));
// click every control on every stage, looking for JS errors
await p.evaluate(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));for(const st of ['switch','gates','half','full','ripple']){APP.setStage(st);await sl(50);
 for(const m of ['slow','step','instant']){APP.setMode(m);for(const e of document.querySelectorAll('button:not([disabled])'))if(e.offsetParent&&!e.closest('.tabs'))e.click();await sl(30);document.querySelector('#step').click()}
 for(const id of ['#package','#expand','#expand','#symbolToggle']){const e=document.querySelector(id);if(e.offsetParent&&!e.disabled)e.click();await sl(950)}}});
await p.close();

// 9. Henri pass 2: morphSwap (normal + reduced motion), schematic bit map, selected card <-> zoom
async function morphRun(reduce){
 const pp=await open('?stage=half&mode=instant',1280,reduce?async p=>p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]):null);
 return pp.evaluate(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));const log=[];const orig=window.morphSwap;
  window.morphSwap=(c,f,o)=>{const pr=orig(c,f,o);const e={id:c.id,dir:o&&o.dir,ok:null,kf:c.getAnimations().map(a=>Object.keys(a.effect.getKeyframes()[0]).filter(k=>!['offset','easing','composite','computedOffset'].includes(k)).join('+')),ghosts:document.querySelectorAll('.morph-ghost').length};
   log.push(e);pr.then(()=>e.ok=true,err=>e.ok='ERR '+err);return pr};
  const go=async(st,d)=>{APP.setStage(st);await sl(60);APP.setDepth(d);await sl(900)};
  await go('half',0);await go('half',1);await go('full',0);APP.setDepth(2);await sl(900);APP.setDepth(1);await sl(900);
  await go('ripple',1);APP.setDepth(0);await sl(1000);
  document.querySelector('#expand').click();await sl(1000);document.querySelector('.schem-close').click();await sl(1000);
  return {log,ghostsLeft:document.querySelectorAll('.morph-ghost').length,depth:APP.S.depth.ripple,chain:!!document.querySelector('#chain .fa')}});}
r=await morphRun(false);
ok('morphSwap runs on stages 2-4 (expand + collapse, incl. schematic Close), resolves, no ghosts left',r.log.length===9&&r.log.every(e=>e.ok===true&&(e.dir==='expand'||e.dir==='collapse'))&&r.log.some(e=>e.ghosts>0)&&r.ghostsLeft===0&&r.depth===0&&r.chain,JSON.stringify(r.log.map(e=>e.id+':'+e.dir+':'+e.ok)));
r=await morphRun(true);
ok('reduced motion: morphSwap is a plain opacity cross-fade (no ghosts, no transforms)',r.log.length===9&&r.log.every(e=>e.ok===true&&e.ghosts===0&&e.kf.length>0&&e.kf.every(k=>k==='opacity')),JSON.stringify(r.log.map(e=>e.id+':'+e.kf.join(','))));
for(const w of [390,1280]){p=await open('?stage=ripple&depth=1&mode=instant&a=127&b=1',w);
 r=await p.evaluate(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));const cv=document.querySelector('.schem-canvas');const res=[];
  const cards=document.querySelectorAll('.cell-bg[data-bit]').length,chips=document.querySelectorAll('.schem-map button[data-bit]').length;
  for(const i of [7,4,3,0]){document.querySelectorAll('.cell-bg.flash').forEach(e=>e.classList.remove('flash'));document.querySelector(`.schem-map button[data-bit="${i}"]`).click();await sl(900);
   const c=document.querySelector(`.cell-bg[data-bit="${i}"]`),cr=cv.getBoundingClientRect(),r=c.getBoundingClientRect(),g=document.querySelector(`g.cell[data-bit="${i}"]`).getBoundingClientRect();
   const inView=r.left>=cr.left-2&&r.right<=cr.right+2,centred=Math.abs((r.left+r.right)/2-(cr.left+cr.right)/2)<=Math.max(4,(cr.width-r.width)/2+4);
   const others=[...document.querySelectorAll('.cell-bg.flash')].map(e=>+e.dataset.bit);
   res.push({i,inView,centred,flash:c.classList.contains('flash')&&others.length===1&&others[0]===i,cardHoldsCell:r.left<=g.left+1&&r.right>=g.right-1,chipVis:document.querySelector(`.schem-map button[data-bit="${i}"]`).classList.contains('vis')});}
  return {cards,chips,scrolls:cv.scrollWidth>cv.clientWidth,res}});
 ok(`${w}: schematic bit map jumps to the right adder (bits 7,4,3,0)`,r.cards===8&&r.chips===8&&r.res.every(x=>x.inView&&x.flash&&x.cardHoldsCell&&x.chipVis&&(!r.scrolls||x.centred)),JSON.stringify(r));
 await p.close();}
p=await open('?stage=ripple&mode=instant&a=127&b=1',1280);
r=await p.evaluate(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));const out=[];
 const state=()=>{const sel=[...document.querySelectorAll('#chain .fa.selected')].map(e=>+e.dataset.bit),cur=[...document.querySelectorAll('#chain .fa[aria-current=true]')].map(e=>+e.dataset.bit);
  return {zoom:APP.S.zoom,select:document.querySelector('#zoom').value,sel,cur,exp:document.querySelectorAll('#chain .fa[aria-expanded]').length,lbl:document.querySelector('#draw-zoom [data-lbl]').textContent}};
 for(const i of [7,3,0]){const z=document.querySelector('#zoom');z.value=String(i);z.dispatchEvent(new Event('change'));await sl(50);out.push(state())}
 document.querySelector('#chain .fa[data-bit="5"]').click();await sl(50);out.push(state());
 document.querySelector('#chain .fa[data-bit="2"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await sl(50);out.push(state());
 return out});
ok('.selected + aria-current follow the zoom bit (select, click, Enter); no aria-expanded',r.map(x=>x.zoom).join()==='7,3,0,5,2'&&r.every(x=>x.select===String(x.zoom)&&x.sel.join()===String(x.zoom)&&x.cur.join()===String(x.zoom)&&x.exp===0&&x.lbl.startsWith('A'+x.zoom+'=')),JSON.stringify(r));
await p.close();
ok('no JS errors / console errors in any test',errs.length===0,errs.slice(0,5).join(' | '));
fs.writeFileSync('/tmp/mothtest/adder-results.json',JSON.stringify(R,null,1));
console.log(`\n${R.filter(x=>x.pass).length}/${R.length} passed`);await b.close();})();
