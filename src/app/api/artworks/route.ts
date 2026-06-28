import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin'
import { backupDB } from '@/lib/db-persist'
import sharp from 'sharp'

// 上传画作（需口令）- multipart/form-data
// 字段: file (图片), studentId, title, artworkDate?, description?
// 图片二进制直接存数据库 Upload 表，彻底避免发布丢失
export async function POST(req: NextRequest) {
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

  if (!file) {
    return NextResponse.json({ error: '缺少图片文件' }, { status: 400 })
  }
  if (!studentId) {
    return NextResponse.json({ error: '缺少学生ID' }, { status: 400 })
  }
  if (!title || !title.trim()) {
    return NextResponse.json({ error: '缺少画作名称' }, { status: 400 })
  }

  // 校验学生存在
  const student = await db.student.findUnique({ where: { id: studentId } })
  if (!student) {
    return NextResponse.json({ error: '学生不存在' }, { status: 404 })
  }

  // 校验文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: '仅支持 JPG/PNG/WEBP/GIF 格式' }, { status: 400 })
  }

  // 校验文件大小 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 })
  }

  // 读取文件二进制，用 sharp 压缩后存数据库（节省存储，2000幅画仍流畅）
  const arrayBuffer = await file.arrayBuffer()
  const originalBuffer = Buffer.from(arrayBuffer)

  // 压缩: 最大宽度1200，JPEG质量80，转JPEG格式（照片类JPEG比PNG小很多）
  // GIF 压缩会丢失动画，保留原样
  let compressedBuffer: Buffer
  let storeMime: string
  if (file.type === 'image/gif') {
    compressedBuffer = originalBuffer
    storeMime = 'image/gif'
  } else {
    compressedBuffer = await sharp(originalBuffer)
      .resize(1000, 1300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72, progressive: true })
      .toBuffer()
    storeMime = 'image/jpeg'
  }

  const upload = await db.upload.create({
    data: {
      data: compressedBuffer,
      mimeType: storeMime,
      size: compressedBuffer.length,
    },
  })

  // imageUrl 指向动态图片 API
  const imageUrl = `/api/image/${upload.id}`

  // 取该学生当前最大 order
  const maxOrder = await db.artwork.aggregate({
    where: { studentId },
    _max: { order: true },
  })

  // 创建画作记录
  const artwork = await db.artwork.create({
    data: {
      title: title.trim(),
      imageUrl,
      artworkDate,
      description,
      studentId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  // 数据变更后备份到持久目录
  backupDB()

  return NextResponse.json(artwork, { status: 201 })
}
