import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { promisify } from 'node:util'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const mkdir = promisify(fs.mkdir)
const access = promisify(fs.access)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = !!process.env.VITE_DEV_SERVER_URL

// 저장 파일 디렉토리 경로
const getSavesDirectory = () => {
  if (isDev) {
    // 개발 모드: 프로젝트 루트의 saves 폴더
    return path.join(__dirname, '..', '..', 'saves')
  } else {
    // 프로덕션 모드: 앱 데이터 폴더
    return path.join(app.getPath('userData'), 'saves')
  }
}

// 저장 디렉토리 생성
const ensureSavesDirectory = async () => {
  const savesDir = getSavesDirectory()
  try {
    await access(savesDir)
  } catch {
    await mkdir(savesDir, { recursive: true })
  }
  return savesDir
}

// IPC 핸들러 등록
ipcMain.handle('save-game-state', async (event, slot, gameState) => {
  try {
    const savesDir = await ensureSavesDirectory()
    const filePath = path.join(savesDir, `slot-${slot}.json`)
    await writeFile(filePath, JSON.stringify(gameState, null, 2), 'utf-8')
    return { success: true, path: filePath }
  } catch (error) {
    console.error('Save error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('load-game-state', async (event, slot) => {
  try {
    const savesDir = getSavesDirectory()
    const filePath = path.join(savesDir, `slot-${slot}.json`)
    const data = await readFile(filePath, 'utf-8')
    return { success: true, data: JSON.parse(data) }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: 'File not found' }
    }
    console.error('Load error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-game-slot', async (event, slot) => {
  try {
    const savesDir = getSavesDirectory()
    const filePath = path.join(savesDir, `slot-${slot}.json`)
    await fs.promises.unlink(filePath)
    return { success: true }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: 'File not found' }
    }
    console.error('Delete error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-save-slot-info', async (event, slot) => {
  try {
    const savesDir = getSavesDirectory()
    const filePath = path.join(savesDir, `slot-${slot}.json`)
    const data = await readFile(filePath, 'utf-8')
    const gameState = JSON.parse(data)
    return {
      success: true,
      info: {
        exists: true,
        timestamp: gameState.timestamp,
        playerName: gameState.player?.name || 'Unknown',
        playerLevel: gameState.player?.level || 0,
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, info: null }
    }
    console.error('Get info error:', error)
    return { success: false, error: error.message }
  }
})

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
    mainWindow.loadFile(indexHtml)
  }

  return mainWindow
}

app.whenReady().then(() => {
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
