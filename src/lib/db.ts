import { createClient, type Client } from '@libsql/client'

// ============ libSQL 直连适配层 ============
// 绕过 Prisma，直接用 @libsql/client
// 提供 Prisma 风格的 API：db.organization.findFirst() 等

const globalForDb = globalThis as unknown as {
  libsqlClient: Client | undefined
}

function getClient(): Client {
  if (globalForDb.libsqlClient) return globalForDb.libsqlClient

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || ''
  const token = process.env.DATABASE_AUTH_TOKEN || ''

  const client = createClient({
    url: url.startsWith('libsql') ? url : 'libsql://artrium-lgyuyu.aws-ap-northeast-1.turso.io',
    authToken: token,
  })

  globalForDb.libsqlClient = client
  return client
}

const client = getClient()

// 辅助函数
async function query(sql: string, args: any[] = []) {
  const result = await client.execute({ sql, args })
  return result.rows.map(row => {
    const obj: any = {}
    for (const key in row) {
      obj[key] = row[key]
    }
    return obj
  })
}

async function execute(sql: string, args: any[] = []) {
  return await client.execute({ sql, args })
}

// Prisma 风格 API
export const db = {
  organization: {
    async findFirst() {
      const rows = await query('SELECT * FROM Organization LIMIT 1')
      return rows[0] || null
    },
    async count() {
      const rows = await query('SELECT COUNT(*) as cnt FROM Organization')
      return Number(rows[0]?.cnt || 0)
    },
    async update({ where, data }: { where: { id: string }, data: any }) {
      const sets = Object.entries(data).filter(([_, v]) => v !== undefined).map(([k, v]) => `"${k}" = ?`)
      const vals = Object.entries(data).filter(([_, v]) => v !== undefined).map(([_, v]) => v)
      await execute(`UPDATE Organization SET ${sets.join(', ')}, "updatedAt" = datetime('now') WHERE id = ?`, [...vals, where.id])
      const rows = await query('SELECT * FROM Organization WHERE id = ?', [where.id])
      return rows[0]
    },
    async create({ data }: { data: any }) {
      const keys = Object.keys(data)
      const id = data.id || (await getClient()).execute("SELECT lower(hex(randomblob(12))) as id").then(r => r.rows[0].id)
      const allKeys = data.id ? keys : ['id', ...keys]
      const allVals = data.id ? Object.values(data) : [id, ...Object.values(data)]
      const placeholders = allKeys.map(() => '?').join(', ')
      await execute(`INSERT INTO Organization (${allKeys.map(k => `"${k}"`).join(', ')}, "createdAt", "updatedAt") VALUES (${placeholders}, datetime('now'), datetime('now'))`, allVals)
      return (await query('SELECT * FROM Organization WHERE id = ?', [data.id || id]))[0]
    },
  },

  student: {
    async findMany({ orderBy, include }: any = {}) {
      let sql = 'SELECT * FROM Student'
      if (orderBy?.order) sql += ` ORDER BY "order" ${orderBy.order === 'asc' ? 'ASC' : 'DESC'}`
      const students = await query(sql)

      if (include?.artworks) {
        for (const s of students) {
          s.artworks = await query('SELECT * FROM Artwork WHERE "studentId" = ? ORDER BY "order" ASC', [s.id])
        }
      }
      return students
    },
    async findUnique({ where }: { where: { id: string } }) {
      const rows = await query('SELECT * FROM Student WHERE id = ?', [where.id])
      const student = rows[0] || null
      if (student) {
        student.artworks = await query('SELECT * FROM Artwork WHERE "studentId" = ? ORDER BY "order" ASC', [where.id])
      }
      return student
    },
    async create({ data }: { data: any }) {
      const keys = Object.keys(data)
      const id = data.id || (await getClient()).execute("SELECT lower(hex(randomblob(12))) as id").then(r => r.rows[0].id)
      const allKeys = data.id ? keys : ['id', ...keys]
      const allVals = data.id ? Object.values(data) : [id, ...Object.values(data)]
      const placeholders = allKeys.map(() => '?').join(', ')
      await execute(`INSERT INTO Student (${allKeys.map(k => `"${k}"`).join(', ')}, "createdAt", "updatedAt") VALUES (${placeholders}, datetime('now'), datetime('now'))`, allVals)
      const rows = await query('SELECT * FROM Student WHERE id = ?', [data.id || id])
      return rows[0]
    },
    async update({ where, data }: { where: { id: string }, data: any }) {
      const entries = Object.entries(data).filter(([_, v]) => v !== undefined)
      const sets = entries.map(([k]) => `"${k}" = ?`)
      await execute(`UPDATE Student SET ${sets.join(', ')}, "updatedAt" = datetime('now') WHERE id = ?`, [...entries.map(e => e[1]), where.id])
      const rows = await query('SELECT * FROM Student WHERE id = ?', [where.id])
      return rows[0]
    },
    async delete({ where }: { where: { id: string } }) {
      const rows = await query('SELECT * FROM Student WHERE id = ?', [where.id])
      await execute('DELETE FROM Artwork WHERE "studentId" = ?', [where.id])
      await execute('DELETE FROM Student WHERE id = ?', [where.id])
      return rows[0]
    },
    async aggregate({ _max }: any = {}) {
      const rows = await query('SELECT MAX("order") as maxOrder FROM Student')
      return { _max: { order: rows[0]?.maxOrder ?? 0 } }
    },
  },

  artwork: {
    async findMany({ where, orderBy }: any = {}) {
      let sql = 'SELECT * FROM Artwork'
      const args: any[] = []
      if (where?.studentId) {
        sql += ' WHERE "studentId" = ?'
        args.push(where.studentId)
      }
      if (orderBy?.order) sql += ` ORDER BY "order" ${orderBy.order === 'asc' ? 'ASC' : 'DESC'}`
      return await query(sql, args)
    },
    async findUnique({ where }: { where: { id: string } }) {
      const rows = await query('SELECT * FROM Artwork WHERE id = ?', [where.id])
      return rows[0] || null
    },
    async create({ data }: { data: any }) {
      const keys = Object.keys(data)
      const id = data.id || (await getClient()).execute("SELECT lower(hex(randomblob(12))) as id").then(r => r.rows[0].id)
      const allKeys = data.id ? keys : ['id', ...keys]
      const allVals = data.id ? Object.values(data) : [id, ...Object.values(data)]
      const placeholders = allKeys.map(() => '?').join(', ')
      await execute(`INSERT INTO Artwork (${allKeys.map(k => `"${k}"`).join(', ')}, "createdAt", "updatedAt") VALUES (${placeholders}, datetime('now'), datetime('now'))`, allVals)
      return (await query('SELECT * FROM Artwork WHERE id = ?', [data.id || id]))[0]
    },
    async update({ where, data }: { where: { id: string }, data: any }) {
      const entries = Object.entries(data).filter(([_, v]) => v !== undefined)
      const sets = entries.map(([k]) => `"${k}" = ?`)
      await execute(`UPDATE Artwork SET ${sets.join(', ')}, "updatedAt" = datetime('now') WHERE id = ?`, [...entries.map(e => e[1]), where.id])
      const rows = await query('SELECT * FROM Artwork WHERE id = ?', [where.id])
      return rows[0]
    },
    async delete({ where }: { where: { id: string } }) {
      const rows = await query('SELECT * FROM Artwork WHERE id = ?', [where.id])
      await execute('DELETE FROM Artwork WHERE id = ?', [where.id])
      return rows[0]
    },
  },

  upload: {
    async findUnique({ where }: { where: { id: string } }) {
      const rows = await query('SELECT * FROM Upload WHERE id = ?', [where.id])
      return rows[0] || null
    },
    async create({ data }: { data: any }) {
      const keys = Object.keys(data)
      const id = data.id || (await getClient()).execute("SELECT lower(hex(randomblob(12))) as id").then(r => r.rows[0].id)
      const allKeys = data.id ? keys : ['id', ...keys]
      const allVals = data.id ? Object.values(data) : [id, ...Object.values(data)]
      const placeholders = allKeys.map(() => '?').join(', ')
      await execute(`INSERT INTO Upload (${allKeys.map(k => `"${k}"`).join(', ')}, "createdAt") VALUES (${placeholders}, datetime('now'))`, allVals)
      return { ...data, id: data.id || id }
    },
    async delete({ where }: { where: { id: string } }) {
      await execute('DELETE FROM Upload WHERE id = ?', [where.id])
    },
  },
}

// Seed 初始化
let seedInitialized = false
export async function ensureSeedData() {
  if (seedInitialized) return
  seedInitialized = true
  try {
    const count = await db.organization.count()
    if (count === 0) {
      console.log('[db] seeding sample data...')
      const { seedSampleData } = await import('./seed-data')
      await seedSampleData()
    }
  } catch (e) {
    console.error('[db] seed failed:', e)
    seedInitialized = false
  }
}
