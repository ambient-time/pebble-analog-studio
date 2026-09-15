'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const protocol = require('../src/pkjs/protocol');
const page = require('../src/pkjs/settings-page');
test('phone routes all four supported watches to their own preview', () => {
  for(const platform of ['emery','diorite','chalk','gabbro']) {
    const handlers={},urls=[];
    const context={require:name=>name==='./protocol'?protocol:page,localStorage:{getItem:()=>null},console,Pebble:{addEventListener:(n,f)=>handlers[n]=f,getActiveWatchInfo:()=>({platform}),openURL:url=>urls.push(decodeURIComponent(url))}};
    vm.runInNewContext(fs.readFileSync(require.resolve('../src/pkjs/index.js'),'utf8'),context);
    handlers.showConfiguration();
    assert.ok(urls[0].includes('?platform='+platform+'&amp;pebble=1'));
  }
  const pkg=JSON.parse(fs.readFileSync(require.resolve('../package.json'),'utf8'));
  assert.deepEqual(pkg.pebble.targetPlatforms,['emery','diorite','chalk','gabbro']);
  assert.equal(pkg.pebble.uuid,'f580e82c-3699-4a54-8c00-1c1306921db5');
});
test('all supported codes accepted; malformed codes rejected', () => {
  let count=0;
  for(let r=1;r<=3;r++)for(let b=1;b<=6;b++)for(let d=1;d<=6;d++)for(let h=0;h<3;h++)for(let m=0;m<3;m++)for(let a=0;a<2;a++)for(let s=0;s<2;s++)for(let c=0;c<2;c++){
    assert.ok(protocol.valid(`L1:${r}:${b}:${d}:${h}:${m}:${a}:${s}:${c}`));count++;
  }
  assert.equal(count,7776);
  for(const bad of [null,{},'',protocol.defaultCode+'\n','L2:1:1:1:0:0:0:0:0','L1:0:1:1:0:0:0:0:0','L1:4:1:1:0:0:0:0:0','L1:1:7:1:0:0:0:0:0','L1:1:1:7:0:0:0:0:0','L1:1:1:1:0:0:0:0:2']) assert.equal(protocol.valid(bad),false);
});
test('phone bridge rejects invalid responses and persists only successful delivery', () => {
  const handlers={},writes=[],sent=[];
  const context={require:name=>name==='./protocol'?protocol:page,localStorage:{getItem:()=>protocol.defaultCode,setItem:(...args)=>writes.push(args)},console,Pebble:{addEventListener:(n,f)=>handlers[n]=f,sendAppMessage:(payload,ok,fail)=>sent.push({payload,ok,fail}),openURL:()=>{}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/pkjs/index.js'),'utf8'),context);
  handlers.webviewclosed({response:'bad'});
  handlers.webviewclosed({response:JSON.stringify({code:'L2:1:1:1:0:0:0:0:0'})});
  assert.equal(sent.length,0);
  const next='L1:3:2:3:2:1:1:0:1';
  handlers.webviewclosed({response:encodeURIComponent(JSON.stringify({code:next}))});
  assert.equal(sent[0].payload.STUDIO_CODE,next); assert.equal(writes.length,0);
  sent[0].ok(); assert.equal(writes[0][1],next);
});
test('packaged settings expose all controls without remote dependencies', () => {
  const html=page(protocol.defaultCode,'diorite');
  assert.equal((html.match(/<select /g)||[]).length,8);
  assert.match(html,/pebblejs:\/\/close/);
  assert.doesNotMatch(html,/<script[^>]+src=/);
  assert.match(html,/black-and-white/);
  for(const material of ['Warm Copper','Blued Steel','Verdigris','Ocean','Rosewood']) assert.ok(html.includes(material));
  assert.match(html,/0\.2\.0 or later/);
  assert.match(html,/share the same light or dark/);
});
test('an empty phone cache does not overwrite a stored watch design', () => {
  const handlers={},sent=[];
  const context={require:name=>name==='./protocol'?protocol:page,localStorage:{getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}},console,Pebble:{addEventListener:(n,f)=>handlers[n]=f,sendAppMessage:(payload,ok)=>{sent.push(payload);ok();},openURL:()=>{}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/pkjs/index.js'),'utf8'),context);
  handlers.ready(); assert.equal(sent.length,0);
  assert.doesNotThrow(()=>handlers.webviewclosed({response:JSON.stringify({code:protocol.defaultCode})}));
  assert.equal(sent.length,1);
});
