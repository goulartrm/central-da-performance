"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api, Deal, DealDetails, ActivityLog } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar,
  FileText,
  History,
  MessageCircle,
  Phone,
  MapPin,
  Mail,
  Loader2,
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
  Search,
  DollarSign,
  Clock,
} from "lucide-react";

type Status = "lead" | "qualified" | "visit" | "proposal" | "negotiation" | "closed";
type Sentiment = "positive" | "neutral" | "negative";

const statusLabels: Record<string, string> = {
  New: "Novo",
  Qualified: "Qualificado",
  Negotiation: "Negociação",
  Proposal: "Proposta",
  Closed: "Fechado",
  Lost: "Perdido",
  lead: "Lead",
  qualified: "Qualificado",
  visit: "Visita",
  proposal: "Proposta",
  negotiation: "Negociação",
  closed: "Fechado",
};

const statusStyles: Record<string, string> = {
  New: "bg-muted-100 text-muted-600 border-border/50",
  Qualified: "bg-primary-light text-primary border-primary/20",
  Negotiation: "bg-info-light text-info border-info/20",
  Proposal: "bg-success-light text-success border-success/20",
  Closed: "bg-success-light text-success border-success/20",
  Lost: "bg-error-light text-error border-error/20",
  lead: "bg-muted-100 text-muted-600 border-border/50",
  qualified: "bg-primary-light text-primary border-primary/20",
  visit: "bg-warning-light text-warning border-warning/20",
  proposal: "bg-success-light text-success border-success/20",
  negotiation: "bg-info-light text-info border-info/20",
  closed: "bg-muted-100 text-muted-600 border-border/50",
};

const sentimentLabels: Record<string, string> = {
  Positive: "Positivo",
  Neutral: "Neutro",
  Negative: "Atenção",
  Urgent: "Urgente",
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Atenção",
};

const sentimentStyles: Record<string, string> = {
  Positive: "bg-success-light text-success border-success/20",
  Neutral: "bg-muted-100 text-muted-600 border-border/50",
  Negative: "bg-error-light text-error border-error/20",
  Urgent: "bg-error-light text-error border-error/20",
  positive: "bg-success-light text-success border-success/20",
  neutral: "bg-muted-100 text-muted-600 border-border/50",
  negative: "bg-error-light text-error border-error/20",
};

// Column definitions for dynamic table
type ColumnId = 'client' | 'property' | 'broker' | 'ai_summary' | 'status' | 'potential_value' | 'last_activity' | 'created_at' | 'updated_at' | 'actions';

interface ColumnDef {
  id: ColumnId;
  label: string;
  fixed: boolean;
  defaultVisible: boolean;
}

const COLUMN_DEFINITIONS: Record<ColumnId, ColumnDef> = {
  client: { id: 'client', label: 'Cliente', fixed: true, defaultVisible: true },
  property: { id: 'property', label: 'Negócio', fixed: true, defaultVisible: true },
  broker: { id: 'broker', label: 'Corretor', fixed: false, defaultVisible: true },
  ai_summary: { id: 'ai_summary', label: 'Resumo IA', fixed: false, defaultVisible: true },
  status: { id: 'status', label: 'Status', fixed: false, defaultVisible: true },
  potential_value: { id: 'potential_value', label: 'Valor Potencial', fixed: false, defaultVisible: false },
  last_activity: { id: 'last_activity', label: 'Última Atividade', fixed: false, defaultVisible: false },
  created_at: { id: 'created_at', label: 'Criado em', fixed: false, defaultVisible: false },
  updated_at: { id: 'updated_at', label: 'Atualizado em', fixed: false, defaultVisible: false },
  actions: { id: 'actions', label: '', fixed: true, defaultVisible: true },
};

const DEFAULT_COLUMNS: ColumnId[] = ['client', 'property', 'broker', 'ai_summary', 'status', 'actions'];

const activityIcons: Record<string, React.ReactNode> = {
  Call: <Phone className="h-4 w-4" strokeWidth={2} />,
  WhatsApp: <MessageCircle className="h-4 w-4" strokeWidth={2} />,
  Visit: <MapPin className="h-4 w-4" strokeWidth={2} />,
  Email: <Mail className="h-4 w-4" strokeWidth={2} />,
  Proposal: <FileText className="h-4 w-4" strokeWidth={2} />,
  Meeting: <Calendar className="h-4 w-4" strokeWidth={2} />,
  ConversationSummary: <MessageCircle className="h-4 w-4" strokeWidth={2} />,
  Note: <FileText className="h-4 w-4" strokeWidth={2} />,
};

export function DealsTable() {
  // Column visibility state (persisted in localStorage)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => {
    if (typeof window === 'undefined') return new Set(DEFAULT_COLUMNS);
    const saved = localStorage.getItem('deals-table-columns');
    return saved ? new Set(JSON.parse(saved)) : new Set(DEFAULT_COLUMNS);
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [brokerFilter, setBrokerFilter] = useState<string>("all");
  const [brokers, setBrokers] = useState<string[]>([]);

  // Data states
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]); // For broker list
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Save column visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deals-table-columns', JSON.stringify([...visibleColumns]));
    }
  }, [visibleColumns]);

  const fetchDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getDeals({
        page,
        limit,
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(sentimentFilter !== "all" && { sentiment: sentimentFilter }),
      });
      setDeals(response.deals);
      setTotal(response.total);

      // Store all deals for broker filter and client-side filtering
      setAllDeals(response.deals);
    } catch (err) {
      console.error("Failed to fetch deals:", err);
      setError("Falha ao carregar negócios");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, sentimentFilter, limit]);

  // Client-side filtering for search and broker
  const filteredDeals = deals.filter(deal => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesClient = deal.client_name?.toLowerCase().includes(query);
      const matchesProperty = deal.property_title?.toLowerCase().includes(query);
      if (!matchesClient && !matchesProperty) return false;
    }

    // Broker filter
    if (brokerFilter !== "all" && deal.broker_name !== brokerFilter) {
      return false;
    }

    return true;
  });

  // Extract unique brokers
  useEffect(() => {
    const uniqueBrokers = [...new Set(allDeals.map(d => d.broker_name).filter(Boolean))];
    setBrokers(uniqueBrokers as string[]);
  }, [allDeals]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const fetchDealDetails = async (dealId: string) => {
    try {
      setIsLoadingDetails(true);
      const details = await api.getDealById(dealId);
      setSelectedDeal(details);
    } catch (err) {
      console.error("Failed to fetch deal details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenDialog = (deal: Deal) => {
    setSelectedDeal({ ...deal, activity_logs: [], broker_phone: null } as DealDetails);
    fetchDealDetails(deal.id);
  };

  const handleCloseDialog = () => {
    setSelectedDeal(null);
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "-";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string | Date | null) => {
    if (!dateStr) return "-";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: string | null): string => {
    if (!value) return "-";
    const num = parseFloat(value);
    if (isNaN(num)) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const formatRelativeTime = (dateStr: string | Date | null): string => {
    if (!dateStr) return "-";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Agora";
    if (diffMinutes < 60) return `Há ${diffMinutes}min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return formatDate(dateStr);
  };

  // Toggle column visibility
  const toggleColumn = (columnId: ColumnId) => {
    const newColumns = new Set(visibleColumns);
    if (newColumns.has(columnId)) {
      newColumns.delete(columnId);
    } else {
      newColumns.add(columnId);
    }
    setVisibleColumns(newColumns);
  };

  return (
    <div className="saas-card flex h-full flex-col rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted-30/50 px-5 py-4">
        <div className="flex flex-col gap-4">
          {/* First row: Title and actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Lista de Negócios
                </h2>
                <p className="text-xs text-muted-500">
                  {total > 0 ? `${total} negócio${total !== 1 ? "s" : ""}` : "Gestão de deals com insights da IA"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Buscar cliente ou imóvel..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-48 sm:w-64 h-9 border border-border/50 bg-white text-sm"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 border border-border/50 bg-white">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Colunas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Exibir colunas</p>
                    {Object.values(COLUMN_DEFINITIONS)
                      .filter((col) => !col.fixed)
                      .map((col) => (
                        <div key={col.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={col.id}
                            checked={visibleColumns.has(col.id)}
                            onCheckedChange={() => toggleColumn(col.id)}
                          />
                          <label htmlFor={col.id} className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {col.label}
                          </label>
                        </div>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3"
                onClick={fetchDeals}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} strokeWidth={2} />
              </Button>
            </div>
          </div>

          {/* Second row: Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32 h-9 border border-border/50 bg-white text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-border/50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="New">Novo</SelectItem>
                <SelectItem value="Qualified">Qualificado</SelectItem>
                <SelectItem value="Negotiation">Negociação</SelectItem>
                <SelectItem value="Proposal">Proposta</SelectItem>
                <SelectItem value="Closed">Fechado</SelectItem>
                <SelectItem value="Lost">Perdido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={(v) => { setSentimentFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32 h-9 border border-border/50 bg-white text-sm">
                <SelectValue placeholder="Sentimento" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-border/50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Positive">Positivo</SelectItem>
                <SelectItem value="Neutral">Neutro</SelectItem>
                <SelectItem value="Negative">Atenção</SelectItem>
              </SelectContent>
            </Select>
            <Select value={brokerFilter} onValueChange={(v) => { setBrokerFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 border border-border/50 bg-white text-sm">
                <SelectValue placeholder="Corretor" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-border/50">
                <SelectItem value="all">Todos os corretores</SelectItem>
                {brokers.map(broker => (
                  <SelectItem key={broker} value={broker}>{broker}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1 saas-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-500" />
            <p className="mt-2 text-sm text-muted-500">Carregando negócios...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="mt-2 text-sm text-error">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchDeals}>
              Tentar novamente
            </Button>
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-300" />
            <p className="mt-2 text-sm text-muted-500">Nenhum negócio encontrado</p>
            <p className="text-xs text-muted-400 mt-1">Tente mudar os filtros ou sincronizar os dados</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table with horizontal scroll */}
            <div className="relative overflow-x-auto">
              {/* Mobile scroll hint */}
              <div className="md:hidden text-xs text-muted-500 text-center py-2 border-b border-border/30">
                ← Deslize para ver mais →
              </div>
              <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  {Object.values(COLUMN_DEFINITIONS)
                    .filter((col) => visibleColumns.has(col.id))
                    .map((col) => (
                      <TableHead
                        key={col.id}
                        className={cn(
                          "saas-table-header text-muted-500",
                          col.id === 'actions' && "text-right w-[60px]"
                        )}
                      >
                        {col.id === 'actions' ? <MoreHorizontal className="h-4 w-4 ml-auto" /> : col.label}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Object.values(COLUMN_DEFINITIONS).length} className="text-center py-8">
                      <p className="text-sm text-muted-500">Nenhum negócio encontrado com os filtros atuais</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeals.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="saas-table-row cursor-pointer hover:bg-muted-50/80 transition-colors"
                      onClick={() => handleOpenDialog(deal)}
                    >
                      {/* Client Column */}
                      {visibleColumns.has('client') && (
                        <TableCell className="saas-table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {deal.client_name}
                            </span>
                            {deal.client_phone && (
                              <a
                                href={`https://wa.me/${deal.client_phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle className="h-3 w-3" strokeWidth={2} />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Property Column */}
                      {visibleColumns.has('property') && (
                        <TableCell className="saas-table-cell">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {deal.property_title || "Sem negócio"}
                            </span>
                            {deal.property_id && (
                              <span className="text-xs text-muted-500 font-mono">
                                {deal.property_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Broker Column */}
                      {visibleColumns.has('broker') && (
                        <TableCell className="saas-table-cell">
                          <span className="text-sm text-muted-700">{deal.broker_name || "-"}</span>
                        </TableCell>
                      )}

                      {/* AI Summary Column */}
                      {visibleColumns.has('ai_summary') && (
                        <TableCell className="saas-table-cell">
                          {deal.smart_summary ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="max-w-[200px] cursor-help truncate text-sm text-muted-700 hover:text-foreground">
                                    {deal.smart_summary}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  className="bg-white border border-border/50 shadow-md rounded-lg p-3 max-w-[300px]"
                                >
                                  <p className="text-sm leading-relaxed">{deal.smart_summary}</p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "mt-2 border rounded-full px-2.5 py-1 text-xs font-medium",
                                      sentimentStyles[deal.sentiment] || sentimentStyles.neutral
                                    )}
                                  >
                                    {sentimentLabels[deal.sentiment] || deal.sentiment}
                                  </Badge>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-sm text-muted-400">Sem resumo</span>
                          )}
                        </TableCell>
                      )}

                      {/* Status Column */}
                      {visibleColumns.has('status') && (
                        <TableCell className="saas-table-cell">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border rounded-full px-2.5 py-1 text-xs font-medium",
                              statusStyles[deal.status] || statusStyles.New
                            )}
                          >
                            {statusLabels[deal.status] || deal.status}
                          </Badge>
                        </TableCell>
                      )}

                      {/* Potential Value Column */}
                      {visibleColumns.has('potential_value') && (
                        <TableCell className="saas-table-cell">
                          {deal.potential_value ? (
                            <span className="text-sm font-medium text-success">
                              {formatCurrency(deal.potential_value)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-400">-</span>
                          )}
                        </TableCell>
                      )}

                      {/* Last Activity Column */}
                      {visibleColumns.has('last_activity') && (
                        <TableCell className="saas-table-cell">
                          <div className="flex items-center gap-1 text-sm text-muted-700">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(deal.last_activity)}
                          </div>
                        </TableCell>
                      )}

                      {/* Created At Column */}
                      {visibleColumns.has('created_at') && (
                        <TableCell className="saas-table-cell">
                          <span className="text-sm text-muted-700">
                            {formatDate(deal.created_at)}
                          </span>
                        </TableCell>
                      )}

                      {/* Updated At Column */}
                      {visibleColumns.has('updated_at') && (
                        <TableCell className="saas-table-cell">
                          <span className="text-sm text-muted-700">
                            {formatDate(deal.updated_at)}
                          </span>
                        </TableCell>
                      )}

                      {/* Actions Column */}
                      {visibleColumns.has('actions') && (
                        <TableCell className="saas-table-cell text-right">
                          <Dialog open={selectedDeal?.id === deal.id} onOpenChange={handleCloseDialog}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-primary hover:bg-primary-light hover:text-primary"
                              >
                                <History className="h-4 w-4" strokeWidth={2} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white border border-border/50 rounded-xl shadow-lg max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-lg font-semibold tracking-tight">
                                  Histórico de Atividades
                                </DialogTitle>
                                <DialogDescription className="text-sm text-muted-500">
                                  {selectedDeal?.client_name} · {selectedDeal?.property_title || "Sem negócio"}
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="max-h-[400px] pr-4">
                                {isLoadingDetails ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-500" />
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {selectedDeal?.activity_logs && selectedDeal.activity_logs.length > 0 ? (
                                      selectedDeal.activity_logs.map((activity) => (
                                        <div
                                          key={activity.id}
                                          className="flex gap-3 rounded-lg border border-border/50 bg-muted-30/50 p-3"
                                        >
                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-border/50">
                                            {activityIcons[activity.type] || <FileText className="h-4 w-4" />}
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                              <Badge
                                                variant="outline"
                                                className="bg-muted-50 text-muted-600 border-border/50 rounded-full px-2.5 py-1 text-xs font-medium"
                                              >
                                                {activity.type}
                                              </Badge>
                                              <span className="text-xs text-muted-500 font-mono">
                                                {formatDate(activity.created_at)} · {formatTime(activity.created_at)}
                                              </span>
                                            </div>
                                            <p className="mt-1 text-sm text-muted-700">
                                              {activity.description}
                                            </p>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="py-8 text-center text-sm text-muted-500">
                                        Nenhuma atividade registrada
                                      </p>
                                    )}
                                  </div>
                                )}
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !error && deals.length > 0 && totalPages > 1 && (
          <div className="border-t border-border/50 bg-muted-30/30 px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Page info */}
              <div className="text-sm text-muted-600">
                <span className="font-medium text-foreground">
                  {(page - 1) * limit + 1}
                </span>
                {" "}-{" "}
                <span className="font-medium text-foreground">
                  {Math.min(page * limit, total)}
                </span>
                {" "}de{" "}
                <span className="font-medium text-foreground">{total}</span>{" "}
                negócios
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-1">
                {/* First page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border/50"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                {/* Previous */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border/50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page numbers - simplified on mobile */}
                <div className="hidden md:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          page === pageNum
                            ? "bg-primary text-white"
                            : "border-border/50"
                        )}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                {/* Current page indicator for mobile */}
                <div className="md:hidden text-sm font-medium text-foreground px-2">
                  {page} / {totalPages}
                </div>

                {/* Next */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border/50"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Last page */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-border/50"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
