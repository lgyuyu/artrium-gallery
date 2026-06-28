import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 上传画作（需口令）- multipart/form-data
// 字段: file (图片), studentId, title, artworkDate?, description?
export async function POST(req: NextRequest) {
  try {
    const { verifyAdmin } = await import('@/lib/admin')
    const auth = await verifyAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const studentId = formData.get('studentId') as string | null
    const title = formData.get('title') as string | null
    const artworkDate = (formData.get('artworkDate') as string | null) || null
    const description = (formData.get('description') as string | null) || null

    if (!file) return NextResponse.json({ error: '缺少图片文件' }, { status: 400 })
    if (!studentId) return NextResponse.json({ error: '缺少学生ID' }, { status: 400 })
    if (!title || !title.trim()) return NextResponse.json({ error: '缺少画作名称' }, { status: 400 })

    // 校验学生存在
    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student) return NextResponse.json({ error: '学生不存在' }, { status: 404 })

    // 校验文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG/PNG/WEBP/GIF 格式' }, { status: 400 })
    }

    // 校验文件大小 (4MB - Vercel serverless body 限制)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: '图片大小不能超过 4MB' }, { status: 400 })
    }

    // 读取文件二进制，转 base64 存储
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString('base64')

    // 存储到 Upload 表
    const uploadId = (await query('SELECT lower(hex(randomblob(12))) as id'))[0].id
    await execute(
      'INSERT INTO Upload (id, data, "mimeType", size, "createdAt") VALUES (?, ?, ?, ?, datetime(\'now\'))',
      [uploadId, base64Data, file.type, buffer.length]
    )

    const imageUrl = `/api/image/${uploadId}`

    // 取该学生当前最大 order
    const maxRows = await query('SELECT MAX("order") as maxOrder FROM Artwork WHERE "studentId" = ?', [studentId])
    const nextOrder = (Number(maxRows[0]?.maxOrder) || -1) + 1

    // 创建画作记录
    const artId = (await query('SELECT lower(hex(randomblob(12))) as id'))[0].id
    await execute(
      'INSERT INTO Artwork (id, title, "imageUrl", "artworkDate", description, "order", "studentId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
      [artId, title.trim(), imageUrl, artworkDate, description, nextOrder, studentId]
    )

    const artwork = (await query('SELECT * FROM Artwork WHERE id = ?', [artId]))[0]
    return NextResponse.json(artwork, { status: 201 })
  } catch (e: any) {
    console.error('[API] artwork upload error:', e)
    return NextResponse.json({ error: e.message || '上传失败' }, { status: 500 })
  }
}

// GET - 获取画作列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')

    let rows
    if (studentId) {
      rows = await query('SELECT * FROM Artwork WHERE "studentId" = ? ORDER BY "order" ASC', [studentId])
    } else {
      rows = await query('SELECT * FROM Artwork ORDER BY "createdAt" DESC')
    }
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 辅助函数（直连 libsql）
import { createClient } from '@libsql/client'

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
}

async function query(sql: string, args: any[] = []) {
  const client = getClient()
  const result = await client.execute({ sql, args })
  return result.rows.map(row => {
    const obj: any = {}
    for (const key in row) obj[key] = row[key]
    return obj
  })
}

async function execute(sql: string, args: any[] = []) {
  const client = getClient()
  return await client.execute({ sql, args })
}
