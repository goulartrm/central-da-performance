/**
 * Vetor Core API Client
 *
 * This module provides a type-safe API client for communicating with the Vetor Core backend.
 * All API calls go through this client, which handles authentication, error handling, and toast notifications.
 */

// API Configuration
// In development, use localhost:3001 for the backend
// In production, use the backend Railway URL from environment variable
// If not set, assume backend is on same domain (relative URLs)
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    const envUrl = process.env.NEXT_PUBLIC_API_URL
    if (envUrl) {
      // Ensure URL has protocol
      return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`
    }
    // No backend URL configured, use relative path (same domain)
    return ''
  }
  // Development
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

const API_BASE_URL = getApiBaseUrl()

// Types matching the backend responses
export interface DashboardStats {
  riskDeals: number
  activeConversations: number
  avgResponseTime: number
  newSummaries: number
}

export interface Deal {
  id: string
  organization_id: string
  broker_id: string | null
  broker_name: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  property_title: string | null
  property_id: string | null
  status: string
  sentiment: string
  smart_summary: string | null
  last_activity: Date | null
  potential_value: string | null
  created_at: Date
  updated_at: Date
}

export interface DealDetails extends Deal {
  broker_phone: string | null
  activity_logs: ActivityLog[]
}

export interface ActivityLog {
  id: string
  deal_id: string
  type: string
  description: string
  metadata: Record<string, unknown> | null
  created_at: Date
}

export interface Broker {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  crm_external_id: string | null
  is_active: boolean
  created_at: Date
}

export interface SyncLog {
  id: string
  organization_id: string
  source: string
  status: string
  records_processed: number
  error_message: string | null
  started_at: Date
  completed_at: Date | null
}

export interface DealsListResponse {
  deals: Deal[]
  total: number
  page: number
  limit: number
}

export interface BrokersListResponse {
  brokers: Broker[]
}

export interface SyncLogsResponse {
  logs: SyncLog[]
}

export interface SyncResponse {
  status: string
  recordsProcessed: number
  message: string
  syncLogId: string
}

// Query parameters for filtering
export interface DealsQuery {
  page?: number
  limit?: number
  status?: string
  sentiment?: string
  broker_id?: string
  search?: string
}

export interface BrokersQuery {
  active?: boolean
  search?: string
}

// API Error type
export interface ApiError {
  error: string
  message: string
}

// Auth types
export interface User {
  id: string
  email: string
  role: string
  created_at: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterResponse {
  message: string
  user: User
}

export interface MeResponse {
  user: User
}

/**
 * API Client class
 */
class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
    // Load token from localStorage on init
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('vetor_core_token')
      if (storedToken) {
        this.token = storedToken
      }
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token
  }

  /**
   * Make a fetch request with common headers and error handling
   */
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Merge existing headers if provided
    if (options?.headers) {
      const existingHeaders = options.headers as Record<string, string>
      Object.assign(headers, existingHeaders)
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include cookies for Neon Auth session
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error', message: response.statusText })) as ApiError
        throw new ApiErrorWrapper(errorData.error || 'API Error', errorData.message || response.statusText, response.status)
      }

      return await response.json() as T
    } catch (error) {
      if (error instanceof ApiErrorWrapper) {
        throw error
      }
      throw new ApiErrorWrapper('Network Error', 'Failed to connect to the server. Please check your connection.', 0)
    }
  }

  /**
   * GET /api/dashboard/stats
   * Fetch dashboard KPI statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return this.fetch<DashboardStats>('/api/dashboard/stats')
  }

  /**
   * GET /api/deals
   * Fetch deals with optional filtering and pagination
   */
  async getDeals(query?: DealsQuery): Promise<DealsListResponse> {
    const params = new URLSearchParams()

    if (query?.page) params.append('page', String(query.page))
    if (query?.limit) params.append('limit', String(query.limit))
    if (query?.status) params.append('status', query.status)
    if (query?.sentiment) params.append('sentiment', query.sentiment)
    if (query?.broker_id) params.append('broker_id', query.broker_id)
    if (query?.search) params.append('search', query.search)

    const queryString = params.toString()
    return this.fetch<DealsListResponse>(`/api/deals${queryString ? `?${queryString}` : ''}`)
  }

  /**
   * GET /api/deals/:id
   * Fetch a single deal with details
   */
  async getDealById(id: string): Promise<DealDetails> {
    return this.fetch<DealDetails>(`/api/deals/${id}`)
  }

  /**
   * PUT /api/deals/:id
   * Update a deal
   */
  async updateDeal(
    id: string,
    data: {
      status?: string
      sentiment?: string
      smart_summary?: string
      notes?: string
      potential_value?: string
      broker_id?: string
    }
  ): Promise<{ message: string; deal: Deal }> {
    return this.fetch<{ message: string; deal: Deal }>(`/api/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * GET /api/brokers
   * Fetch brokers with optional filtering
   */
  async getBrokers(query?: BrokersQuery): Promise<BrokersListResponse> {
    const params = new URLSearchParams()

    if (query?.active !== undefined) params.append('active', String(query.active))
    if (query?.search) params.append('search', query.search)

    const queryString = params.toString()
    return this.fetch<BrokersListResponse>(`/api/brokers${queryString ? `?${queryString}` : ''}`)
  }

  /**
   * GET /api/brokers/:id
   * Fetch a single broker with details
   */
  async getBrokerById(id: string): Promise<Broker> {
    return this.fetch<Broker>(`/api/brokers/${id}`)
  }

  /**
   * PUT /api/brokers/:id
   * Update a broker
   */
  async updateBroker(
    id: string,
    data: {
      name?: string
      email?: string
      phone?: string
      is_active?: boolean
    }
  ): Promise<{ message: string; broker: Broker }> {
    return this.fetch<{ message: string; broker: Broker }>(`/api/brokers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * POST /api/brokers
   * Create a new broker
   */
  async createBroker(data: {
    name: string
    email?: string
    phone?: string
  }): Promise<{ message: string; broker: Broker }> {
    return this.fetch<{ message: string; broker: Broker }>('/api/brokers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * POST /api/sync
   * Trigger a manual sync
   */
  async triggerSync(source: 'vetor_imobi' | 'mada' | 'all', minutes?: number): Promise<SyncResponse> {
    const payload = minutes !== undefined ? { source, minutes } : { source }
    return this.fetch<SyncResponse>('/api/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  /**
   * GET /api/sync/logs
   * Fetch sync logs
   */
  async getSyncLogs(): Promise<SyncLogsResponse> {
    return this.fetch<SyncLogsResponse>('/api/sync/logs')
  }

  /**
   * GET /health
   * Check API health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.fetch<{ status: string; timestamp: string }>('/health')
  }

  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(email: string, password: string): Promise<RegisterResponse> {
    return this.fetch<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  /**
   * POST /api/auth/register-superadmin
   * Register as superadmin (only @vetorimobi.com.br)
   */
  async registerSuperAdmin(email: string, password: string): Promise<LoginResponse> {
    return this.fetch<LoginResponse>('/api/auth/register-superadmin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  /**
   * POST /api/auth/login
   * Login and receive JWT token
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.fetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  /**
   * GET /api/auth/me
   * Get current user
   */
  async getCurrentUser(): Promise<MeResponse> {
    return this.fetch<MeResponse>('/api/auth/me')
  }

  // ==================== Super Admin API ====================

  /**
   * GET /api/superadmin/stats
   * Get superadmin overview stats
   */
  async getSuperAdminStats(): Promise<{ organizations: number; users: number; superadmins: number }> {
    return this.fetch('/api/superadmin/stats')
  }

  /**
   * GET /api/superadmin/organizations
   * List all organizations
   */
  async getOrganizations(): Promise<{ organizations: Array<{ id: string; name: string; created_at: string; user_count: number; company_id?: string; crm_type?: string }> }> {
    return this.fetch('/api/superadmin/organizations')
  }

  /**
   * POST /api/superadmin/organizations
   * Create a new organization
   */
  async createOrganization(name: string): Promise<{ message: string; organization: { id: string; name: string } }> {
    return this.fetch('/api/superadmin/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  /**
   * DELETE /api/superadmin/organizations/:id
   * Delete an organization
   */
  async deleteOrganization(id: string): Promise<{ message: string }> {
    return this.fetch(`/api/superadmin/organizations/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * PUT /api/superadmin/organizations/:id
   * Update organization name
   */
  async updateOrganization(
    id: string,
    data: { name: string }
  ): Promise<{ message: string; organization: { id: string; name: string } }> {
    return this.fetch(`/api/superadmin/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT /api/superadmin/organizations/:id/crm-config
   * Update organization CRM configuration
   */
  async updateOrganizationCRM(
    id: string,
    data: {
      crm_type: 'vetor' | 'mada' | 'none'
      crm_config?: {
        vetor_api_key?: string
        vetor_company_id?: string
        mada_supabase_url?: string
        mada_supabase_key?: string
        [key: string]: any
      }
    }
  ): Promise<{ message: string; organization: { id: string; name: string; crm_type: string; crm_config: any } }> {
    return this.fetch(`/api/superadmin/organizations/${id}/crm-config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * GET /api/superadmin/organizations/:id
   * Get organization details with users
   */
  async getOrganizationDetails(id: string): Promise<{
    organization: { id: string; name: string; created_at: string; company_id?: string; crm_type?: string; crm_config?: any }
    users: Array<{ id: string; email: string; role: string; created_at: string }>
  }> {
    return this.fetch(`/api/superadmin/organizations/${id}`)
  }

  /**
   * GET /api/superadmin/users
   * List all users
   */
  async getAllUsers(query?: { role?: string; search?: string }): Promise<{
    users: Array<{
      id: string
      email: string
      role: string
      organization_id: string
      organization_name: string | null
      created_at: string
    }>
  }> {
    const params = new URLSearchParams()
    if (query?.role) params.append('role', query.role)
    if (query?.search) params.append('search', query.search)
    const queryString = params.toString()
    return this.fetch(`/api/superadmin/users${queryString ? `?${queryString}` : ''}`)
  }

  /**
   * POST /api/superadmin/invite
   * Invite a user to an organization
   */
  async inviteUser(data: {
    email: string
    password: string
    organization_id: string
    role?: string
  }): Promise<{ message: string; user: { id: string; email: string; role: string } }> {
    return this.fetch('/api/superadmin/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT /api/superadmin/users/:id/role
   * Update a user's role
   */
  async updateUserRole(id: string, role: string): Promise<{ message: string; user: { id: string; email: string; role: string } }> {
    return this.fetch(`/api/superadmin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
  }

  /**
   * PUT /api/superadmin/promote-superadmin
   * Promote user to superadmin (requires @vetorimobi.com.br email)
   */
  async promoteToSuperAdmin(email: string): Promise<{ message: string; user: { id: string; email: string; role: string } }> {
    return this.fetch('/api/superadmin/promote-superadmin', {
      method: 'PUT',
      body: JSON.stringify({ email }),
    })
  }

  /**
   * DELETE /api/superadmin/users/:id
   * Delete a user
   */
  async deleteUser(id: string): Promise<{ message: string }> {
    return this.fetch(`/api/superadmin/users/${id}`, {
      method: 'DELETE',
    })
  }
}

/**
 * Custom API Error class
 */
class ApiErrorWrapper extends Error {
  constructor(
    public error: string,
    public message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiErrorWrapper'
  }
}

// Create and export singleton instance
export const api = new ApiClient()

// Export types
export type { ApiErrorWrapper }
