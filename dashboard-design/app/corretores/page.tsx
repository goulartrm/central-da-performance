"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  TrendingUp,
  Phone,
  Mail,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { api, Broker } from "@/lib/api";
import { toast } from "sonner";
import { CreateBrokerModal } from "@/components/dashboard/create-broker-modal";

export default function CorretoresPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBrokers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getBrokers();
      setBrokers(response.brokers);
    } catch (err) {
      console.error("Failed to fetch brokers:", err);
      setError("Falha ao carregar corretores");
      toast.error("Falha ao carregar corretores");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrokers();
  }, [fetchBrokers]);

  const filteredBrokers = brokers.filter((broker) => {
    const matchesSearch =
      broker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (broker.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && broker.is_active) ||
      (statusFilter === "inactive" && !broker.is_active);
    return matchesSearch && matchesStatus;
  });

  const activeBrokers = brokers.filter((b) => b.is_active).length;
  const totalBrokers = brokers.length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleToggleActive = async (brokerId: string, currentStatus: boolean) => {
    try {
      await api.updateBroker(brokerId, { is_active: !currentStatus });
      toast.success(`Corretor ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      fetchBrokers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar corretor";
      toast.error(errorMessage);
    }
  };

  const handleModalSuccess = () => {
    fetchBrokers();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Users className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Corretores
              </h1>
              <p className="text-sm text-muted-500">
                Gerencie sua equipe e acompanhe performance
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="saas-card p-4 rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-500">Ativos</p>
                <p className="text-xl font-semibold text-foreground">
                  {activeBrokers} <span className="text-muted-400">/ {totalBrokers}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="saas-card p-4 rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-4 w-4 text-success" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-500">Total de Corretores</p>
                <p className="text-xl font-semibold text-success">
                  {totalBrokers}
                </p>
              </div>
            </div>
          </div>

          <div className="saas-card p-4 rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Check className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-500">Taxa de Ativacao</p>
                <p className="text-xl font-semibold text-primary">
                  {totalBrokers > 0 ? Math.round((activeBrokers / totalBrokers) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border border-border/50 bg-white text-sm focus:border-primary focus:ring-0"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-10 border border-border/50 bg-white text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-border/50">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="saas-btn-primary h-10"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" strokeWidth={2} />
            Adicionar
          </Button>
          <Button
            variant="outline"
            className="h-10"
            onClick={fetchBrokers}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={2} />
          </Button>
        </div>

        {/* Brokers Table */}
        <div className="saas-card rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm overflow-hidden">
          <div className="border-b border-border/50 bg-muted-30/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Users className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Lista de Corretores
                </h2>
                <p className="text-xs text-muted-500">
                  Gerenciamento de equipe
                </p>
              </div>
            </div>
          </div>
          <ScrollArea className="saas-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-500" />
                <p className="mt-2 text-sm text-muted-500">Carregando corretores...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-8 w-8 text-error" />
                <p className="mt-2 text-sm text-error">{error}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={fetchBrokers}>
                  Tentar novamente
                </Button>
              </div>
            ) : filteredBrokers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted-500">Nenhum corretor encontrado</p>
                {brokers.length === 0 && (
                  <p className="text-xs text-muted-400 mt-1">Clique em "Adicionar" para criar o primeiro corretor</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="saas-table-header text-muted-500">
                      Corretor
                    </TableHead>
                    <TableHead className="saas-table-header text-muted-500">
                      Contato
                    </TableHead>
                    <TableHead className="saas-table-header text-muted-500">
                      Status
                    </TableHead>
                    <TableHead className="saas-table-header text-muted-500 text-right">
                      Acoes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrokers.map((broker) => (
                    <TableRow key={broker.id} className="saas-table-row">
                      <TableCell className="saas-table-cell">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 saas-avatar">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {getInitials(broker.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {broker.name}
                            </p>
                            <p className="text-xs text-muted-400 font-mono">
                              {broker.crm_external_id || `ID: ${broker.id.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="saas-table-cell">
                        <div className="space-y-1">
                          {broker.email ? (
                            <a
                              href={`mailto:${broker.email}`}
                              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-600"
                            >
                              <Mail className="h-3 w-3" strokeWidth={2} />
                              {broker.email}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-400">Sem email</span>
                          )}
                          {broker.phone ? (
                            <a
                              href={`tel:${broker.phone}`}
                              className="flex items-center gap-1 text-xs font-medium text-muted-600 hover:text-foreground"
                            >
                              <Phone className="h-3 w-3" strokeWidth={2} />
                              {broker.phone}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-400">Sem telefone</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="saas-table-cell">
                        <Badge
                          variant="outline"
                          className={`border rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer ${
                            broker.is_active
                              ? "bg-success-light text-success border-success/20 hover:bg-success-light/80"
                              : "bg-muted-100 text-muted-600 border-border/50 hover:bg-muted-100/80"
                          }`}
                          onClick={() => handleToggleActive(broker.id, broker.is_active)}
                        >
                          {broker.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="saas-table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-3 ${broker.is_active ? 'hover:bg-error-light hover:text-error' : 'hover:bg-success-light hover:text-success'}`}
                            onClick={() => handleToggleActive(broker.id, broker.is_active)}
                          >
                            {broker.is_active ? 'Desativar' : 'Ativar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Create Broker Modal */}
      <CreateBrokerModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={handleModalSuccess}
      />
    </DashboardLayout>
  );
}
