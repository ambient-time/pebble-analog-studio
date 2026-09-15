// Stable wire IDs. Append versions/IDs; never reinterpret saved configurations.
export const RECIPES = Object.freeze([
  {id:1,name:'Ivory',case:'fluted',plate:'chapter-ring',dress:'chapter',bezel:1,dial:1},
  {id:2,name:'Frost',case:'skagen-rim',plate:'classic',dress:'skagen',bezel:2,dial:2},
  {id:3,name:'Noir',case:'coin-edge',plate:'open-heart',dress:'hands',bezel:3,dial:3},
]);
export const FINISHES = Object.freeze({bezel:['Brass','Cool Chrome','Noir','Warm Copper','Blued Steel','Verdigris'],dial:['Ivory','Frost','Ink Black','Verdigris','Ocean','Rosewood']});
export const DIAL_DARK = Object.freeze([false,false,true,true,true,true]);
export const DIAL_INKS = Object.freeze(['#6a3c22','#1a1c22','#d8cdbb','#b9e7d5','#eeeeee','#ffe0e8']);
export const BEZEL_ACCENTS = Object.freeze(['#8a5a38','#c43a2e','#cf8c5e','#c8784c','#6baad8','#7ec8a8']);
export const DEFAULT_CONFIG = Object.freeze({recipe:1,bezel:1,dial:1,hands:0,markings:0,date:0,seconds:0,contrast:1});
export const TARGETS = Object.freeze({emery:{width:200,height:228},diorite:{width:144,height:168},chalk:{width:180,height:180},gabbro:{width:260,height:260}});
const fields = ['recipe','bezel','dial','hands','markings','date','seconds','contrast'];
const ranges = [[1,3],[1,6],[1,6],[0,2],[0,2],[0,1],[0,1],[0,1]];
export function validateConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a complete watch setup.');
  if (Object.keys(value).some(key=>!fields.includes(key))) throw new Error('This setup contains an unsupported option.');
  return Object.fromEntries(fields.map((key,i)=>{
    const v=value[key], [min,max]=ranges[i];
    if (!Number.isInteger(v) || v<min || v>max) throw new Error(`Unsupported or missing ${key}.`);
    return [key,v];
  }));
}
export function encodeConfig(value) {
  const config=validateConfig(value);
  return 'L1:'+fields.map(key=>config[key]).join(':');
}
export function decodeConfig(code) {
  if(typeof code!=='string' || code.length!==18 || !/^L1:[1-3]:[1-6]:[1-6]:[0-2]:[0-2]:[01]:[01]:[01]$/.test(code))
    throw new Error('Unsupported or incomplete setup code. Expected the L1 format.');
  return validateConfig(Object.fromEntries(code.slice(3).split(':').map((v,i)=>[fields[i],Number(v)])));
}
export function artworkIndex(config) {
  const c=validateConfig(config);
  if(c.bezel<=3 && c.dial<=3)return (c.recipe-1)*9+(c.bezel-1)*3+c.dial;
  const rank=c.bezel<=3?(c.bezel-1)*3+c.dial-3:9+(c.bezel-4)*6+c.dial;
  return 27+(c.recipe-1)*27+rank;
}
export function normalizeLabSetup(value) {
  if(typeof value==='string') return decodeConfig(value);
  if(value && Object.hasOwn(value,'recipe')) return validateConfig(value);
  if(!value || value.faceMode!=='remix' || value.plug!=null) throw new Error('Only supported remix recipes can be imported.');
  const plate=value.plate??value.dial;
  if(value.plate && value.dial && value.plate!==value.dial) throw new Error('Conflicting plate construction.');
  const recipe=RECIPES.find(r=>r.case===value.case && r.plate===plate && r.dress===value.dress);
  if(!recipe) throw new Error('That construction or dress is not available in this pilot.');
  const bezel=FINISHES.bezel.indexOf(value.finishes?.bezel)+1;
  const dial=FINISHES.dial.indexOf(value.finishes?.dial)+1;
  if(!['none','date'].includes(value.complication)) throw new Error('Unsupported complication.');
  return validateConfig({...DEFAULT_CONFIG,recipe:recipe.id,bezel,dial,date:value.complication==='date'?1:0});
}
