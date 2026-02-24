PRD Técnico: Vetor Core (Central de Performance)
Objetivo: Construir o Backend de gestão (Node.js + TypeScript) e o Dashboard administrativo (Next.js) que consolidam dados de CRMs legados e da IA Mada.

Repositório: vetor-core (Novo)
Dependência Externa: mada-agent (Supabase) + Vetor Imobi (Base44 API)

1. Arquitetura do Sistema (Hub & Spoke)
O Vetor Core atua como a "Fonte da Verdade" para o Gestor.

Entrada de Dados 1 (CRMs Legados): Adaptadores TypeScript que buscam dados (Polling) da API Vetor Imobi (Base44).

Entrada de Dados 2 (Mada Agent): Polling direto ao Supabase do Mada para buscar logs de conversa, resumos e atualizações de status.

Saída (Frontend): Dashboard Web para o Gestor visualizar a performance.

2. Backend (Node.js + TypeScript) - Especificações
Stack: Node.js, TypeScript, Fastify (Web Framework), Drizzle ORM, Neon (Postgres), node-cron (Jobs).

Deploy: Railway (backend) + Vercel (frontend)
Auth: Neon Auth + Google OAuth
Multi-tenant: Isolamento por organization_id

A. Estrutura do Banco de Dados (Neon Postgres)
Precisamos criar as migrations para estas tabelas essenciais:

```sql
-- Organizations (Tenant)
organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  vetor_api_key VARCHAR(255),           -- API Key Vetor Imobi (Base44)
  mada_supabase_url TEXT,               -- URL do Supabase do Mada
  mada_supabase_key TEXT,               -- Service Role Key do Mada
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Users (Autenticação - Neon Auth)
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) DEFAULT 'gestor',    -- admin, gestor, corretor
  auth_provider VARCHAR(50),            -- neon, google
  created_at TIMESTAMP DEFAULT NOW()
)

-- Brokers (Corretores)
brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  crm_external_id VARCHAR(255),         -- ID no Vetor Imobi
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Deals (Negócios)
deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  broker_id UUID REFERENCES brokers(id),
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_email VARCHAR(255),
  property_title TEXT,
  property_id VARCHAR(255),             -- ID no Vetor Imobi
  status VARCHAR(50) DEFAULT 'New',     -- New, InService, Proposal, Sold, Lost
  sentiment VARCHAR(50) DEFAULT 'Neutral', -- Positive, Neutral, Negative, Urgent
  smart_summary TEXT,                   -- Resumo gerado pelo Mada
  last_activity TIMESTAMP,
  potential_value DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Activity Logs (Histórico)
activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  type VARCHAR(50) NOT NULL,            -- ConversationSummary, StatusChange, Alert, Sync
  description TEXT NOT NULL,
  metadata JSONB,                       -- Dados adicionais flexíveis
  created_at TIMESTAMP DEFAULT NOW()
)

-- Sync Logs (Logs de sincronização)
sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  source VARCHAR(50) NOT NULL,          -- mada, vetor_imobi
  status VARCHAR(50) NOT NULL,          -- success, error, partial
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
)

-- Enums (TypeScript + Check constraints)
deal_status: New, InService, Proposal, Sold, Lost
sentiment: Positive, Neutral, Negative, Urgent
activity_type: ConversationSummary, StatusChange, Alert, Sync
```

B. API Endpoints (Fastify)

1. Para o Frontend (Dashboard):

GET /api/dashboard/stats
- Retorna os KPIs de risco e atividade
- Response: { riskDeals: number, activeConversations: number, avgResponseTime: number, newSummaries: number }

GET /api/deals?page=1&limit=20&status=InService&sentiment=Negative
- Lista filtrável com paginação (lê do banco local Neon)
- Query params: page, limit, status, sentiment, broker_id, search
- Response: { deals: Deal[], total: number, page: number }

GET /api/deals/:id
- Detalhes de um negócio específico
- Response: Deal + activity_logs[]

POST /api/sync
- Força a rodar o adaptador do CRM agora (manual trigger)
- Body: { source: 'vetor_imobi' | 'mada' }
- Response: { status: string, recordsProcessed: number }

GET /api/brokers
- Lista de corretores da organização
- Response: Broker[]

GET /api/sync/logs
- Histórico de sincronizações
- Response: SyncLog[]

2. Para Integração com Mada (via Polling):

GET /api/internal/mada/sync?minutes=10
- Endpoint interno chamado pelo cron job
- Busca conversas atualizadas no Supabase do Mada
- Atualiza deals e activity_logs no Neon
- Response: { recordsProcessed: number, status: string }

3. Para Integração com Vetor Imobi (via Polling):

GET /api/internal/vetor/sync?minutes=10
- Endpoint interno chamado pelo cron job
- Busca clients/deals/properties da API Base44
- Sincroniza com o banco Neon
- Response: { recordsProcessed: number, status: string }

C. Cron Jobs (node-cron)

Cron 1: Mada Sync (a cada 5 minutos)
- GET /api/internal/mada/sync?minutes=5
- Busca conversas atualizadas no Supabase do Mada
- Atualiza smart_summary, sentiment, activity_logs

Cron 2: Vetor Imobi Sync (a cada 30 minutos)
- GET /api/internal/vetor/sync?minutes=30
- Busca clients, deals, properties da API Base44
- Sincroniza com banco Neon

D. Módulo de Adaptadores (TypeScript)

```typescript
// Interface para Adaptadores CRM
interface CrmAdapter {
  name: string
  fetchClients(minutes: number): Promise<Client[]>
  fetchDeals(minutes: number): Promise<Deal[]>
  fetchProperties(minutes: number): Promise<Property[]>
  updateDeal(entityId: string, data: Partial<Deal>): Promise<void>
}

// Implementação Vetor Imobi (Base44)
class VetorImobiAdapter implements CrmAdapter {
  private baseURL = 'https://app.base44.com/api/apps/687412c6a963138588a2720b'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetchClients(filters?: object): Promise<Client[]> {
    // GET /entities/Client com filtros
  }

  async fetchDeals(filters?: object): Promise<Deal[]> {
    // GET /entities/Deal com filtros
  }

  async fetchProperties(filters?: object): Promise<Property[]> {
    // GET /entities/Property com filtros
  }

  async updateDeal(entityId: string, data: Partial<Deal>): Promise<void> {
    // PUT /entities/Deal/{entityId}
  }
}

// Serviço de Sincronização Mada
class MadaSyncService {
  private supabaseUrl: string
  private supabaseKey: string

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseKey
  }

  async fetchRecentConversations(minutes: number = 10): Promise<Conversation[]> {
    // Consulta tabelas do Supabase do Mada
    // Retorna conversas com resumos e sentimentos atualizados
  }

  async syncToVetorCore(conversations: Conversation[]): Promise<SyncResult> {
    // Atualiza deals e activity_logs no Neon
    // Retorna estatísticas da sincronização
  }
}
```

3. Frontend (Next.js 16 + React 19) - Especificações
Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts.
Deploy: Vercel
Auth: Neon Auth + Google OAuth

A. Identidade Visual
Cores:
- Primary: Blue #52a6ec (Botões, Destaques, Links)
- Neutral: Black #000000, Dark Gray #6c6c6c
- Background: White #FFFFFF ou Off-white
- Accent: Alert Red #ef4444, Success Green #22c55e, Warning Yellow #eab308

Tipografia:
- Display: Space Grotesk ou fonte customizada (headers)
- Body: system-ui (para legibilidade)

B. Estrutura de Pastas (Next.js App Router)
```
app/
├── (auth)/
│   └── login/
│       └── page.tsx          # Login com Neon Auth + Google OAuth
├── dashboard/
│   ├── layout.tsx            # DashboardLayout (sidebar + topbar)
│   ├── page.tsx              # Dashboard principal (KPIs + Feed + Table)
│   ├── negocios/
│   │   └── page.tsx          # Negócios (deals table detalhado)
│   ├── corretores/
│   │   └── page.tsx          # Corretores (lista + gestão)
│   └── configuracoes/
│       └── page.tsx          # Configurações (API keys, integrações)
├── api/                      # API Routes (se necessário)
├── layout.tsx                # Root layout
└── globals.css               # Tailwind styles
components/
├── ui/                       # shadcn/ui components
└── dashboard/
    ├── sidebar.tsx
    ├── topbar.tsx
    ├── kpi-cards.tsx
    ├── deals-table.tsx
    ├── smart-feed.tsx
    └── activity-modal.tsx
lib/
└── api.ts                    # Cliente HTTP para backend
```

C. Telas Críticas (MVP)

1. Login/Auth (/login)
- Neon Auth + Google OAuth
- Redirect para /dashboard após login

2. Dashboard (/dashboard)
- Header: Logo Vetor + Botão "Sincronizar" + User menu
- Cards de KPI:
  - "3 Leads em Risco" (sentiment Negative/Urgent)
  - "5 Resumos Novos" (últimas 24h)
  - "12min Tempo Médio de Resposta"
- Smart Feed: Timeline de atividades recentes (Mada actions)
- Tabela de Negócios Ativos:
  - Colunas: Cliente, Imóvel, Corretor, Resumo IA, Status, Tempo sem Resposta
  - Filtros: Status, Sentiment, Corretor
  - Hover no Resumo IA mostra tooltip com detalhes

3. Negócios (/dashboard/negocios)
- Tabela detalhada de deals
- Modal de activity history ao clicar
- Ações: WhatsApp link, ver detalhes

4. Corretores (/dashboard/corretores)
- Lista de corretores (ativo/inativo)
- Métricas por corretor

5. Configurações (/dashboard/configuracoes)
- Input para API Key Vetor Imobi
- Input para Supabase URL/Key (Mada)
- Teste de conexão

D. Integrações Frontend-Backend
- API client em lib/api.ts (fetch com auth)
- React Query ou SWR para cache/mutation
- Server Actions do Next.js se necessário

---

4. Deploy & Infraestrutura

A. Backend (Railway)
- Node.js + TypeScript + Fastify
- Neon Postgres (banco de dados)
- node-cron para jobs de polling
- Variáveis de ambiente:
  - DATABASE_URL (Neon connection string)
  - MADA_SUPABASE_URL, MADA_SUPABASE_KEY
  - VETOR_API_KEY
  - JWT_SECRET (se necessário)

B. Frontend (Vercel)
- Next.js 16 + App Router
- Build: `npm run build`
- Environment variables:
  - NEXT_PUBLIC_API_URL (backend Railway URL)
  - NEON_AUTH_CLIENT_ID, NEON_AUTH_CLIENT_SECRET
  - GOOGLE_OAUTH_CLIENT_ID

C. Cron Jobs
- Railway Cron ou node-cron interno
- Mada Sync: */5 * * * * (a cada 5 min)
- Vetor Sync: */30 * * * * (a cada 30 min)

---

5. Tech Stack Resumo

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui |
| Backend | Node.js, TypeScript, Fastify, Drizzle ORM |
| Database | Neon Postgres (Serverless) |
| Auth | Neon Auth + Google OAuth |
| Cron | node-cron ou Railway Cron |
| Deploy Frontend | Vercel |
| Deploy Backend | Railway |
| Integrations | Vetor Imobi (Base44 API), Mada (Supabase polling) |

---

6. Prioridades de Implementação (MVP)

Fase 1 - Backend Core:
1. Setup Fastify + Drizzle + Neon
2. Migrations e schema do banco
3. Endpoints básicos (stats, deals list)
4. Integração Vetor Imobi (fetch)

Fase 2 - Autenticação:
1. Neon Auth setup
2. Google OAuth integration
3. Multi-tenant middleware

Fase 3 - Integração Mada:
1. Supabase client
2. Polling service
3. Sync deals + activity_logs

Fase 4 - Frontend:
1. Design System refinado
2. Dashboard + páginas
3. Auth flow
4. Integração com backend API

Fase 5 - Deploy & Monitoramento:
1. Deploy Railway (backend)
2. Deploy Vercel (frontend)
3. Cron jobs
4. Logging + erros