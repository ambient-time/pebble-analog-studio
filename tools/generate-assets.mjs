#!/usr/bin/env node
// Deterministic material studies derived from the Lab's MIT-licensed tokens.
// Generates the four Pebble targets from the bundled palette snapshot.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {RECIPES,FINISHES,TARGETS,DEFAULT_CONFIG,DIAL_DARK,artworkIndex} from './recipe-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'reference/palettes.json'));
const lab=JSON.parse(source);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const check=process.argv.includes('--check');
const onlyDevice=process.argv.find(arg=>arg.startsWith('--device='))?.split('=')[1];
if(onlyDevice&&!Object.hasOwn(TARGETS,onlyDevice))throw new Error('Unknown target');
const manifestPath=path.join(root,'reference/assets.json');
const magick=process.env.MAGICK||'magick';
let sharp;
if(!check) {
  const require=createRequire(import.meta.url);
  try { sharp=require(process.env.STUDIO_SHARP_PATH||'sharp'); }
  catch {throw new Error('Install sharp or set STUDIO_SHARP_PATH to an existing sharp module.');}
}
const palette=name=>lab.palettes.find(p=>p.name===name).tokens;
const num=n=>Number(n.toFixed(3));
function art(target,recipe,bezel,dial,mask=false) {
  const {width:w,height:h}=TARGETS[target], mono=target==='diorite';
  let b=palette(FINISHES.bezel[bezel-1]), d=palette(FINISHES.dial[dial-1]);
  if(target!=='venu2s' && !mono) {
    // Deliberate Pebble 2-bit-per-channel materials. Generic nearest-color
    // conversion makes photographic brass olive/pink and erases pale enamel.
    const metals=[
      {bezelHi:'#ffffaa',bezelMid:'#ffaa55',bezelLo:'#aa5500'},
      {bezelHi:'#ffffff',bezelMid:'#aaaaaa',bezelLo:'#555555'},
      {bezelHi:'#aaaaaa',bezelMid:'#555555',bezelLo:'#000000'},
      {bezelHi:'#ffaaaa',bezelMid:'#aa5500',bezelLo:'#550000'},
      {bezelHi:'#aaaaff',bezelMid:'#5555aa',bezelLo:'#000055'},
      {bezelHi:'#aaffaa',bezelMid:'#55aa55',bezelLo:'#005555'},
    ];
    const plates=[
      {faceHi:'#ffffaa',faceMid:'#ffffaa',face:'#ffffaa'},
      {faceHi:'#ffffff',faceMid:'#ffffff',face:'#ffffff'},
      {faceHi:'#000000',faceMid:'#000000',face:'#000000'},
      {faceHi:'#005555',faceMid:'#005555',face:'#005555'},
      {faceHi:'#0055aa',faceMid:'#0055aa',face:'#0055aa'},
      {faceHi:'#550000',faceMid:'#550000',face:'#550000'},
    ];
    b={...b,...metals[bezel-1]};d={...d,...plates[dial-1]};
  }
  if(mask){b={...b,bezelHi:'#ffffff',bezelMid:'#aaaaaa',bezelLo:'#555555'};d={...d,faceHi:'#000000',faceMid:'#000000',face:'#000000'};}
  const cx=w/2,cy=h/2,round=w===h,outer=w/2-1;
  const r=target==='venu2s'?142:w*(round?.40:.43);
  const ink=DIAL_DARK[dial-1]?'#ffffff':'#000000',paper=DIAL_DARK[dial-1]?'#000000':'#ffffff';
  const circle=(radius,fill,stroke='none',sw=1)=>`<circle cx="${cx}" cy="${cy}" r="${num(radius)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const rect=(inset,fill,stroke='none',sw=1)=>`<rect x="${inset}" y="${inset}" width="${w-inset*2}" height="${h-inset*2}" rx="${Math.max(3,w*.12-inset/2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const polar=(radius,a)=>[num(cx+Math.sin(a)*radius),num(cy-Math.cos(a)*radius)];
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w*3}" height="${h*3}" viewBox="0 0 ${w} ${h}"><defs>
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${b.bezelLo}"/><stop offset=".22" stop-color="${b.bezelHi}"/><stop offset=".48" stop-color="${b.bezelMid}"/><stop offset=".74" stop-color="${b.bezelLo}"/><stop offset="1" stop-color="${b.bezelHi}"/></linearGradient>
  <radialGradient id="plate" cx="32%" cy="27%" r="85%"><stop stop-color="${d.faceHi}"/><stop offset=".55" stop-color="${d.faceMid}"/><stop offset="1" stop-color="${d.face}"/></radialGradient>
  <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 1H4 M1 3H2" stroke="#ffffff" stroke-opacity=".08" stroke-width=".45"/></pattern>
  </defs><rect width="${w}" height="${h}" fill="${mono?paper:d.face}"/>`;
  svg+=round?circle(outer,mono?paper:'url(#metal)',mono?ink:b.bezelLo):rect(1,mono?paper:'url(#metal)',mono?ink:b.bezelLo);
  // Fluting/coin-edge follows screen perimeter on rectangles, never a tiny bezel.
  const teeth=recipe===1?(mono?72:160):recipe===3?(mono?36:72):0;
  if(round && teeth) {
    const inner=recipe===1?outer*.902:outer*.933;
    for(let i=0;i<teeth;i++) {
      const a=i/teeth*Math.PI*2, da=Math.PI/teeth*.70;
      const pts=[polar(inner,a),polar(outer-1,a),polar(outer-1,a+da),polar(inner,a+da)];
      svg+=`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${mono?ink:(i%2?b.bezelLo:b.bezelHi)}"/>`;
    }
  } else if(teeth) {
    const gap=recipe===1?4:7,depth=mono?4:6;
    for(let x=12;x<w-12;x+=gap) svg+=`<path d="M${x} 2v${depth} M${x} ${h-2}v-${depth}" stroke="${mono?ink:b.bezelHi}" stroke-width="1"/>`;
    for(let y=12;y<h-12;y+=gap) svg+=`<path d="M2 ${y}h${depth} M${w-2} ${y}h-${depth}" stroke="${mono?ink:b.bezelHi}" stroke-width="1"/>`;
  }
  if(round) {
    svg+=circle(recipe===2?outer-5:outer*.90,mono?paper:'url(#metal)',mono?ink:b.bezelHi);
    svg+=circle(r+5,mono?paper:d.faceHi,mono?ink:b.bezelLo,.7);
    svg+=circle(r,mono?paper:'url(#plate)',mono?ink:d.face,.65);
  } else {
    svg+=rect(recipe===2?4:8,mono?paper:'url(#plate)',mono?ink:b.bezelLo);
  }
  if(!mono && !mask) svg+=round?circle(r,'url(#grain)'):rect(9,'url(#grain)');
  if(recipe===1) {
    svg+=circle(r*.99,'none',mono?ink:d.faceMid,mono?1:3);
    svg+=circle(r*.74,'none',mono?ink:b.bezelLo,mono?1:.6);
    if(!mono) svg+=circle(r*.745,'none',d.faceHi,.5);
  } else if(recipe===2) {
    svg+=circle(r*.97,'none',mono?ink:b.bezelHi,.7);
    if(!mono) for(let i=-r*.7;i<r*.7;i+=3) {
      const dy=Math.sqrt(r*r*.75-i*i);
      svg+=`<path d="M${num(cx+i)} ${num(cy-dy)}v${num(dy*2)}" stroke="${d.faceHi}" stroke-opacity=".15" stroke-width=".5"/>`;
    }
  } else {
    // Open-heart construction: recessed center and concentric skeleton well.
    svg+=circle(r*.80,'none',mono?ink:b.bezelMid,.8);
    svg+=circle(r*.36,mono?paper:d.face,'none');
    svg+=circle(r*.36,'none',mono?ink:b.bezelHi,1);
    if(!mono) svg+=circle(r*.345,'none',b.bezelLo,2);
  }
  return svg+'</svg>';
}
const records=[];
const masks=new Map();
const gabbroMetals=[['#ffffaa','#ffaa55','#aa5500'],['#ffffff','#aaaaaa','#555555'],['#aaaaaa','#555555','#000000'],['#ffaaaa','#aa5500','#550000'],['#aaaaff','#5555aa','#000055'],['#aaffaa','#55aa55','#005555']];
const gabbroPlates=['#ffffaa','#ffffff','#000000','#005555','#0055aa','#550000'];
for(const device of Object.keys(TARGETS)) for(const recipe of RECIPES) for(let bezel=1;bezel<=FINISHES.bezel.length;bezel++) for(let dial=1;dial<=FINISHES.dial.length;dial++) {
  const id=artworkIndex({...DEFAULT_CONFIG,recipe:recipe.id,bezel,dial});
  const native=`resources/images/${device}/${id}.png`;
  if(!check && (!onlyDevice || onlyDevice===device)) {
    const {width,height}=TARGETS[device];
    let raster=await sharp(Buffer.from(art(device,recipe.id,bezel,dial))).resize(width,height).png().toBuffer();
    if(device==='gabbro') {
      if(!masks.has(recipe.id)) {
        const raw=await sharp(Buffer.from(art(device,recipe.id,1,1,true))).resize(width,height).removeAlpha().raw().toBuffer();
        for(let i=0;i<raw.length;i++)raw[i]=Math.round(raw[i]/85)*85;
        const mask=await sharp(raw,{raw:{width,height,channels:3}}).png().toBuffer();
        const maskPath=path.join(root,`resources/images/gabbro/mask-${recipe.id}.png`);
        fs.writeFileSync(maskPath,mask);masks.set(recipe.id,raw);
      }
      const raw=Buffer.from(masks.get(recipe.id));
      const colors=[gabbroPlates[dial-1],...gabbroMetals[bezel-1].toReversed()].map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
      for(let i=0;i<raw.length;i+=3){const color=colors[raw[i]/85];for(let channel=0;channel<3;channel++)raw[i+channel]=color[channel];}
      raster=await sharp(raw,{raw:{width,height,channels:3}}).png().toBuffer();
    }
    const args=['png:-','-alpha','off'];
    if(device==='diorite') args.push('-threshold','50%','-type','bilevel');
    else if(device==='gabbro') {
      // Four intentional hardware colors keep a 2-bit texture below the store
      // cap. Generic four-color clustering averages brass into muddy olive.
      args.push('-type','Palette');
    }
    else {
      args.push('+dither','-colors',device!=='venu2s'?'16':'64');
      if(device!=='venu2s')args.push('-channel','RGB','-posterize','4','+channel');
      args.push('-type','Palette');
    }
    args.push('-strip','-define','png:exclude-chunks=date,time','png:-');
    const bytes=execFileSync(magick,args,{input:raster,maxBuffer:8*1024*1024});
    for(const file of [native]) {fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),bytes);}
  }
  const bytes=fs.readFileSync(path.join(root,native));
  records.push({device,id,recipe:recipe.id,bezel,dial,native,width:TARGETS[device].width,height:TARGETS[device].height,sha256:hash(bytes)});
}
const indexedMasks=RECIPES.map(recipe=>{const file=`resources/images/gabbro/mask-${recipe.id}.png`;return{recipe:recipe.id,file,sha256:hash(fs.readFileSync(path.join(root,file)))}});
const manifest={schemaVersion:1,source:'reference/palettes.json',sourceSHA256:hash(source),contractSHA256:hash(fs.readFileSync(path.join(root,'tools/recipe-contract.mjs'))),rendererSHA256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),note:'Procedural material adaptations from Lab tokens, not pixel-identical browser captures. Monochrome uses explicit linework. Gabbro native full-color PNGs are reference composites of three bundled tone masks recolored by the native palette.',indexedMasks,assets:records};
const json=JSON.stringify(manifest,null,2)+'\n';
if(check) {if(fs.readFileSync(manifestPath,'utf8')!==json) throw new Error('Stale Studio asset manifest');}
else {
  fs.writeFileSync(manifestPath,json);
  const icon='<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25"><circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="2"/><path d="M12 5v7l5 4" fill="none" stroke="white" stroke-width="2"/></svg>';
  const dest=path.join(root,'resources/images/menu-icon.png');
  fs.writeFileSync(dest,await sharp(Buffer.from(icon)).flatten({background:'#000'}).png().toBuffer());
}
function generatedText(relative,expected) {
  const filename=path.join(root,relative);
  if(check){if(fs.readFileSync(filename,'utf8')!==expected)throw new Error(`Stale Studio resource declaration: ${relative}`);}
  else fs.writeFileSync(filename,expected);
}
const count=RECIPES.length*FINISHES.bezel.length*FINISHES.dial.length;
const packagePath='package.json';
const pkg=JSON.parse(fs.readFileSync(path.join(root,packagePath),'utf8'));
const media=[{type:'bitmap',name:'IMAGE_MENU_ICON',file:'images/menu-icon.png',menuIcon:true}];
// Preserve the complete original resource prefix before appending new IDs.
for(const [start,end] of [[1,27],[28,count]])for(const device of ['emery','diorite'])for(let id=start;id<=end;id++)
  media.push({type:'bitmap',name:`STUDIO_ART_${id}`,file:`images/${device}/${id}.png`,targetPlatforms:[device]});
for(const device of ['chalk','gabbro'])for(let id=1;id<=count;id++) {
  const recipe=records.find(r=>r.device===device&&r.id===id).recipe;
  media.push({type:'bitmap',name:`STUDIO_ART_${id}`,file:device==='gabbro'?`images/gabbro/mask-${recipe}.png`:`images/${device}/${id}.png`,targetPlatforms:[device],...(device==='gabbro'?{memoryFormat:'2BitPalette'}:{})});
}
pkg.pebble.resources.media=media;
generatedText(packagePath,JSON.stringify(pkg,null,2)+'\n');
console.log(`${check?'Verified':'Generated'} ${records.length} Pebble material references`);
