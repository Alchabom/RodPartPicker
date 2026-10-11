import { Router } from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db.ts'

// Each category lists its parts joined with their brand.
// The SQL is fixed per category, so the URL never reaches the query text.
const PART_QUERIES = {
  rod: `
    SELECT r.id, b.name AS brand, r.name AS model, r.action, r.water,
           r.line_weight AS lineWeight, r.length_in AS lengthIn, r.pieces, r.price
    FROM rods r
    JOIN brands b ON b.id = r.brand_id
    ORDER BY b.name, r.name, r.line_weight, r.length_in`,
  reel: `
    SELECT r.id, b.name AS brand, r.name AS model, r.water,
           r.min_line_weight AS minLineWeight, r.max_line_weight AS maxLineWeight, r.price
    FROM reels r
    JOIN brands b ON b.id = r.brand_id
    ORDER BY b.name, r.name, r.min_line_weight`,
  line: `
    SELECT l.id, b.name AS brand, l.name AS model, l.type, l.sink_rate_ips AS sinkRateIps,
           l.water, l.line_weight AS lineWeight,
           l.head_weight_grains AS headWeightGrains, l.price
    FROM fly_lines l
    JOIN brands b ON b.id = l.brand_id
    ORDER BY b.name, l.name, l.line_weight`,
  leader: `
    SELECT l.id, b.name AS brand, l.name AS model, l.material, l.water,
           l.length_ft AS lengthFt, x.label AS xSize,
           l.pack_count AS packCount, l.price
    FROM leaders l
    JOIN brands b ON b.id = l.brand_id
    JOIN x_sizes x ON x.id = l.x_size_id
    ORDER BY b.name, l.name, l.length_ft, l.x_size_id`,
  tippet: `
    SELECT t.id, b.name AS brand, t.name AS model, t.material, t.water,
           x.label AS xSize, t.spool_yards AS spoolYards, t.price
    FROM tippets t
    JOIN brands b ON b.id = t.brand_id
    JOIN x_sizes x ON x.id = t.x_size_id
    ORDER BY b.name, t.name, t.x_size_id`,
} as const

type Category = keyof typeof PART_QUERIES

function isCategory(value: string): value is Category {
  return Object.hasOwn(PART_QUERIES, value)
}

export const partsRouter = Router()

// GET /api/parts/:category  (rod | reel | line | leader | tippet)
partsRouter.get('/:category', async (req, res) => {
  const { category } = req.params
  if (!isCategory(category)) {
    res.status(404).json({ error: `Unknown part category "${category}"` })
    return
  }
  const [rows] = await pool.query<RowDataPacket[]>(PART_QUERIES[category])
  res.json(rows)
})
