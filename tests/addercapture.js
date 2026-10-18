const puppeteer=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const B='http://127.0.0.1:8770/classic.html',O='/workspace/eight-bit-adder/shots/';
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const errs=[];
async function open(q,w,h=900){const p=await b.newPage();p.on('pageerror',e=>errs.push(e.message));await p.setViewport({width:w,height:h});
 await p.goto(B+q,{waitUntil:'networkidle0'});await p.waitForFunction('window.APP&&APP.ready');await sleep(300);return p;}
let p=await open('?stage=ripple&a=127&b=1&mode=instant&depth=1&zoom=6',1280);await p.screenshot({path:O+'ripple-1280.png',fullPage:true});
await (await p.$('#zoompanel')).screenshot({path:O+'zoom-1280.png'});await p.close();
p=await open('?stage=ripple&a=127&b=1&mode=instant&zoom=6',390);await p.screenshot({path:O+'ripple-390.png',fullPage:true});
await p.evaluate(()=>APP.setDepth(1));await sleep(400);await (await p.$('#stage-ripple')).screenshot({path:O+'ripple-390-gates.png'});await p.close();
p=await open('?stage=full&mode=instant',1280);await p.click('#faA');await p.click('#faC');await sleep(200);await p.screenshot({path:O+'full-1280.png',fullPage:true});await p.close();
p=await open('?stage=half&mode=instant',390);await p.click('#haA');await p.click('#haB');await sleep(200);await p.screenshot({path:O+'half-390.png',fullPage:true});await p.close();
p=await open('?stage=gates&gate=XOR&mode=instant',1280);await p.click('#gateA');await sleep(200);await p.screenshot({path:O+'gates-xor-1280.png',fullPage:true});await p.close();
p=await open('?stage=switch',390);await p.click('#sw');await sleep(300);await p.screenshot({path:O+'switch-390.png',fullPage:true});await p.close();
// mid-ripple still (slow mode)
p=await open('?stage=ripple&mode=slow&depth=1&zoom=6',1280);await p.evaluate(()=>APP.setAB(127,1,0));await sleep(260*9+100);await p.screenshot({path:O+'ripple-slow-mid-1280.png'});await p.close();
// video: slow mode, 127+1 then 255+1 with cin
p=await open('?stage=ripple&mode=slow&depth=1&zoom=7',1280,1000);
await p.evaluate(()=>{const s=document.querySelector('#speed');s.value=860-210;s.dispatchEvent(new Event('input'));});
await p.evaluate(()=>window.scrollTo(0,document.querySelector('.top').getBoundingClientRect().top+scrollY-8));
const rec=await p.screencast({path:O+'ripple-slow.mp4'});
await sleep(600);await p.evaluate(()=>APP.setAB(127,1,0));await sleep(4300);await p.evaluate(()=>APP.setAB(255,0,1));await sleep(4400);
await rec.stop();await p.close();
console.log(errs.join(';')||'no errors');await b.close();})();
