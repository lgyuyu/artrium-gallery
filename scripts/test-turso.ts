import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

async function main() {
  // 先测一条简单 SQL
  console.log('测试1: SELECT 1')
  try {
    const r = await client.execute('SELECT 1 as test')
    console.log('✅ 连接正常:', r.rows)
  } catch (e: any) {
    console.error('❌', e.message, e.cause?.status)
    return
  }

  console.log('\n测试2: CREATE TABLE')
  try {
    await client.execute('CREATE TABLE IF NOT EXISTS test_t (id INTEGER PRIMARY KEY)')
    console.log('✅ 建表成功')
  } catch (e: any) {
    console.error('❌', e.message)
    console.error('cause:', JSON.stringify(e.cause, null, 2))
  }

  console.log('\n测试3: batch 模式')
  try {
    await client.batch(['CREATE TABLE IF NOT EXISTS test_b (id INTEGER PRIMARY KEY)'], 'write')
    console.log('✅ batch 建表成功')
  } catch (e: any) {
    console.error('❌', e.message)
  }

  console.log('\n所有表:')
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
  console.log(tables.rows)
}

main().catch(console.error)
