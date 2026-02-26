import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core'

// CRM Type Enum
export const crmTypeEnum = pgEnum('crm_type', ['vetor', 'mada', 'none'])

// Organizations Table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  company_id: varchar('company_id', { length: 255 }),
  crm_type: crmTypeEnum('crm_type').default('none').notNull(),
  crm_config: jsonb('crm_config').$type<{
    vetor_api_key?: string
    vetor_company_id?: string
    mada_supabase_url?: string
    mada_supabase_key?: string
    [key: string]: any // Allow for future CRM configs
  }>(),
  // Legacy fields - kept for backwards compatibility, will be migrated
  vetor_api_key: varchar('vetor_api_key', { length: 255 }),
  mada_supabase_url: text('mada_supabase_url'),
  mada_supabase_key: text('mada_supabase_key'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }),
  organization_id: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  role: varchar('role', { length: 50 }).default('gestor').notNull(),
  auth_provider: varchar('auth_provider', { length: 50 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// Brokers Table
export const brokers = pgTable('brokers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  name: varchar('name', { length: 255 }), // Legacy field - will be phased out
  first_name: varchar('first_name', { length: 255 }).notNull().default(''),
  last_name: varchar('last_name', { length: 255 }).notNull().default(''),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  crm_external_id: varchar('crm_external_id', { length: 255 }),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// Deals Table
export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  external_id: varchar('external_id', { length: 255 }),
  broker_id: uuid('broker_id').references(() => brokers.id),
  client_name: varchar('client_name', { length: 255 }).notNull(),
  client_phone: varchar('client_phone', { length: 50 }),
  client_email: varchar('client_email', { length: 255 }),
  property_title: text('property_title'),
  property_id: varchar('property_id', { length: 255 }),
  status: varchar('status', { length: 50 }).default('New').notNull(),
  sentiment: varchar('sentiment', { length: 50 }).default('Neutral').notNull(),
  smart_summary: text('smart_summary'),
  last_activity: timestamp('last_activity'),
  potential_value: decimal('potential_value', { precision: 12, scale: 2 }),
  // New Vetor fields
  stage: varchar('stage', { length: 100 }),
  stage_entered_at: timestamp('stage_entered_at'),
  potential_commission: decimal('potential_commission', { precision: 12, scale: 2 }),
  exclusividade: jsonb('exclusividade').$type<{
    tem: boolean
    data_inicio?: string
    data_fim?: string
  } | null>(),
  origem: varchar('origem', { length: 100 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

// Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id')
    .references(() => deals.id)
    .notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

// Sync Logs Table
export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  records_processed: integer('records_processed').default(0).notNull(),
  error_message: text('error_message'),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
})

// Type exports for TypeScript
export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Broker = typeof brokers.$inferSelect
export type NewBroker = typeof brokers.$inferInsert

export type Deal = typeof deals.$inferSelect
export type NewDeal = typeof deals.$inferInsert

export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert

export type SyncLog = typeof syncLogs.$inferSelect
export type NewSyncLog = typeof syncLogs.$inferInsert
