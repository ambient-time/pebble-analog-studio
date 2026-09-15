// Stage unaltered native captures only after all declared targets pass.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pbwHash=digest(path.join(root,'build/classic-studio.pbw'));
const store=path.resolve(root,'../store/classic-studio');
const listing=JSON.parse(fs.readFileSync(path.join(store,'listing.json')));
const fixtures=['ivory','frost','noir','copper-verdigris','blued-ocean'];
const dimensions={emery:[200,228],diorite:[144,168],chalk:[180,180],gabbro:[260,260]};
const screenshots=[];
// Validate every target before changing any staged assets.
for(const platform of pkg.pebble.targetPlatforms){
  const report=JSON.parse(fs.readFileSync(path.join(root,`build/evidence/${platform}-report.json`)));
  if(report.pbwSHA256!==pbwHash||!report.invalidCodeUnchanged||!report.restartRetained||!report.secondsAdvance)throw Error('Incomplete evidence: '+platform);
  const resourceSize=fs.statSync(path.join(root,`build/${platform}/app_resources.pbpack`)).size;
  if(resourceSize>262144)throw Error(`${platform} exceeds SDK store resource limit: ${resourceSize}`);
  for(const name of fixtures){
    const file=path.join(root,`build/evidence/${platform}-${name}.png`);
    if(!report.frames.includes(`build/evidence/${platform}-${name}.png`))throw Error('Capture absent from report');
    const bytes=fs.readFileSync(file),[w,h]=dimensions[platform];
    if(bytes.readUInt32BE(16)!==w||bytes.readUInt32BE(20)!==h)throw Error('Wrong native dimensions');
  }
}
fs.mkdirSync(path.join(store,'screenshots'),{recursive:true});
for(const platform of pkg.pebble.targetPlatforms){
  const reportFile=path.join(root,`build/evidence/${platform}-report.json`);
  const report=JSON.parse(fs.readFileSync(reportFile));
  for(const frame of report.frames)
    fs.copyFileSync(path.join(root,frame),path.join(root,'evidence',path.basename(frame)));
  fs.copyFileSync(reportFile,path.join(root,`evidence/${platform}-report.json`));
  for(const name of fixtures){
    const filename=`screenshots/${platform}_${name==='ivory'?'hero':name}.png`;
    fs.copyFileSync(path.join(root,`build/evidence/${platform}-${name}.png`),path.join(store,filename));
    screenshots.push(filename);
  }
}
listing.screenshots=screenshots;
listing.version=pkg.version;
fs.writeFileSync(path.join(store,'listing.json'),JSON.stringify(listing,null,2)+'\n');
console.log(`Staged ${screenshots.length} unchanged native captures for ${pkg.version}; ${pbwHash}`);
