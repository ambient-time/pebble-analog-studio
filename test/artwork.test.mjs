import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {DEFAULT_CONFIG, RECIPES, TARGETS, artworkIndex, decodeConfig, encodeConfig, normalizeLabSetup, validateConfig} from '../tools/recipe-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('editor and Pebble native/phone defaults stay aligned',()=>{
  const phone=createRequire(import.meta.url)('../src/pkjs/protocol.js');
  const native=fs.readFileSync(path.join(root,'src/c/settings.h'),'utf8');
  assert.equal(phone.defaultCode,encodeConfig(DEFAULT_CONFIG));
  assert.equal(native.match(/#define STUDIO_DEFAULT "([^"]+)"/)[1],phone.defaultCode);
});
test('all 7,776 supported setups roundtrip without changing wire IDs',()=>{
  let count=0;
  const ids=new Set();
  for(let recipe=1;recipe<=3;recipe++)for(let bezel=1;bezel<=6;bezel++)for(let dial=1;dial<=6;dial++)
  for(let hands=0;hands<=2;hands++)for(let markings=0;markings<=2;markings++)
  for(let date=0;date<=1;date++)for(let seconds=0;seconds<=1;seconds++)for(let contrast=0;contrast<=1;contrast++){
    const config={recipe,bezel,dial,hands,markings,date,seconds,contrast};
    const code=encodeConfig(config);
    assert.equal(code.length,18);
    assert.deepEqual(decodeConfig(code),config);
    const id=artworkIndex(config);ids.add(id);
    if(bezel<=3&&dial<=3)assert.equal(id,(recipe-1)*9+(bezel-1)*3+dial);
    count++;
  }
  assert.equal(count,7776);
  assert.deepEqual([...ids].sort((a,b)=>a-b),Array.from({length:108},(_,i)=>i+1));
  assert.deepEqual(RECIPES.map(r=>[r.id,r.name]),[[1,'Ivory'],[2,'Frost'],[3,'Noir']]);
  assert.equal(encodeConfig(DEFAULT_CONFIG),'L1:1:1:1:0:0:0:0:1');
});
test('malformed and future codes are rejected, not coerced',()=>{
  for(const value of [null,undefined,[],{},1,'',' L1:1:1:1:0:0:0:0:1','L1:1:1:1:0:0:0:0:1\n','L2:1:1:1:0:0:0:0:1','L1:1:1:1:0:0:0:0','L1:0:1:1:0:0:0:0:1','L1:1:1:1:0:0:0:0:2','L1:1:1:1:0:0:0:0:1:0'])assert.throws(()=>decodeConfig(value));
  for(const value of [{...DEFAULT_CONFIG,recipe:'1'},{...DEFAULT_CONFIG,hands:1.5},{...DEFAULT_CONFIG,extra:0},{...DEFAULT_CONFIG,date:true},{...DEFAULT_CONFIG,dial:undefined}])assert.throws(()=>validateConfig(value));
});
test('the supplied Ivory Lab export imports; unsupported construction never silently falls back',()=>{
  const source={preset:'Ivory',modified:false,faceMode:'remix',plug:null,case:'fluted',dial:'chapter-ring',dress:'chapter',complication:'none',finishes:{scene:'Parchment',bezel:'Brass',dial:'Ivory'}};
  const snapshot=JSON.stringify(source);
  assert.deepEqual(normalizeLabSetup(source),DEFAULT_CONFIG);
  assert.equal(JSON.stringify(source),snapshot);
  assert.equal(normalizeLabSetup({...source,complication:'date'}).date,1);
  assert.deepEqual(normalizeLabSetup({...source,plate:source.dial,dial:undefined}),DEFAULT_CONFIG);
  for(const patch of [{case:'unknown'},{dress:'bauhaus'},{plate:'classic'},{plug:'doom-iris'},{faceMode:'plug'},{complication:'weather'},{finishes:{bezel:'Gold',dial:'Ivory'}}])assert.throws(()=>normalizeLabSetup({...source,...patch}));
});
test('432 artwork references match native dimensions and hashes',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'reference/assets.json')));
  assert.equal(manifest.assets.length,432);
  const seen=new Set();
  for(const item of manifest.assets){
    const key=`${item.device}/${item.id}`;
    assert.ok(!seen.has(key));seen.add(key);
    const bytes=fs.readFileSync(path.join(root,item.native));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    assert.equal(bytes.readUInt32BE(16),TARGETS[item.device].width);
    assert.equal(bytes.readUInt32BE(20),TARGETS[item.device].height);
    if(['emery','chalk','gabbro'].includes(item.device)) {
      let foundPalette=false;
      for(let offset=8;offset<bytes.length;){
        const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
        if(type==='PLTE') {
          foundPalette=true;
          for(const channel of bytes.subarray(offset+8,offset+8+length))assert.equal(channel%85,0,'Emery palette must use hardware color steps');
        }
        offset+=length+12;
      }
      // PNG optimizes neutral artwork to 2-bit grayscale: the same four
      // hardware channel values (0,85,170,255), without a PLTE chunk.
      assert.ok(foundPalette || (bytes[25]===0 && bytes[24]<=2),'Emery artwork must use a hardware palette or 2-bit grayscale');
    }
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);
    assert.equal(artworkIndex({...DEFAULT_CONFIG,recipe:item.recipe,bezel:item.bezel,dial:item.dial}),item.id);
  }
});
test('all original artwork IDs and PNG bytes remain unchanged',()=>{
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/original-artwork.json')));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'reference/assets.json')));
  for(const old of baseline.assets){
    const current=manifest.assets.find(a=>a.device===old.device&&a.id===old.id);
    for(const key of ['id','recipe','bezel','dial','sha256'])assert.equal(current[key],old[key],`${old.device}/${old.id} ${key}`);
  }
});
test('Round 2 reference artwork exactly reconstructs from the bundled tone masks',()=>{
  const raw=file=>execFileSync(process.env.MAGICK||'magick',[file,'-alpha','off','-depth','8','RGB:-'],{maxBuffer:1024*1024});
  const masks=[1,2,3].map(id=>raw(path.join(root,`resources/images/gabbro/mask-${id}.png`)));
  const metals=[[0xAA5500,0xFFAA55,0xFFFFAA],[0x555555,0xAAAAAA,0xFFFFFF],[0x000000,0x555555,0xAAAAAA],[0x550000,0xAA5500,0xFFAAAA],[0x000055,0x5555AA,0xAAAAFF],[0x005555,0x55AA55,0xAAFFAA]];
  const plates=[0xFFFFAA,0xFFFFFF,0x000000,0x005555,0x0055AA,0x550000];
  const native=fs.readFileSync(path.join(root,'src/c/main.c'),'utf8');
  for(const value of metals.flat().concat(plates))assert.ok(native.includes('0x'+value.toString(16).toUpperCase().padStart(6,'0')));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'reference/assets.json')));
  for(const item of manifest.assets.filter(a=>a.device==='gabbro')){
    const expected=Buffer.from(masks[item.recipe-1]),colors=[plates[item.dial-1],...metals[item.bezel-1]];
    for(let i=0;i<expected.length;i+=3){const tone=expected[i]/85;assert.ok(Number.isInteger(tone));const color=colors[tone];expected[i]=color>>16;expected[i+1]=(color>>8)&255;expected[i+2]=color&255;}
    assert.deepEqual(raw(path.join(root,item.native)),expected,`Gabbro material ${item.id}`);
  }
});
