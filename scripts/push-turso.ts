// 临时脚本：通过 libSQL client 直接推送 Prisma schema 到 Turso
import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const url = process.env.DATABASE_URL!
const token = process.env.DATABASE_AUTH_TOKEN!

const client = createClient({ url, authToken: token })

// 从 Prisma schema 生成的 SQL（用 prisma migrate diff）
// 先用 prisma 内部工具生成 SQL
const schema = readFileSync('./prisma/schema.prisma', 'utf-8')

// 手动构造 CREATE TABLE 语句（Prisma SQLite 方言）
const statements = [
  // Organization
  `CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '艺境美术 ARTRIUM',
    "slogan" TEXT,
    "logo" TEXT,
    "defaultStyle" TEXT NOT NULL DEFAULT 'modern',
    "adminPassword" TEXT NOT NULL DEFAULT 'art2025',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  // Student
  `CREATE TABLE IF NOT EXISTS "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" TEXT,
    "bio" TEXT,
    "style" TEXT NOT NULL DEFAULT 'modern',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  // Artwork
  `CREATE TABLE IF NOT EXISTS "Artwork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "artworkDate" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "studentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Artwork_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE
  )`,
  // Upload
  `CREATE TABLE IF NOT EXISTS "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" BLOB NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  // Index
  `CREATE INDEX IF NOT EXISTS "Artwork_studentId_idx" ON "Artwork"("studentId")`,
]

async function main() {
  console.log('正在推送 schema 到 Turso...')
  for (const sql of statements) {
    try {
      await client.execute(sql)
      console.log('✅', sql.substring(0, 60).replace(/\n/g, ' ') + '...')
    } catch (e: any) {
      console.error('❌', e.message)
    }
  }
  console.log('\n表结构验证：')
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
  console.log('表列表:', tables.rows.map(r => r.name))
}

main().catch(console.error)
