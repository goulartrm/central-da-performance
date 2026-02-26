// Enums
export enum DealStatus {
  NEW = 'New',
  IN_SERVICE = 'InService',
  PROPOSAL = 'Proposal',
  SOLD = 'Sold',
  LOST = 'Lost',
}

export enum Sentiment {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative',
  URGENT = 'Urgent',
}

export enum ActivityType {
  CONVERSATION_SUMMARY = 'ConversationSummary',
  STATUS_CHANGE = 'StatusChange',
  ALERT = 'Alert',
  SYNC = 'Sync',
}

export enum SyncSource {
  MADA = 'mada',
  VETOR_IMOBI = 'vetor_imobi',
}

export enum SyncStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PARTIAL = 'partial',
}

export enum UserRole {
  ADMIN = 'admin',
  GESTOR = 'gestor',
  CORRETOR = 'corretor',
}

export enum AuthProvider {
  NEON = 'neon',
  GOOGLE = 'google',
}

// Organization
export interface Organization {
  id: string
  name: string
  company_id: string | null
  vetor_api_key: string | null
  mada_supabase_url: string | null
  mada_supabase_key: string | null
  created_at: Date
  updated_at: Date
}

// User
export interface User {
  id: string
  email: string
  organization_id: string
  role: UserRole
  auth_provider: AuthProvider
  created_at: Date
}

// Broker
export interface Broker {
  id: string
  organization_id: string
  name: string | null // Legacy field - will be phased out
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  crm_external_id: string | null
  is_active: boolean
  created_at: Date
}

// Deal
export interface Deal {
  id: string
  organization_id: string
  broker_id: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  property_title: string | null
  property_id: string | null
  status: DealStatus
  sentiment: Sentiment
  smart_summary: string | null
  last_activity: Date | null
  potential_value: number | null
  // New Vetor fields
  stage?: string | null
  stage_entered_at?: Date | null
  potential_commission?: number | null
  exclusividade?: {
    tem: boolean
    data_inicio?: string
    data_fim?: string
  } | null
  origem?: string | null
  created_at: Date
  updated_at: Date
}

// Activity Log
export interface ActivityLog {
  id: string
  deal_id: string
  type: ActivityType
  description: string
  metadata: Record<string, unknown> | null
  created_at: Date
}

// Sync Log
export interface SyncLog {
  id: string
  organization_id: string
  source: SyncSource
  status: SyncStatus
  records_processed: number
  error_message: string | null
  started_at: Date
  completed_at: Date | null
}

// Vetor Imobi API Types
export interface VetorClient {
  id: string
  first_name: string
  last_name: string
  phone_primary: string
  email: string | null
  capture_source: string
  status: string
  created_at: string
}

export interface VetorDeal {
  id: string
  title: string
  agent_email: string
  pipeline_type: string
  stage: string
  stage_entered_at?: string
  potential_value: number
  potential_commission?: number
  client_id: string
  company_id?: string
  exclusividade?: {
    tem: boolean
    data_inicio?: string
    data_fim?: string
  }
  origem?: string
  source?: string
  last_activity_at?: string
  created_at: string
}

export interface VetorNote {
  id: string
  company_id: string
  title: string
  content: string
  note_type: 'geral' | 'reuniao' | 'ligacao' | 'visita' | 'negociacao' | 'follow_up'
  priority: 'baixa' | 'media' | 'alta' | 'urgente'
  property_id?: string
  client_id?: string
  deal_id?: string
  agent_email: string
  assigned_by?: string
  due_date?: string
  is_completed: boolean
  visit_form_id?: string
  visit_form_status?: 'pending' | 'draft' | 'signed' | 'sent'
  is_archived: boolean
  archived_at?: string
  archived_by?: string
  created_date?: string
  updated_date?: string
}

export interface VetorProperty {
  id: string
  title: string
  category: string
  transaction_type: string
  city: string
  state: string
  price_sale: number | null
  price_rent: number | null
  status: string
  created_at: string
}

// Mada Supabase Types
export interface MadaConversation {
  id: string
  broker_phone: string
  lead_phone: string
  summary: string
  sentiment: Sentiment
  transcription: string | null
  created_at: string
  updated_at: string
}

// API Request/Response Types
export interface DashboardStats {
  riskDeals: number
  activeConversations: number
  avgResponseTime: number // in minutes
  newSummaries: number
}

export interface DealsListParams {
  page?: number
  limit?: number
  status?: DealStatus
  sentiment?: Sentiment
  broker_id?: string
  search?: string
}

export interface DealsListResponse {
  deals: Deal[]
  total: number
  page: number
  limit: number
}

export interface SyncResponse {
  status: SyncStatus
  recordsProcessed: number
  error?: string
}

export interface SyncParams {
  source: SyncSource
  minutes?: number
}

// JWT Payload
export interface JWTPayload {
  userId: string
  organizationId: string
  role: UserRole
  iat?: number
  exp?: number
}
