import { app } from './app.ts'
import { env } from './env.ts'

app.listen(env.API_PORT, () => {
  console.log(`API listening on http://localhost:${env.API_PORT}`)
})
