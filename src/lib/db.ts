import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || ''
  const token = process.env.DATABASE_AUTH_TOKEN || ''

  console.log('[db] URL:', url ? url.substring(0, 40) : 'EMPTY')
  console.log('[db] Token set:', token ? `yes (${token.length} chars)` : 'NO')

  if (url.startsWith('libsql://') || url.startsWith('libsqls://')) {
    const libsql = createClient({ url, authToken: token })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter } as any)
  }

  return new PrismaClient()
}

if (!globalForPrisma.prisma) {
  try {
    globalForPrisma.prisma = createPrismaClient()
  } catch (e) {
    console.error('[db] init failed:', e)
  }
}

export const db = globalForPrisma.prisma || new PrismaClient()

let seedInitialized = false
export async function ensureSeedData() {
  if (seedInitialized) return
  seedInitialized = true
  try {
    const count = await db.organization.count()
    if (count === 0) {
      console.log('[db] seeding...')
      const { seedSampleData } = await import('./seed-data')
      await seedSampleData()
    }
  } catch (e) {
    console.error('[db] seed failed:', e)
    seedInitialized = false
  }
}
