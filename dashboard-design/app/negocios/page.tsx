"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DealsTable } from "@/components/dashboard/deals-table";
import { api, DealsStats } from "@/lib/api";
import { FileText, TrendingUp, Users, DollarSign, Loader2 } from "lucide-react";

export default function NegociosPage() {
  const [stats, setStats] = useState<DealsStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDealsStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch deals stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const formatPipelineValue = (value: number): string => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    } else if (value > 0) {
      return `R$ ${value.toFixed(0)}`;
    }
    return "R$ 0";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <FileText className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Negócios
              </h1>
              <p className="text-sm text-muted-500">
                Gerencie todos os seus deals com insights da IA Mada
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="saas-card p-4 rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-500">Total</p>
                {isLoadingStats ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-400" />
                ) : (
                  <p className="text-xl font-semibold text-foreground">{stats?.total ?? 0}</p>
                )}
              </div>
            </div>
          </div>

          <div className="saas-card p-4 rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-4 w-4 text-success" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-500">Ativos</p>
                {isLoadingStats ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-400" />
                ) : (
                  <p className="text-xl font-semibold text-success">{stats?.ativos ?? 0}</p>
                )}
              </div>
            </div>
          </div>

          <div className="saas-card p-4 rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                <Users className="h-4 w-4 text-warning" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-500">Em Visita</p>
                {isLoadingStats ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-400" />
                ) : (
                  <p className="text-xl font-semibold text-warning">{stats?.emVisita ?? 0}</p>
                )}
              </div>
            </div>
          </div>

          <div className="saas-card p-4 rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-500">Pipeline</p>
                {isLoadingStats ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-400" />
                ) : (
                  <p className="text-xl font-semibold text-primary">
                    {stats ? formatPipelineValue(stats.pipelineValue) : "R$ 0"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Deals Table */}
        <DealsTable />
      </div>
    </DashboardLayout>
  );
}
