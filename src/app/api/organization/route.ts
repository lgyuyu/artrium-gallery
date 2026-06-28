import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function GET() {
  try {
    const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || ''
    const token = process.env.DATABASE_AUTH_TOKEN || ''

    const client = createClient({
      url: url.startsWith('libsql') ? url : 'libsql://artrium-lgyuyu.aws-ap-northeast-1.turso.io',
      authToken: token,
    })

    const result = await client.execute('SELECT id, name, slogan, logo, "defaultStyle" as defaultStyle FROM Organization LIMIT 1')

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '机构未初始化' }, { status: 404 })
    }

    const org = result.rows[0]
    return NextResponse.json({
      id: org.id,
      name: org.name,
      slogan: org.slogan,
      logo: org.logo,
      defaultStyle: org.defaultStyle,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.substring(0, 500) }, { status: 500 })
  }
}
