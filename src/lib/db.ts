import { PrismaClient } from '@prisma/client'
import { ensurePersistentDB, recoverIfEmpty } from './db-persist'

// 启动时确保数据库在持久位置，并检查是否需要恢复
ensurePersistentDB()
recoverIfEmpty()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
