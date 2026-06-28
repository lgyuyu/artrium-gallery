import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync, unlinkSync, writeFileSync, rmSync } from 'fs'
import path from 'path'
import os from 'os'

// ============ 持久化数据保护 ============
// 问题: 项目目录在重新发布时会被重建，db 文件丢失
// 方案: 数据库存到用户级持久目录，程序化设置 DATABASE_URL
//       自动备份+启动恢复+空库检测

// 持久目录: 优先用 HOME 下的 .local/artium-data，fallback 到项目内
function getPersistDir(): string {
  const home = os.homedir()
  const persistDir = path.join(home, '.local', 'artium-data')
  try {
    if (!existsSync(persistDir)) {
      mkdirSync(persistDir, { recursive: true })
    }
    // 测试可写
    const testFile = path.join(persistDir, '.write-test')
    writeFileSync(testFile, 'test')
    rmSync(testFile)
    return persistDir
  } catch {
    // 持久目录不可用，fallback 到项目内
    return path.join(process.cwd(), 'db')
  }
}

const PERSIST_DIR = getPersistDir()
const PERSIST_DB = path.join(PERSIST_DIR, 'custom.db')
const BACKUP_DIR = path.join(PERSIST_DIR, 'backups')

// 旧数据库位置（项目目录内）
const OLD_DB = path.join(process.cwd(), 'db', 'custom.db')

const MAX_BACKUPS = 3

/**
 * 初始化持久数据目录，程序化设置 DATABASE_URL
 */
export function ensurePersistentDB() {
  try {
    // 1. 确保持久目录和备份目录存在
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
      if (stat.size < 10240) {
        console.log('[数据保护] 持久数据库过小(', stat.size, 'bytes)，尝试从备份恢复...')
        restoreFromBackup()
      }
    }

    // 4. 关键：程序化设置 DATABASE_URL，覆盖 .env
    process.env.DATABASE_URL = `file:${PERSIST_DB}`
    console.log('[数据保护] DATABASE_URL:', PERSIST_DB)
  } catch (e) {
    console.error('[数据保护] 初始化失败:', e)
    // 即使保护逻辑失败，也要设置环境变量到项目内（fallback）
    try {
      const fallbackDir = path.join(process.cwd(), 'db')
      if (!existsSync(fallbackDir)) mkdirSync(fallbackDir, { recursive: true })
      process.env.DATABASE_URL = `file:${path.join(fallbackDir, 'custom.db')}`
      console.log('[数据保护] DATABASE_URL (fallback):', process.env.DATABASE_URL)
    } catch (e2) {
      console.error('[数据保护] fallback 也失败:', e2)
    }
  }
}

/**
 * 备份数据库
 */
export function backupDB() {
  try {
    if (!existsSync(PERSIST_DB)) return
    if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `custom-${timestamp}.db`)
    copyFileSync(PERSIST_DB, backupFile)
    console.log('[数据保护] 已备份:', backupFile)

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
      } catch {}
    }
  } catch (e) {
    console.error('[数据保护] 备份失败:', e)
  }
}

/**
 * 检查数据库是否为空（保留兼容，逻辑已在 ensurePersistentDB 中）
 */
export function recoverIfEmpty() {
  // 逻辑已合并到 ensurePersistentDB
}

function restoreFromBackup() {
  try {
    if (!existsSync(BACKUP_DIR)) return
    const backups = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('custom-') && f.endsWith('.db'))
      .map((f) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (backups.length === 0) return
    copyFileSync(backups[0].path, PERSIST_DB)
    console.log('[数据保护] 已从备份恢复:', backups[0].name)
  } catch (e) {
    console.error('[数据保护] 恢复失败:', e)
  }
}
