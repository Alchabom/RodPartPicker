import { z } from 'zod'

// Values come from .env (loaded by node --env-file-if-exists); see .env.example
const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(3001),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('rodpartpicker'),
})

export const env = EnvSchema.parse(process.env)
