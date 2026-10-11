import { Router } from 'express'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../db.ts'

// Each category lists its variants joined with their model and brand.
// The SQL is fixed per category, so the URL never reaches the query text.
const PART_QUERIES = {
  rod: `
    SELECT r.id, b.name AS brand, m.name AS model, m.action, m.water,
           r.line_weight AS lineWeight, r.length_in AS lengthIn, r.pieces, r.price
    FROM rods r
    JOIN rod_models m ON m.id = r.rod_model_id
    JOIN brands b ON b.id = m.brand_id
    ORDER BY b.name, m.name, r.line_weight, r.length_in`,
  reel: `
    SELECT r.id, b.name AS brand, m.name AS model, m.water, r.size_label AS sizeLabel,
           r.min_line_weight AS minLineWeight, r.max_line_weight AS maxLineWeight, r.price
    FROM reels r
    JOIN reel_models m ON m.id = r.reel_model_id
    JOIN brands b ON b.id = m.brand_id
    ORDER BY b.name, m.name, r.min_line_weight`,
  line: `
    SELECT l.id, b.name AS brand, m.name AS model, m.type, m.taper,
           m.sink_rate_ips AS sinkRateIps, m.water, l.line_weight AS lineWeight,
           l.head_weight_grains AS headWeightGrains, l.price
    FROM fly_lines l
    JOIN fly_line_models m ON m.id = l.fly_line_model_id
    JOIN brands b ON b.id = m.brand_id
    ORDER BY b.name, m.name, l.line_weight`,
  leader: `
    SELECT l.id, b.name AS brand, m.name AS model, m.material, m.water,
           l.length_ft AS lengthFt, x.label AS xSize, l.strength_lb AS strengthLb,
           l.pack_count AS packCount, l.price
    FROM leaders l
    JOIN leader_models m ON m.id = l.leader_model_id
    JOIN brands b ON b.id = m.brand_id
    JOIN x_sizes x ON x.id = l.x_size_id
    ORDER BY b.name, m.name, l.length_ft, l.x_size_id`,
  tippet: `
    SELECT t.id, b.name AS brand, m.name AS model, m.material, m.water,
           x.label AS xSize, t.strength_lb AS strengthLb, t.spool_yards AS spoolYards, t.price
    FROM tippets t
    JOIN tippet_models m ON m.id = t.tippet_model_id
    JOIN brands b ON b.id = m.brand_id
    JOIN x_sizes x ON x.id = t.x_size_id
    ORDER BY b.name, m.name, t.x_size_id`,
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
