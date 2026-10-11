import express from 'express'
import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { pool } from './db.ts'
import { buildsRouter } from './routes/builds.ts'
import { partsRouter } from './routes/parts.ts'

export const app = express()

app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ api: 'ok', db: 'ok' })
  } catch {
    res.status(503).json({ api: 'ok', db: 'unreachable' })
  }
})

app.use('/api/parts', partsRouter)
app.use('/api/builds', buildsRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Express 5 forwards rejected promises from async handlers here automatically.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', issues: err.issues })
    return
  }
  // A build pointing at a part id that doesn't exist
  if (err?.code === 'ER_NO_REFERENCED_ROW_2') {
    res.status(400).json({ error: 'Referenced part does not exist' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
app.use(errorHandler)
