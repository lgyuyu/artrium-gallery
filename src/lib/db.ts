import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// ============ Vercel/Turso 适配 ============
// 使用 libSQL (Turso) 作为数据库驱动，兼容 Vercel serverless 环境

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('[db] DATABASE_URL 未设置')
    // 返回一个会报错的 client，而不是 throw（避免模块加载崩溃）
    return new PrismaClient({ log: ['error'] })
  }

  // 如果是 libSQL/Turso URL，使用适配器
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('libsqls://')) {
    try {
      const libsql = createClient({
        url: databaseUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      })
      const adapter = new PrismaLibSQL(libsql)
      return new PrismaClient({ adapter, log: ['error'] } as any)
    } catch (e) {
      console.error('[db] 创建 libSQL client 失败:', e)
      return new PrismaClient({ log: ['error'] })
    }
  }

  // 本地 SQLite 文件模式
  return new PrismaClient({ log: ['error'] })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// 自动初始化 seed 数据（延迟执行，不阻塞模块加载，失败不影响请求）
let seedInitialized = false
export async function ensureSeedData() {
  if (seedInitialized) return
  seedInitialized = true
  try {
    const count = await db.organization.count()
    if (count === 0) {
      console.log('[db] 检测到空数据库，自动初始化示例数据...')
      const { seedSampleData } = await import('./seed-data')
      await seedSampleData()
      console.log('[db] 示例数据初始化完成')
    }
  } catch (e) {
    console.error('[db] seed 检查失败:', e)
    seedInitialized = false // 允许下次重试
  }
}
