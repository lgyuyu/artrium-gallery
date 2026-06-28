import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 动态返回数据库中的图片
// data 字段存储的是 base64 字符串，需要解码回二进制
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const upload = await db.upload.findUnique({ where: { id } })
  if (!upload) {
    return NextResponse.json({ error: '图片不存在' }, { status: 404 })
  }

  // data 可能是 base64 字符串或 Buffer
  let buffer: Buffer
  if (typeof upload.data === 'string') {
    buffer = Buffer.from(upload.data, 'base64')
  } else if (upload.data instanceof Uint8Array) {
    buffer = Buffer.from(upload.data)
  } else {
    buffer = Buffer.from(upload.data)
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': upload.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
