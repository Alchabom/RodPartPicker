// Applies server/db/migrations/*.sql in filename order, once each.
// Applied files are recorded in the schema_migrations table.
//
// MySQL commits DDL (CREATE/ALTER) implicitly, so a migration that fails halfway
// cannot be rolled back automatically: fix the file, drop what it created, rerun.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { escapeId } from 'mysql2'
import type { RowDataPacket } from 'mysql2'
import { env } from '../src/env.ts'

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations')

const conn = await mysql.createConnection({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  multipleStatements: true, // migration files hold many statements
})

try {
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS ${escapeId(env.DB_NAME)}
     CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  )
  await conn.changeUser({ database: env.DB_NAME })
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    VARCHAR(255) PRIMARY KEY,
      applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`)

  const [rows] = await conn.query<RowDataPacket[]>('SELECT filename FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.filename as string))

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()
  let count = 0
  for (const file of files) {
    if (applied.has(file)) continue
    console.log(`Applying ${file}`)
    await conn.query(await readFile(path.join(migrationsDir, file), 'utf8'))
    await conn.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [file])
    count++
  }
  console.log(count === 0 ? 'Database is up to date.' : `Applied ${count} migration(s).`)
} finally {
  await conn.end()
}
