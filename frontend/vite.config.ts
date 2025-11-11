import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { promisify } from 'node:util'
import type { IncomingMessage, ServerResponse } from 'node:http'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const mkdir = promisify(fs.mkdir)
const access = promisify(fs.access)
const unlink = promisify(fs.unlink)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 프로젝트 루트의 saves 폴더 경로
const getSavesDirectory = () => {
  return path.join(__dirname, '..', 'saves')
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

// 파일 저장 API 플러그인
const saveApiPlugin = (): Plugin => {
  return {
    name: 'save-api',
    configureServer(server) {
      server.middlewares.use('/api/save-game-state', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          const body = await new Promise<any>((resolve, reject) => {
            let data = ''
            req.on('data', (chunk: Buffer) => { data += chunk.toString() })
            req.on('end', () => {
              try {
                resolve(JSON.parse(data))
              } catch (e) {
                reject(e)
              }
            })
            req.on('error', reject)
          })

          const { slot, gameState } = body
          const savesDir = await ensureSavesDirectory()
          const filePath = path.join(savesDir, `slot-${slot}.json`)
          await writeFile(filePath, JSON.stringify(gameState, null, 2), 'utf-8')
          
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({ success: true, path: filePath }))
        } catch (error: any) {
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 500
          res.end(JSON.stringify({ success: false, error: error.message }))
        }
      })

      server.middlewares.use('/api/load-game-state', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          const url = new URL(req.url!, `http://${req.headers.host}`)
          const slot = parseInt(url.searchParams.get('slot') || '1')
          
          const savesDir = getSavesDirectory()
          const filePath = path.join(savesDir, `slot-${slot}.json`)
          const data = await readFile(filePath, 'utf-8')
          
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({ success: true, data: JSON.parse(data) }))
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 404
            res.end(JSON.stringify({ success: false, error: 'File not found' }))
          } else {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: error.message }))
          }
        }
      })

      server.middlewares.use('/api/delete-game-slot', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'DELETE') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          const url = new URL(req.url!, `http://${req.headers.host}`)
          const slot = parseInt(url.searchParams.get('slot') || '1')
          
          const savesDir = getSavesDirectory()
          const filePath = path.join(savesDir, `slot-${slot}.json`)
          await unlink(filePath)
          
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({ success: true }))
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 404
            res.end(JSON.stringify({ success: false, error: 'File not found' }))
          } else {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: error.message }))
          }
        }
      })

      server.middlewares.use('/api/get-save-slot-info', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          const url = new URL(req.url!, `http://${req.headers.host}`)
          const slot = parseInt(url.searchParams.get('slot') || '1')
          
          const savesDir = getSavesDirectory()
          const filePath = path.join(savesDir, `slot-${slot}.json`)
          const data = await readFile(filePath, 'utf-8')
          const gameState = JSON.parse(data)
          
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({
            success: true,
            info: {
              exists: true,
              timestamp: gameState.timestamp,
              playerName: gameState.player?.name || 'Unknown',
              playerLevel: gameState.player?.level || 0,
            }
          }))
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ success: true, info: null }))
          } else {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: error.message }))
          }
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), saveApiPlugin()],
  // Ensure assets resolve correctly when loaded via file:// in Electron
  base: './',
})
