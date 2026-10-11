import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { z } from 'zod'
import { pool } from '../db.ts'

const partId = z.number().int().positive().nullable().default(null)

const BuildInput = z.object({
  name: z.string().trim().min(1).max(120),
  rodId: partId,
  reelId: partId,
  flyLineId: partId,
  leaderId: partId,
  tippetId: partId,
})

const IdParam = z.coerce.number().int().positive()

const SELECT_BUILD = `
  SELECT id, name, rod_id AS rodId, reel_id AS reelId, fly_line_id AS flyLineId,
         leader_id AS leaderId, tippet_id AS tippetId,
         created_at AS createdAt, updated_at AS updatedAt
  FROM builds`

export const buildsRouter = Router()

buildsRouter.get('/', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BUILD} ORDER BY updated_at DESC`)
  res.json(rows)
})

buildsRouter.get('/:id', async (req, res) => {
  const id = IdParam.parse(req.params.id)
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BUILD} WHERE id = ?`, [id])
  if (rows.length === 0) {
    res.status(404).json({ error: 'Build not found' })
    return
  }
  res.json(rows[0])
})

buildsRouter.post('/', async (req, res) => {
  const b = BuildInput.parse(req.body)
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO builds (name, rod_id, reel_id, fly_line_id, leader_id, tippet_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [b.name, b.rodId, b.reelId, b.flyLineId, b.leaderId, b.tippetId],
  )
  res.status(201).json({ id: result.insertId })
})

buildsRouter.put('/:id', async (req, res) => {
  const id = IdParam.parse(req.params.id)
  const b = BuildInput.parse(req.body)
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE builds
     SET name = ?, rod_id = ?, reel_id = ?, fly_line_id = ?, leader_id = ?, tippet_id = ?
     WHERE id = ?`,
    [b.name, b.rodId, b.reelId, b.flyLineId, b.leaderId, b.tippetId, id],
  )
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Build not found' })
    return
  }
  res.status(204).end()
})

buildsRouter.delete('/:id', async (req, res) => {
  const id = IdParam.parse(req.params.id)
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM builds WHERE id = ?', [id])
  if (result.affectedRows === 0) {
    res.status(404).json({ error: 'Build not found' })
    return
  }
  res.status(204).end()
})
