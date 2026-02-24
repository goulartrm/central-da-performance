"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api, Broker } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AgentsTableProps {
  onRefresh?: () => void;
}

export function AgentsTable({ onRefresh }: AgentsTableProps) {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBrokerId, setUpdatingBrokerId] = useState<string | null>(null);

  const fetchBrokers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getBrokers();
      setBrokers(response.brokers);
    } catch (err) {
      console.error("Failed to fetch brokers:", err);
      setError("Falha ao carregar corretores");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrokers();
  }, [fetchBrokers]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleToggleActive = async (brokerId: string, currentStatus: boolean) => {
    setUpdatingBrokerId(brokerId);
    try {
      await api.updateBroker(brokerId, { is_active: !currentStatus });
      toast.success(`Corretor ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      fetchBrokers();
      onRefresh?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar corretor";
      toast.error(errorMessage);
    } finally {
      setUpdatingBrokerId(null);
    }
  };

  return (
    <div className="glass-card rounded-lg">
      <div className="border-b border-border/50 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Gestão de Corretores
          </h2>
          <p className="text-sm text-muted-foreground">
            {brokers.length > 0 ? `${brokers.length} corretores` : "Configure a Mada IA para cada corretor do time"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3"
          onClick={fetchBrokers}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} strokeWidth={2} />
        </Button>
      </div>

      <div className="overflow-x-auto">
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
        ) : brokers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-500">Nenhum corretor encontrado</p>
            <p className="text-xs text-muted-400 mt-1">Sincronize os dados para importar corretores</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[180px]">Corretor</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[150px]">Email</TableHead>
                <TableHead className="min-w-[120px]">Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brokers.map((broker) => (
                <TableRow key={broker.id} className="hover:bg-accent/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {getInitials(broker.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {broker.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {broker.crm_external_id || "ID local"}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={broker.is_active}
                        className="data-[state=checked]:bg-primary"
                        disabled={updatingBrokerId === broker.id}
                        onCheckedChange={() => handleToggleActive(broker.id, broker.is_active)}
                      />
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          broker.is_active
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-muted-foreground/30 bg-muted/10 text-muted-foreground"
                        )}
                      >
                        {broker.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {broker.email || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {broker.phone || "-"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
