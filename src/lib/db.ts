import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 创建 Prisma client（懒加载模式）
function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL || ''

  if (url.startsWith('libsql://') || url.startsWith('libsqls://')) {
    // 运行时：用 driver adapter 连 Turso
    // 用 require 而不是 import，避免构建时静态分析加载 adapter
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')
    const { createClient } = require('@libsql/client')
    const libsql = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  // 本地开发或构建时（file: URL 或无 URL）
  return new PrismaClient()
}

// 只在非构建环境下创建 client
if (!globalForPrisma.prisma) {
  try {
    globalForPrisma.prisma = createPrismaClient()
  } catch (e) {
    console.error('[db] 创建 Prisma client 失败:', e)
  }
}

export const db = globalForPrisma.prisma || new PrismaClient()

// 延迟初始化 seed 数据
let seedInitialized = false
export async function ensureSeedData() {
  if (seedInitialized) return
  seedInitialized = true
  try {
    const count = await db.organization.count()
    if (count === 0) {
      console.log('[db] 初始化示例数据...')
      const { seedSampleData } = await import('./seed-data')
      await seedSampleData()
    }
  } catch (e) {
    console.error('[db] seed 失败:', e)
    seedInitialized = false
  }
}
