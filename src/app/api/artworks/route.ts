import { NextRequest, NextResponse } from 'next/server'

// 上传画作（需口令）
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

    const { db } = await import('@/lib/db')
    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student) return NextResponse.json({ error: '学生不存在' }, { status: 404 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG/PNG/WEBP/GIF 格式' }, { status: 400 })
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: '图片大小不能超过 4MB' }, { status: 400 })
    }

    // 读取文件
    const arrayBuffer = await file.arrayBuffer()
    const originalBuffer = Buffer.from(arrayBuffer)

    // 用 sharp 压缩
    let compressedBuffer: Buffer
    let storeMime: string

    if (file.type === 'image/gif') {
      // GIF 保留原样（保留动画）
      compressedBuffer = originalBuffer
      storeMime = 'image/gif'
    } else {
      try {
        compressedBuffer = await sharp(originalBuffer)
          .resize(1000, 1300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75, progressive: true })
          .toBuffer()
        storeMime = 'image/jpeg'
      } catch (sharpErr) {
        // sharp 失败则用原图
        console.error('[upload] sharp failed, using original:', sharpErr)
        compressedBuffer = originalBuffer
        storeMime = file.type
      }
    }

    console.log(`[upload] 压缩: ${originalBuffer.length} → ${compressedBuffer.length} bytes (${Math.round(compressedBuffer.length / 1024)}KB)`)

    // base64 存储
    const base64Data = compressedBuffer.toString('base64')

    const { createClient } = await import('@libsql/client')
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '',
      authToken: process.env.DATABASE_AUTH_TOKEN,
    })

    // 生成 ID
    const idResult = await libsql.execute("SELECT lower(hex(randomblob(12))) as id")
    const uploadId = idResult.rows[0].id

    await libsql.execute({
      sql: 'INSERT INTO Upload (id, data, "mimeType", size, "createdAt") VALUES (?, ?, ?, ?, datetime(\'now\'))',
      args: [uploadId, base64Data, storeMime, compressedBuffer.length]
    })

    const imageUrl = `/api/image/${uploadId}`

    // 取该学生当前最大 order
    const maxResult = await libsql.execute({
      sql: 'SELECT MAX("order") as maxOrder FROM Artwork WHERE "studentId" = ?',
      args: [studentId]
    })
    const nextOrder = (Number(maxResult.rows[0]?.maxOrder) ?? -1) + 1

    const artIdResult = await libsql.execute("SELECT lower(hex(randomblob(12))) as id")
    const artId = artIdResult.rows[0].id

    await libsql.execute({
      sql: 'INSERT INTO Artwork (id, title, "imageUrl", "artworkDate", description, "order", "studentId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
      args: [artId, title.trim(), imageUrl, artworkDate, description, nextOrder, studentId]
    })

    const result = await libsql.execute({ sql: 'SELECT * FROM Artwork WHERE id = ?', args: [artId] })
    const artwork = result.rows[0]
    return NextResponse.json(artwork, { status: 201 })
  } catch (e: any) {
    console.error('[API] artwork upload error:', e)
    return NextResponse.json({ error: e.message || '上传失败' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const { db } = await import('@/lib/db')

    let rows
    if (studentId) {
      rows = await db.artwork.findMany({ where: { studentId }, orderBy: { order: 'asc' } })
    } else {
      rows = await db.artwork.findMany({})
    }
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// sharp 动态导入
let _sharp: any
async function sharp(buf: Buffer) {
  if (!_sharp) {
    const mod = await import('sharp')
    _sharp = mod.default || mod
  }
  return _sharp(buf)
}
