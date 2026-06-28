import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// 自动初始化 seed 数据（延迟执行，不阻塞模块加载）
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
    seedInitialized = false
  }
}
