'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface Org {
  id: string
  name: string
  created_at: string
  user_count: number
  crm_type?: string
  crm_config?: any
  company_id?: string
}

interface User {
  id: string
  email: string
  role: string
  organization_id: string
  organization_name: string | null
  created_at: string
}

interface Stats {
  organizations: number
  users: number
  superadmins: number
}

export default function SuperAdminPage() {
  const router = useRouter()
  const { user, session, isLoading: authLoading, isAuthenticated } = useAuth()

  const [stats, setStats] = useState<Stats | null>(null)
  const [organizations, setOrganizations] = useState<Org[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Form states
  const [newOrgName, setNewOrgName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteOrgId, setInviteOrgId] = useState('')
  const [promoteEmail, setPromoteEmail] = useState('')

  // Edit organization states
  const [editingOrgId, setEditingOrgId] = useState('')
  const [editingOrgName, setEditingOrgName] = useState('')

  // CRM Configuration states
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [crmType, setCrmType] = useState<'vetor' | 'mada' | 'none'>('none')
  const [vetorApiKey, setVetorApiKey] = useState('')
  const [vetorCompanyId, setVetorCompanyId] = useState('')
  const [madaSupabaseUrl, setMadaSupabaseUrl] = useState('')
  const [madaSupabaseKey, setMadaSupabaseKey] = useState('')
  const [orgDetails, setOrgDetails] = useState<Record<string, any>>({})

  // Check if user is superadmin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!session?.user) return

      // Check if email is from vetorimobi.com.br domain
      const email = session.user.email
      if (email && email.toLowerCase().endsWith('@vetorimobi.com.br')) {
        setIsSuperAdmin(true)
      } else {
        setIsSuperAdmin(false)
      }
    }

    checkSuperAdmin()
  }, [session])

  // Fetch data
  const fetchData = async () => {
    if (!isSuperAdmin) return

    try {
      setLoading(true)
      const [statsRes, orgsRes, usersRes] = await Promise.all([
        api.getSuperAdminStats(),
        api.getOrganizations(),
        api.getAllUsers(),
      ])
      setStats(statsRes)
      setOrganizations(orgsRes.organizations)
      setUsers(usersRes.users)
      setError('')
    } catch (err) {
      setError('Failed to load data. Make sure you are a super admin.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/sign-in')
        return
      }
      if (isSuperAdmin) {
        fetchData()
      } else {
        setLoading(false)
      }
    }
  }, [isAuthenticated, authLoading, router, isSuperAdmin])

  // Create organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return

    try {
      await api.createOrganization(newOrgName.trim())
      setNewOrgName('')
      fetchData()
    } catch (err) {
      setError('Failed to create organization')
      console.error(err)
    }
  }

  // Edit organization
  const startEditOrg = (id: string, name: string) => {
    setEditingOrgId(id)
    setEditingOrgName(name)
  }

  const cancelEditOrg = () => {
    setEditingOrgId('')
    setEditingOrgName('')
  }

  const saveEditOrg = async (id: string) => {
    if (!editingOrgName.trim()) return

    try {
      await api.updateOrganization(id, { name: editingOrgName.trim() })
      setEditingOrgId('')
      setEditingOrgName('')
      fetchData()
    } catch (err) {
      setError('Failed to update organization')
      console.error(err)
    }
  }

  // Delete organization
  const handleDeleteOrg = async (id: string, name: string) => {
    if (!confirm(`Delete organization "${name}" and all its users? This cannot be undone.`)) return

    try {
      await api.deleteOrganization(id)
      fetchData()
    } catch (err) {
      setError('Failed to delete organization')
      console.error(err)
    }
  }

  // Invite user
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !invitePassword.trim() || !inviteOrgId) return

    try {
      await api.inviteUser({
        email: inviteEmail.trim(),
        password: invitePassword,
        organization_id: inviteOrgId,
        role: 'admin',
      })
      setInviteEmail('')
      setInvitePassword('')
      setInviteOrgId('')
      fetchData()
    } catch (err) {
      setError('Failed to invite user')
      console.error(err)
    }
  }

  // Promote to superadmin
  const handlePromoteSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promoteEmail.trim()) return

    if (!promoteEmail.toLowerCase().endsWith('@vetorimobi.com.br')) {
      setError('Only @vetorimobi.com.br emails can be promoted to superadmin')
      return
    }

    try {
      await api.promoteToSuperAdmin(promoteEmail.trim())
      setPromoteEmail('')
      fetchData()
      alert('User promoted to superadmin!')
    } catch (err) {
      setError('Failed to promote user')
      console.error(err)
    }
  }

  // Delete user
  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return

    try {
      await api.deleteUser(id)
      fetchData()
    } catch (err) {
      setError('Failed to delete user')
      console.error(err)
    }
  }

  // Update role
  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      await api.updateUserRole(id, newRole)
      fetchData()
    } catch (err) {
      setError('Failed to update role')
      console.error(err)
    }
  }

  // Update CRM configuration
  const handleUpdateCRM = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrgId) return

    try {
      const crm_config: any = {}
      if (crmType === 'vetor') {
        crm_config.vetor_api_key = vetorApiKey.trim()
        crm_config.vetor_company_id = vetorCompanyId.trim()
      } else if (crmType === 'mada') {
        crm_config.mada_supabase_url = madaSupabaseUrl.trim()
        crm_config.mada_supabase_key = madaSupabaseKey.trim()
      }

      await api.updateOrganizationCRM(selectedOrgId, { crm_type: crmType, crm_config })
      fetchData()
      setSelectedOrgId('')
      setCrmType('none')
      setVetorApiKey('')
      setVetorCompanyId('')
      setMadaSupabaseUrl('')
      setMadaSupabaseKey('')
      alert('CRM configuration updated successfully!')
    } catch (err) {
      setError('Failed to update CRM configuration')
      console.error(err)
    }
  }

  // Load organization details for CRM editing
  const handleEditCRM = async (orgId: string) => {
    try {
      const details = await api.getOrganizationDetails(orgId)
      setSelectedOrgId(orgId)
      setCrmType(details.organization.crm_type || 'none')
      if (details.organization.crm_config) {
        if (details.organization.crm_config.vetor_api_key) {
          setVetorApiKey(details.organization.crm_config.vetor_api_key)
        }
        if (details.organization.crm_config.vetor_company_id) {
          setVetorCompanyId(details.organization.crm_config.vetor_company_id)
        }
        if (details.organization.crm_config.mada_supabase_url) {
          setMadaSupabaseUrl(details.organization.crm_config.mada_supabase_url)
        }
        if (details.organization.crm_config.mada_supabase_key) {
          setMadaSupabaseKey(details.organization.crm_config.mada_supabase_key)
        }
      }
      // Also load company_id from org details if available
      if (details.organization.company_id) {
        setVetorCompanyId(details.organization.company_id)
      }
    } catch (err) {
      setError('Failed to load organization details')
      console.error(err)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white p-8 rounded shadow text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              Only users with @vetorimobi.com.br email addresses can access the Super Admin dashboard.
            </p>
            <p className="text-sm text-gray-500">
              Current email: {user?.email || 'Not logged in'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Super Admin Dashboard</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded shadow">
              <div className="text-3xl font-bold">{stats.organizations}</div>
              <div className="text-gray-600">Organizations</div>
            </div>
            <div className="bg-white p-6 rounded shadow">
              <div className="text-3xl font-bold">{stats.users}</div>
              <div className="text-gray-600">Total Users</div>
            </div>
            <div className="bg-white p-6 rounded shadow">
              <div className="text-3xl font-bold">{stats.superadmins}</div>
              <div className="text-gray-600">Super Admins</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Organizations Section */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Organizations</h2>

            {/* Create Org Form */}
            <form onSubmit={handleCreateOrg} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Organization name"
                className="flex-1 border px-3 py-2 rounded"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Add
              </button>
            </form>

            {/* Orgs List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {organizations.map((org) => (
                <div key={org.id} className="flex justify-between items-center border-b pb-2">
                  {editingOrgId === org.id ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input
                        type="text"
                        value={editingOrgName}
                        onChange={(e) => setEditingOrgName(e.target.value)}
                        className="flex-1 border px-2 py-1 rounded text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditOrg(org.id)
                          if (e.key === 'Escape') cancelEditOrg()
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => saveEditOrg(org.id)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditOrg}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-sm text-gray-500">
                          {org.user_count} users
                          {org.crm_type && org.crm_type !== 'none' && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              CRM: {org.crm_type}
                            </span>
                          )}
                          {org.company_id && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Company ID: {org.company_id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditOrg(org.id, org.name)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOrg(org.id, org.name)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {organizations.length === 0 && (
                <div className="text-gray-500 text-center py-4">No organizations yet</div>
              )}
            </div>
          </div>

          {/* Invite User Section */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Invite User (Org Admin)</h2>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password (min 8 chars)</label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Organization</label>
                <select
                  value={inviteOrgId}
                  onChange={(e) => setInviteOrgId(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  required
                >
                  <option value="">Select organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Invite User
              </button>
            </form>
          </div>

          {/* Promote Super Admin Section */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Promote to Super Admin</h2>
            <p className="text-sm text-gray-500 mb-4">
              Only @vetorimobi.com.br emails can be promoted to super admin.
            </p>

            <form onSubmit={handlePromoteSuperAdmin} className="flex gap-2">
              <input
                type="email"
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                placeholder="user@vetorimobi.com.br"
                className="flex-1 border px-3 py-2 rounded"
                required
              />
              <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                Promote
              </button>
            </form>
          </div>

          {/* CRM Configuration Section */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">CRM Configuration</h2>
            <p className="text-sm text-gray-500 mb-4">
              Configure CRM integration for each organization.
            </p>

            <form onSubmit={handleUpdateCRM} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Organization</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => handleEditCRM(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  required
                >
                  <option value="">Select organization to configure</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              {selectedOrgId && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">CRM Type</label>
                    <select
                      value={crmType}
                      onChange={(e) => setCrmType(e.target.value as 'vetor' | 'mada' | 'none')}
                      className="w-full border px-3 py-2 rounded"
                      required
                    >
                      <option value="none">None</option>
                      <option value="vetor">Vetor Imobi</option>
                      <option value="mada">Mada</option>
                    </select>
                  </div>

                  {crmType === 'vetor' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Company ID</label>
                        <input
                          type="text"
                          value={vetorCompanyId}
                          onChange={(e) => setVetorCompanyId(e.target.value)}
                          className="w-full border px-3 py-2 rounded"
                          placeholder="Enter Company ID (numeric)"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Vetor API Key</label>
                        <input
                          type="text"
                          value={vetorApiKey}
                          onChange={(e) => setVetorApiKey(e.target.value)}
                          className="w-full border px-3 py-2 rounded"
                          placeholder="Enter Vetor API key"
                          required
                        />
                      </div>
                    </>
                  )}

                  {crmType === 'mada' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Mada Supabase URL</label>
                        <input
                          type="url"
                          value={madaSupabaseUrl}
                          onChange={(e) => setMadaSupabaseUrl(e.target.value)}
                          className="w-full border px-3 py-2 rounded"
                          placeholder="https://your-project.supabase.co"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Mada Supabase Key</label>
                        <input
                          type="text"
                          value={madaSupabaseKey}
                          onChange={(e) => setMadaSupabaseKey(e.target.value)}
                          className="w-full border px-3 py-2 rounded"
                          placeholder="Enter service role key"
                          required
                        />
                      </div>
                    </>
                  )}

                  <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Save CRM Configuration
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Users List Section */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">All Users</h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">{u.email}</div>
                    <div className="text-sm text-gray-500">
                      {u.organization_name || 'No org'} | Role: {u.role}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      className="border px-2 py-1 rounded text-sm"
                      disabled={u.role === 'superadmin' && !u.email.toLowerCase().endsWith('@vetorimobi.com.br')}
                    >
                      <option value="gestor">gestor</option>
                      <option value="admin">admin</option>
                      {u.email.toLowerCase().endsWith('@vetorimobi.com.br') && (
                        <option value="superadmin">superadmin</option>
                      )}
                    </select>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-gray-500 text-center py-4">No users yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
