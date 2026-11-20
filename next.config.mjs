import buffer from 'node:buffer'

// Polyfill SlowBuffer for environments (Node 22/24+) where legacy SlowBuffer was removed
if (typeof buffer.SlowBuffer === 'undefined') {
  buffer.SlowBuffer = buffer.Buffer
}
try {
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const cjsBuffer = require('buffer')
  if (cjsBuffer && typeof cjsBuffer.SlowBuffer === 'undefined') {
    cjsBuffer.SlowBuffer = cjsBuffer.Buffer || buffer.Buffer
  }
} catch {
  // Ignore
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'nodemailer', 'jsonwebtoken'],
  },
}

export default nextConfig
