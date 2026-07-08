import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'

const sqlClient = neon(process.env.DATABASE_URL!)
export const db = drizzle(sqlClient)

export { sql }
