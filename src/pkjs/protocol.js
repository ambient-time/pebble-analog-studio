'use strict';
var DEFAULT_CODE = 'L1:1:1:1:0:0:0:0:1';
function valid(code) {
  return typeof code === 'string' && code.length === 18 && /^L1:[1-3]:[1-6]:[1-6]:[0-2]:[0-2]:[01]:[01]:[01]$/.test(code);
}
module.exports = { valid: valid, defaultCode: DEFAULT_CODE };
