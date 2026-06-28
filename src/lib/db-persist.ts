import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync, unlinkSync } from 'fs'
import path from 'path'

// ============ 持久化数据保护 ============
// 问题: 项目目录 /home/z/my-project 在重新发布时会被重建，
//       .env 可能被重置，db/custom.db 丢失，上传画作消失。
// 方案: 程序化强制 DATABASE_URL 指向持久目录，
//       自动备份+启动恢复+空库检测。

const PERSIST_DIR = '/home/z/.local/artium-data'
const PERSIST_DB = path.join(PERSIST_DIR, 'custom.db')
const BACKUP_DIR = path.join(PERSIST_DIR, 'backups')

// 旧数据库位置（项目目录内，发布会丢）
const OLD_DB = path.join(process.cwd(), 'db', 'custom.db')

// 备份保留数量
const MAX_BACKUPS = 3

/**
 * 初始化持久数据目录
 * - 程序化设置 DATABASE_URL（覆盖 .env，确保 Prisma 用持久库）
 * - 创建持久目录
 * - 如果持久位置没数据库但旧位置有，自动迁移
 * - 如果持久库为空但备份有数据，自动恢复
 */
export function ensurePersistentDB() {
  try {
    // 1. 确保持久目录存在
    if (!existsSync(PERSIST_DIR)) {
      mkdirSync(PERSIST_DIR, { recursive: true })
    }
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true })
    }

    // 2. 如果持久位置没有数据库，但旧位置有，自动迁移
    if (!existsSync(PERSIST_DB) && existsSync(OLD_DB)) {
      console.log('[数据保护] 检测到旧数据库，迁移到持久位置...')
      copyFileSync(OLD_DB, PERSIST_DB)
      console.log('[数据保护] 迁移完成:', PERSIST_DB)
    }

    // 3. 如果持久库不存在或为空，尝试从备份恢复
    if (!existsSync(PERSIST_DB)) {
      console.log('[数据保护] 持久数据库不存在，尝试从备份恢复...')
      restoreFromBackup()
    } else {
      const stat = statSync(PERSIST_DB)
      // 数据库文件小于 10KB 视为空（正常有数据的库至少几十KB）
      if (stat.size < 10240) {
        console.log('[数据保护] 持久数据库过小(', stat.size, 'bytes)，可能为空，尝试从备份恢复...')
        restoreFromBackup()
      }
    }

    // 4. 关键：程序化设置 DATABASE_URL，覆盖 .env（防止 .env 被发布重置）
    // 必须在 PrismaClient 初始化前执行
    process.env.DATABASE_URL = `file:${PERSIST_DB}`
    console.log('[数据保护] DATABASE_URL 已设置为持久位置:', PERSIST_DB)
  } catch (e) {
    console.error('[数据保护] 初始化失败:', e)
    // 即使保护逻辑失败，也要尝试设置环境变量
    process.env.DATABASE_URL = `file:${PERSIST_DB}`
  }
}

/**
 * 备份数据库
 * 在数据变更后调用，保留最近 MAX_BACKUPS 个备份
 */
export function backupDB() {
  try {
    if (!existsSync(PERSIST_DB)) return
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `custom-${timestamp}.db`)
    copyFileSync(PERSIST_DB, backupFile)
    console.log('[数据保护] 已备份:', backupFile)

    // 清理旧备份，只保留最近 MAX_BACKUPS 个
    const backups = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('custom-') && f.endsWith('.db'))
      .map((f) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    for (let i = MAX_BACKUPS; i < backups.length; i++) {
      try {
        unlinkSync(backups[i].path)
        console.log('[数据保护] 清理旧备份:', backups[i].name)
      } catch {}
    }
  } catch (e) {
    console.error('[数据保护] 备份失败:', e)
  }
}

/**
 * 检查数据库是否为空，如果是则从备份恢复
 * （保留此函数供外部调用，实际逻辑已在 ensurePersistentDB 中处理）
 */
export function recoverIfEmpty() {
  // 逻辑已合并到 ensurePersistentDB，此处保留空实现兼容 db.ts 调用
}

/**
 * 从最新的备份恢复数据库
 */
function restoreFromBackup() {
  try {
    if (!existsSync(BACKUP_DIR)) {
      console.log('[数据保护] 无备份目录')
      return
    }
    const backups = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('custom-') && f.endsWith('.db'))
      .map((f) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (backups.length === 0) {
      console.log('[数据保护] 无可用备份，将创建空数据库')
      return
    }

    const latest = backups[0]
    copyFileSync(latest.path, PERSIST_DB)
    console.log('[数据保护] 已从备份恢复:', latest.name)
  } catch (e) {
    console.error('[数据保护] 恢复失败:', e)
  }
}
