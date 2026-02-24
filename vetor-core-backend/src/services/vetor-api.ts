import type {
  VetorClient,
  VetorDeal,
  VetorProperty,
  CrmAdapter,
} from '../types/index.js'

/**
 * Vetor Imobi API Adapter (Base44)
 *
 * Integrates with the Base44 API to fetch and sync data from Vetor Imobi CRM.
 *
 * Base URL: https://app.base44.com/api/apps/687412c6a963138588a2720b
 * Authentication: API Key header
 */
export class VetorImobiAdapter implements CrmAdapter {
  private readonly baseURL: string
  private readonly apiKey: string
  private readonly companyId: string | undefined
  readonly name = 'vetor_imobi'

  constructor(apiKey: string, baseURL?: string, companyId?: string) {
    this.baseURL = baseURL || 'https://app.base44.com/api/apps/687412c6a963138588a2720b'
    this.apiKey = apiKey
    this.companyId = companyId
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T[]> {
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'api_key': this.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Vetor API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return data as T[]
  }

  /**
   * Fetch clients from Vetor Imobi
   * GET /entities/Client
   */
  async fetchClients(filters?: Record<string, unknown>): Promise<VetorClient[]> {
    const params = new URLSearchParams()

    // Add company_id filter if set
    if (this.companyId) {
      params.append('company_id', this.companyId)
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/entities/Client${queryString ? `?${queryString}` : ''}`

    return this.request<VetorClient>(endpoint)
  }

  /**
   * Fetch deals from Vetor Imobi
   * GET /entities/Deal
   */
  async fetchDeals(filters?: Record<string, unknown>): Promise<VetorDeal[]> {
    const params = new URLSearchParams()

    // Add company_id filter if set
    if (this.companyId) {
      params.append('company_id', this.companyId)
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/entities/Deal${queryString ? `?${queryString}` : ''}`

    return this.request<VetorDeal>(endpoint)
  }

  /**
   * Fetch properties from Vetor Imobi
   * GET /entities/Property
   */
  async fetchProperties(filters?: Record<string, unknown>): Promise<VetorProperty[]> {
    const params = new URLSearchParams()

    // Add company_id filter if set
    if (this.companyId) {
      params.append('company_id', this.companyId)
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/entities/Property${queryString ? `?${queryString}` : ''}`

    return this.request<VetorProperty>(endpoint)
  }

  /**
   * Fetch users (brokers/agents) from Vetor Imobi
   * GET /entities/User
   */
  async fetchUsers(filters?: Record<string, unknown>): Promise<any[]> {
    const params = new URLSearchParams()

    // Add company_id filter if set
    if (this.companyId) {
      params.append('company_id', this.companyId)
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const queryString = params.toString()
    const endpoint = `/entities/User${queryString ? `?${queryString}` : ''}`

    return this.request<any>(endpoint)
  }

  /**
   * Update a deal in Vetor Imobi
   * PUT /entities/Deal/{entityId}
   */
  async updateDeal(
    entityId: string,
    data: Partial<VetorDeal>
  ): Promise<void> {
    const endpoint = `/entities/Deal/${entityId}`

    await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'api_key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  /**
   * Fetch recently modified entities
   * Useful for periodic sync
   */
  async fetchRecentlyModified(minutes: number = 10): Promise<{
    clients: VetorClient[]
    deals: VetorDeal[]
    properties: VetorProperty[]
  }> {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString()

    const [clients, deals, properties] = await Promise.all([
      this.fetchClients({ updated_at: `gte.${since}` }),
      this.fetchDeals({ updated_at: `gte.${since}` }),
      this.fetchProperties({ updated_at: `gte.${since}` }),
    ])

    return { clients, deals, properties }
  }

  /**
   * Fetch ALL entities without date filter
   * Useful for initial sync
   */
  async fetchAll(): Promise<{
    users: any[]
    clients: VetorClient[]
    deals: VetorDeal[]
    properties: VetorProperty[]
  }> {
    const [users, clients, deals, properties] = await Promise.all([
      this.request<any>('/entities/User'),
      this.request<VetorClient>('/entities/Client'),
      this.request<VetorDeal>('/entities/Deal'),
      this.request<VetorProperty>('/entities/Property'),
    ])

    return { users, clients, deals, properties }
  }

  /**
   * Test the connection to Vetor Imobi API
   */
  async testConnection(): Promise<boolean> {
    try {
      const clients = await this.fetchClients()
      return Array.isArray(clients)
    } catch {
      return false
    }
  }
}

/**
 * Create a Vetor Imobi adapter instance from environment variables
 */
export function createVetorAdapter(): VetorImobiAdapter {
  const apiKey = process.env.VETOR_API_KEY

  if (!apiKey) {
    throw new Error('VETOR_API_KEY environment variable is not set')
  }

  const baseURL = process.env.VETOR_BASE_URL

  return new VetorImobiAdapter(apiKey, baseURL)
}
