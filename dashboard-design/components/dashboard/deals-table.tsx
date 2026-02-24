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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getDeals({
        page,
        limit: 50,
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(sentimentFilter !== "all" && { sentiment: sentimentFilter }),
      });
      setDeals(response.deals);
      setTotal(response.total);
    } catch (err) {
      console.error("Failed to fetch deals:", err);
      setError("Falha ao carregar negócios");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, sentimentFilter]);

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

  return (
    <div className="saas-card flex h-full flex-col rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted-30/50 px-5 py-4">
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="saas-table-header text-muted-500">
                  Cliente
                </TableHead>
                <TableHead className="saas-table-header text-muted-500">
                  Imóvel
                </TableHead>
                <TableHead className="saas-table-header text-muted-500">
                  Corretor
                </TableHead>
                <TableHead className="saas-table-header text-muted-500">
                  Resumo IA
                </TableHead>
                <TableHead className="saas-table-header text-muted-500">
                  Status
                </TableHead>
                <TableHead className="saas-table-header text-muted-500 text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id} className="saas-table-row">
                  <TableCell className="saas-table-cell">
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
                        >
                          <MessageCircle className="h-3 w-3" strokeWidth={2} />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="saas-table-cell">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {deal.property_title || "Sem imóvel"}
                      </span>
                      {deal.property_id && (
                        <span className="text-xs text-muted-500 font-mono">
                          {deal.property_id}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="saas-table-cell">
                    <span className="text-sm text-muted-700">{deal.broker_name || "-"}</span>
                  </TableCell>
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
                  <TableCell className="saas-table-cell text-right">
                    <Dialog open={selectedDeal?.id === deal.id} onOpenChange={handleCloseDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-sm font-medium text-primary hover:bg-primary-light hover:text-primary"
                          onClick={() => handleOpenDialog(deal)}
                        >
                          <History className="h-4 w-4" strokeWidth={2} />
                          <span className="hidden sm:inline ml-1">Histórico</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border border-border/50 rounded-xl shadow-lg max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-semibold tracking-tight">
                            Histórico de Atividades
                          </DialogTitle>
                          <DialogDescription className="text-sm text-muted-500">
                            {selectedDeal?.client_name} · {selectedDeal?.property_title || "Sem imóvel"}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
