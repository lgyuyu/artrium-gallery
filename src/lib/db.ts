import { PrismaClient } from '@prisma/client'
import { ensurePersistentDB } from './db-persist'

// 启动时确保数据库在持久位置，并设置 DATABASE_URL
ensurePersistentDB()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// 启动后检查：如果是全新空库（无机构数据），自动初始化示例数据
// 这样首次发布或数据库被清空后能自动恢复示例数据，但不覆盖用户已上传的作品
db.organization.count()
  .then(async (count) => {
    if (count === 0) {
      console.log('[db] 检测到空数据库，自动初始化示例数据...')
      const { seedSampleData } = await import('./seed-data')
      await seedSampleData()
    }
  })
  .catch((e) => console.error('[db] 初始化检查失败:', e))
