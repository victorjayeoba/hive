import http from 'node:http';import {WebSocket} from 'ws';
const t=await new Promise(r=>http.get('http://localhost:9222/json',s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r(JSON.parse(d)))}));
const page=t.find(x=>x.type==='page'&&x.url.includes('/app'));
const ws=new WebSocket(page.webSocketDebuggerUrl);let id=0;const p=new Map();
const send=(m,pr={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:pr}))});
ws.on('message',m=>{const o=JSON.parse(m);if(o.id&&p.has(o.id)){p.get(o.id)(o.result);p.delete(o.id)}});
await new Promise(r=>ws.on('open',r));
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await new Promise(r=>setTimeout(r,800));
// find elements wider than viewport
const {result}=await send('Runtime.evaluate',{expression:`
  JSON.stringify({
    docW: document.documentElement.scrollWidth,
    viewW: document.documentElement.clientWidth,
    wide: [...document.querySelectorAll('*')].filter(e=>e.scrollWidth>391||e.getBoundingClientRect().right>395).slice(0,6).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,60),w:Math.round(e.getBoundingClientRect().width),right:Math.round(e.getBoundingClientRect().right)}))
  })
`,returnByValue:true});
console.log(result.value);ws.close();process.exit(0);
