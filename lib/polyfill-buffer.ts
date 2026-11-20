import buffer from "node:buffer"

// Polyfill for Node.js 22/24+ where SlowBuffer was removed, preventing crashes in buffer-equal-constant-time / jsonwebtoken / jwa
if (typeof (buffer as any).SlowBuffer === "undefined") {
  ;(buffer as any).SlowBuffer = buffer.Buffer
}

try {
  // Also patch the CommonJS 'buffer' export if available
  const cjsBuffer = require("buffer")
  if (cjsBuffer && typeof cjsBuffer.SlowBuffer === "undefined") {
    cjsBuffer.SlowBuffer = cjsBuffer.Buffer || buffer.Buffer
  }
} catch {
  // Ignore
}
