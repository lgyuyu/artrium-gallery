import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// ============ Vercel/Turso 适配 ============
// 使用 libSQL (Turso) 作为数据库驱动，兼容 Vercel serverless 环境
// 也兼容本地开发（本地 SQLite 文件 或 本地 Turso 实例）

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置。请在 .env 或 Vercel 环境变量中配置。')
  }

  // 如果是 libSQL/Turso URL (libsql:// 或 libsqls://)，使用适配器
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('libsqls://')) {
    const libsql = createClient({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter, log: ['error', 'warn'] } as any)
  }

  // 本地 SQLite 文件模式（开发环境）
  return new PrismaClient({ log: ['error', 'warn'] })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// 启动后检查：如果是全新空库（无机构数据），自动初始化示例数据
db.organization
  .count()
  .then(async (count) => {
    if (count === 0) {
      console.log('[db] 检测到空数据库，自动初始化示例数据...')
      const { seedSampleData } = await import('./seed-data')
      await seedSampleData()
    }
  })
  .catch((e) => console.error('[db] 初始化检查失败:', e))
