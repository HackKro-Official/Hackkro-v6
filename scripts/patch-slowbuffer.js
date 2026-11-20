const fs = require('fs');
const path = require('path');

const patchedContent = `/*jshint node:true */
'use strict';
var Buffer = require('buffer').Buffer;
var SlowBuffer = require('buffer').SlowBuffer;

module.exports = bufferEq;

function bufferEq(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  var c = 0;
  for (var i = 0; i < a.length; i++) {
    c |= a[i] ^ b[i];
  }
  return c === 0;
}

bufferEq.install = function() {
  Buffer.prototype.equal = function equal(that) {
    return bufferEq(this, that);
  };
  if (typeof SlowBuffer !== 'undefined' && SlowBuffer && SlowBuffer.prototype) {
    SlowBuffer.prototype.equal = Buffer.prototype.equal;
  }
};

var origBufEqual = Buffer.prototype.equal;
var origSlowBufEqual = (typeof SlowBuffer !== 'undefined' && SlowBuffer && SlowBuffer.prototype) ? SlowBuffer.prototype.equal : undefined;

bufferEq.restore = function() {
  Buffer.prototype.equal = origBufEqual;
  if (typeof SlowBuffer !== 'undefined' && SlowBuffer && SlowBuffer.prototype) {
    SlowBuffer.prototype.equal = origSlowBufEqual;
  }
};
`;

function walkAndPatch(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'buffer-equal-constant-time') {
        const target = path.join(fullPath, 'index.js');
        try {
          fs.writeFileSync(target, patchedContent, 'utf8');
          console.log('[patch-slowbuffer] Replaced with safe implementation:', target);
        } catch (e) {
          console.error('[patch-slowbuffer] Failed to write', target, e.message);
        }
      } else {
        walkAndPatch(fullPath);
      }
    }
  }
}

const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  walkAndPatch(nodeModulesPath);
} else {
  console.log('[patch-slowbuffer] node_modules not found, skipping.');
}
