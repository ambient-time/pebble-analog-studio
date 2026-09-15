'use strict';
var protocol = require('./protocol');
var settingsPage = require('./settings-page');
var KEY = 'ambient-time.classic-studio.code.v1';
var code = protocol.defaultCode;
var hasSaved = false;
try { var saved = localStorage.getItem(KEY); if (protocol.valid(saved)) { code = saved; hasSaved = true; } } catch (e) {}
function send(next) {
  Pebble.sendAppMessage({STUDIO_CODE: next}, function () {
    code = next;
    hasSaved = true;
    try { localStorage.setItem(KEY, code); } catch (e) { console.log('Classic Studio: phone cache unavailable; watch retains settings'); }
  }, function (e) { console.log('Classic Studio: settings delivery failed ' + JSON.stringify(e)); });
}
// A fresh/cleared phone cache must not overwrite a valid design on the watch.
Pebble.addEventListener('ready', function () { if (hasSaved) send(code); });
Pebble.addEventListener('showConfiguration', function () {
  var platform = 'emery';
  try {
    var active = Pebble.getActiveWatchInfo().platform;
    if (['emery','diorite','chalk','gabbro'].indexOf(active) !== -1) platform = active;
  } catch (e) {}
  Pebble.openURL('data:text/html;charset=utf-8,' + encodeURIComponent(settingsPage(code, platform)));
});
Pebble.addEventListener('webviewclosed', function (event) {
  if (!event || !event.response) return;
  try {
    var values = JSON.parse(event.response.charAt(0) === '{' ? event.response : decodeURIComponent(event.response));
    if (!values || !protocol.valid(values.code)) throw new Error('Invalid configuration');
    send(values.code);
  } catch (e) { console.log('Classic Studio: rejected invalid settings'); }
});
