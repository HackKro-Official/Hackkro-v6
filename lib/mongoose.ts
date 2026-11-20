import "./polyfill-buffer"
import mongoose from "mongoose"
import dns from "dns"

// Fix for Node.js on Windows SRV DNS resolution failures (ECONNREFUSED)
try {
  dns.setDefaultResultOrder?.("ipv4first")
  dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"])
} catch (dnsErr) {
  // Ignore in environments where setting DNS servers is restricted
}

const MONGODB_URI = process.env.MONGODB_URI || ""

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not set. HackKro v3.0 uses Prisma relational storage (DATABASE_URL) by default.")
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  namespace NodeJS {
    interface Global {
      mongoose?: MongooseCache
    }
  }
}

let cached: MongooseCache = (global as unknown as NodeJS.Global).mongoose || { conn: null, promise: null }

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (MONGODB_URI.includes("<") || MONGODB_URI.includes(">") || MONGODB_URI.includes("aapka-cluster")) {
    const errorMsg = "CRITICAL: MONGODB_URI contains a placeholder like '<aapka-cluster-domain>'. Please replace it with your real MongoDB Atlas cluster domain (e.g. cluster0.abcde.mongodb.net) in your .env file."
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        return m
      })
      .catch((err) => {
        cached.promise = null
        console.error("MongoDB connection failed:", err.message)
        throw err
      })
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (err) {
    cached.promise = null
    throw err
  }
}

export default connectToDatabase
