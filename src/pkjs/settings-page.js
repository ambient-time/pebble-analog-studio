'use strict';
var protocol = require('./protocol');
module.exports = function page(code, platform) {
  if (!protocol.valid(code)) code = protocol.defaultCode;
  if (['emery','diorite','chalk','gabbro'].indexOf(platform) === -1) platform = 'emery';
  var fields = code.split(':').slice(1);
  var specs = [
    ['Recipe', [[1,'Ivory — fluted chapter ring'],[2,'Frost — cool classic'],[3,'Noir — open heart']]],
    ['Bezel material', [[1,'Brass'],[2,'Cool Chrome'],[3,'Noir'],[4,'Warm Copper'],[5,'Blued Steel'],[6,'Verdigris']]],
    ['Dial material', [[1,'Ivory'],[2,'Frost'],[3,'Ink Black'],[4,'Verdigris'],[5,'Ocean'],[6,'Rosewood']]],
    ['Hands', [[0,'Follow recipe'],[1,'Slender'],[2,'Baton']]],
    ['Markings', [[0,'Follow recipe'],[1,'Ticks'],[2,'Arabic numerals']]],
    ['Date', [[0,'Off'],[1,'On']]],
    ['Seconds', [[0,'Off — less frequent redraws'],[1,'On — updates each second']]],
    ['High contrast', [[0,'Material ink'],[1,'Black or white ink']]]
  ];
  var rows = specs.map(function(spec, i) {
    return '<label for="f'+i+'">'+spec[0]+'</label><select id="f'+i+'">'+spec[1].map(function(option) {
      return '<option value="'+option[0]+'"'+(Number(fields[i])===option[0]?' selected':'')+'>'+option[1]+'</option>';
    }).join('')+'</select>';
  }).join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Classic Studio settings</title><style>body{margin:0;background:#101820;color:#fff;font:16px system-ui,sans-serif}main{max-width:36rem;margin:auto;padding:24px 18px}h1{font-size:28px}p{line-height:1.5;color:#d2d9df}label{display:block;margin:24px 0 8px;font-weight:650}select,input,button{box-sizing:border-box;width:100%;min-height:46px;font:inherit;padding:12px;border:1px solid #bbc4cc;border-radius:8px;background:#fff;color:#15202a}button{margin-top:24px;background:#f0c575}a{color:#f0c575;display:block;padding:14px 0}small{display:block;margin-top:8px;line-height:1.4}#error{color:#ffb6b6}input{font-family:monospace}</style></head><body><main>'+
    '<h1>Classic Studio</h1><p>Three constructions, six bezel and six dial finishes, with working hands. These controls are included in the face and work without loading a website. '+(platform==='diorite'?'Your Pebble 2 SE uses black-and-white linework. Color-only finish differences share the same light or dark treatment.':'Your Pebble uses a limited color palette, with artwork fitted to its screen.')+'</p><p>Additional finishes require Classic Studio 0.2.0 or later. Time Round and Round 2 require 0.3.0 or later.</p>'+
    '<a id="visual" href="https://ambient-time.com/watch/studio/?platform='+platform+'&amp;pebble=1&amp;code='+encodeURIComponent(code)+'">Open the visual editor (internet required)</a>'+rows+
    '<label for="code">Configuration code</label><input id="code" value="'+code+'" maxlength="64" autocapitalize="off" spellcheck="false"><small>Paste a code from the visual editor, or use the controls above.</small><p id="error" role="alert"></p>'+
    '<button id="save">Save to watch</button><a href="pebblejs://close">Cancel</a></main><script>(function(){'+
    'var code=document.getElementById("code");function valid(v){return v.length===18&&/^L1:[1-3]:[1-6]:[1-6]:[0-2]:[0-2]:[01]:[01]:[01]$/.test(v)}'+
    'function update(){var parts=["L1"];for(var i=0;i<8;i++)parts.push(document.getElementById("f"+i).value);code.value=parts.join(":");document.getElementById("visual").href="https://ambient-time.com/watch/studio/?platform='+platform+'&pebble=1&code="+encodeURIComponent(code.value)}'+
    'for(var i=0;i<8;i++)document.getElementById("f"+i).addEventListener("change",update);'+
    'code.addEventListener("input",function(){if(valid(code.value)){var parts=code.value.split(":");for(var i=0;i<8;i++)document.getElementById("f"+i).value=parts[i+1];document.getElementById("visual").href="https://ambient-time.com/watch/studio/?platform='+platform+'&pebble=1&code="+encodeURIComponent(code.value)}});'+
    'document.getElementById("save").addEventListener("click",function(){if(!valid(code.value)){document.getElementById("error").textContent="That code is not supported. Your watch has not been changed.";return}window.location.href="pebblejs://close#"+encodeURIComponent(JSON.stringify({code:code.value}))});})();</script></body></html>';
};
