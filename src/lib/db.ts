import { createClient, type Client } from '@libsql/client'

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

async function genId() {
  const r = await client.execute("SELECT lower(hex(randomblob(12))) as id")
  return r.rows[0].id as string
}

async function query(sql: string, args: any[] = []) {
  const result = await client.execute({ sql, args })
  return result.rows.map(row => {
    const obj: any = {}
    for (const key in row) obj[key] = row[key]
    return obj
  })
}

async function execute(sql: string, args: any[] = []) {
  return await client.execute({ sql, args })
}

const _create = (table: string) => async ({ data }: { data: any }) => {
  const keys = Object.keys(data)
  const id = data.id || await genId()
  const allKeys = data.id ? keys : ['id', ...keys]
  const allVals = data.id ? Object.values(data) : [id, ...Object.values(data)]
  const placeholders = allKeys.map(() => '?').join(', ')
  await execute(`INSERT INTO "${table}" (${allKeys.map(k => `"${k}"`).join(', ')}, "createdAt", "updatedAt") VALUES (${placeholders}, datetime('now'), datetime('now'))`, allVals)
  return (await query(`SELECT * FROM "${table}" WHERE id = ?`, [data.id || id]))[0]
}

const _update = (table: string) => async ({ where, data }: { where: { id: string }, data: any }) => {
  const entries = Object.entries(data).filter(([_, v]) => v !== undefined)
  const sets = entries.map(([k]) => `"${k}" = ?`)
  await execute(`UPDATE "${table}" SET ${sets.join(', ')}, "updatedAt" = datetime('now') WHERE id = ?`, [...entries.map(e => e[1]), where.id])
  return (await query(`SELECT * FROM "${table}" WHERE id = ?`, [where.id]))[0]
}

const _delete = (table: string) => async ({ where }: { where: { id: string } }) => {
  const rows = await query(`SELECT * FROM "${table}" WHERE id = ?`, [where.id])
  await execute(`DELETE FROM "${table}" WHERE id = ?`, [where.id])
  return rows[0]
}

export const db = {
  organization: {
    findFirst: async () => (await query('SELECT * FROM "Organization" LIMIT 1'))[0] || null,
    count: async () => Number((await query('SELECT COUNT(*) as cnt FROM "Organization"'))[0]?.cnt || 0),
    update: _update("Organization"),
    create: _create("Organization"),
  },
  student: {
    findMany: async ({ orderBy, include }: any = {}) => {
      let sql = 'SELECT * FROM "Student"'
      if (orderBy?.order) sql += ` ORDER BY "order" ${orderBy.order === 'asc' ? 'ASC' : 'DESC'}`
      const students = await query(sql)
      if (include?.artworks) {
        for (const s of students) {
          s.artworks = await query('SELECT * FROM "Artwork" WHERE "studentId" = ? ORDER BY "order" ASC', [s.id])
        }
      }
      return students
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const student = (await query('SELECT * FROM "Student" WHERE id = ?', [where.id]))[0] || null
      if (student) {
        student.artworks = await query('SELECT * FROM "Artwork" WHERE "studentId" = ? ORDER BY "order" ASC', [where.id])
      }
      return student
    },
    create: _create("Student"),
    update: _update("Student"),
    delete: async ({ where }: { where: { id: string } }) => {
      const rows = await query('SELECT * FROM "Student" WHERE id = ?', [where.id])
      await execute('DELETE FROM "Artwork" WHERE "studentId" = ?', [where.id])
      await execute('DELETE FROM "Student" WHERE id = ?', [where.id])
      return rows[0]
    },
    aggregate: async ({ _max }: any = {}) => {
      const rows = await query('SELECT MAX("order") as maxOrder FROM "Student"')
      return { _max: { order: rows[0]?.maxOrder ?? 0 } }
    },
  },
  artwork: {
    findMany: async ({ where, orderBy }: any = {}) => {
      let sql = 'SELECT * FROM "Artwork"'
      const args: any[] = []
      if (where?.studentId) { sql += ' WHERE "studentId" = ?'; args.push(where.studentId) }
      if (orderBy?.order) sql += ` ORDER BY "order" ${orderBy.order === 'asc' ? 'ASC' : 'DESC'}`
      return await query(sql, args)
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      return (await query('SELECT * FROM "Artwork" WHERE id = ?', [where.id]))[0] || null
    },
    create: _create("Artwork"),
    update: _update("Artwork"),
    delete: _delete("Artwork"),
  },
  upload: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return (await query('SELECT * FROM "Upload" WHERE id = ?', [where.id]))[0] || null
    },
    create: async ({ data }: { data: any }) => {
      const id = data.id || await genId()
      const allKeys = data.id ? Object.keys(data) : ['id', ...Object.keys(data)]
      const allVals = data.id ? Object.values(data) : [id, ...Object.values(data)]
      await execute(`INSERT INTO "Upload" (${allKeys.map(k => `"${k}"`).join(', ')}, "createdAt") VALUES (${allKeys.map(() => '?').join(', ')}, datetime('now'))`, allVals)
      return { ...data, id: data.id || id }
    },
    delete: async ({ where }: { where: { id: string } }) => {
      await execute('DELETE FROM "Upload" WHERE id = ?', [where.id])
    },
  },
}

let seedInitialized = false
export async function ensureSeedData() {
  if (seedInitialized) return
  seedInitialized = true
  try {
    const orgCount = await db.organization.count()
    const students = await db.student.findMany()
    if (orgCount > 0 && students.length > 0) return

    const { seedSampleData } = await import('./seed-data')
    await seedSampleData()
  } catch (e) {
    console.error('[db] seed failed:', e)
    seedInitialized = false
  }
}
