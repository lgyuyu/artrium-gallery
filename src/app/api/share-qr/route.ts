import { NextRequest, NextResponse } from 'next/server'

const QR_SERVICE_URL = 'https://api.qrserver.com/v1/create-qr-code/'

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get('text')?.trim()

  if (!text || text.length > 2048) {
    return NextResponse.json({ error: '二维码内容无效' }, { status: 400 })
  }

  try {
    const url = new URL(QR_SERVICE_URL)
    url.searchParams.set('size', '320x320')
    url.searchParams.set('margin', '8')
    url.searchParams.set('data', text)

    const response = await fetch(url, { next: { revalidate: 86400 } })
    if (!response.ok) throw new Error(`QR service returned ${response.status}`)

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (error) {
    console.error('[share-qr] 二维码生成失败', error)
    return NextResponse.json({ error: '二维码生成失败' }, { status: 502 })
  }
}
