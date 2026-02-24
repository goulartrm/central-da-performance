import { db } from '../src/db/index.js'
import { sql } from 'drizzle-orm'

async function runMigration() {
  try {
    console.log('Running migration to add company_id column...')

    // Check if column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name = 'company_id'
    `)

    if (checkResult.rows.length > 0) {
      console.log('Column company_id already exists in organizations table')
    } else {
      // Add the column
      await db.execute(sql`
        ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS company_id varchar(255)
      `)
      console.log('Successfully added company_id column to organizations table')
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
