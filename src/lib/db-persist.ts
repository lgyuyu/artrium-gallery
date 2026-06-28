// ============ Vercel/Turso 适配 ============
// Turso 是云数据库，自带持久化和备份
// 这些函数保留为空操作，保持向后兼容（API 路由中有调用）

export function ensurePersistentDB() {
  // no-op: Turso 管理持久化
}

export function backupDB() {
  // no-op: Turso 自动备份
}

export function recoverIfEmpty() {
  // no-op: Turso 管理数据
}
