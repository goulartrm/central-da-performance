"use client";

import React, { useEffect, useState } from "react";
import { api, DashboardStats } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  MessageSquare,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  variant?: "default" | "warning" | "danger" | "success";
  icon: React.ReactNode;
  isLoading?: boolean;
}

function KPICard({
  title,
  value,
  subtitle,
  trend,
  variant = "default",
  icon,
  isLoading = false,
}: KPICardProps) {
  return (
    <div className="saas-card p-5 rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-600">
            {title}
          </span>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-500" />
              <span className="text-sm text-muted-500">Carregando...</span>
            </div>
          ) : (
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </span>
          )}
          {subtitle && !isLoading && (
            <span className="text-xs text-muted-500">{subtitle}</span>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            variant === "danger" && "bg-error-light text-error",
            variant === "warning" && "bg-warning-light text-warning",
            variant === "success" && "bg-success-light text-success",
            variant === "default" && "bg-primary-light text-primary"
          )}
        >
          {icon}
        </div>
      </div>
      {trend && !isLoading && (
        <div className="mt-4 flex items-center gap-2">
          {trend.direction === "up" ? (
            <TrendingUp className="h-4 w-4 text-success" strokeWidth={2} />
          ) : (
            <TrendingDown className="h-4 w-4 text-error" strokeWidth={2} />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              trend.direction === "up" ? "text-success" : "text-error"
            )}
          >
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-xs text-muted-500">vs. semana passada</span>
        </div>
      )}
    </div>
  );
}

export function KPICards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [data, debug] = await Promise.all([
          api.getDashboardStats(),
          api.getDashboardStatsDebug().catch(() => null)
        ]);
        console.log("Dashboard stats received:", data);
        console.log("Debug info:", debug);
        setStats(data);
        setDebugInfo(debug);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Debug Info - Remove after fixing */}
      {debugInfo && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs space-y-1">
          <p><strong>Debug Info:</strong></p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-semibold">User:</p>
              <p>Email: {debugInfo.user?.email}</p>
              <p>Role: {debugInfo.user?.role}</p>
              <p>Org ID: {debugInfo.user?.organization_id?.substring(0, 8)}...</p>
            </div>
            <div>
              <p className="font-semibold">Deals in Database:</p>
              {debugInfo.dealsByOrganization?.map((org: any) => (
                <p key={org.organization_id}>
                  Org {org.organization_id.substring(0, 8)}...: {Number(org.count)} deals
                </p>
              ))}
            </div>
          </div>
          <p><strong>Current Stats:</strong> {JSON.stringify(stats)}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Negócios em Risco"
          value={stats?.riskDeals?.toString() || "-"}
          subtitle={stats?.riskDeals === 1 ? "1 negócio com alerta" : `${stats?.riskDeals || 0} negócios com alerta`}
          variant={stats?.riskDeals && stats.riskDeals > 0 ? "danger" : "success"}
          icon={<AlertTriangle className="h-5 w-5" strokeWidth={2} />}
          isLoading={isLoading}
        />
        <KPICard
          title="Conversas Ativas (Mada)"
          value={stats?.activeConversations?.toString() || "-"}
          subtitle="Leads interagindo com IA hoje"
          variant="success"
          icon={<MessageSquare className="h-5 w-5" strokeWidth={2} />}
          isLoading={isLoading}
        />
        <KPICard
          title="Tempo Médio de Resposta"
          value={stats?.avgResponseTime ? `${stats.avgResponseTime}min` : "-"}
          subtitle="Tempo médio de resposta"
          variant={stats?.avgResponseTime && stats.avgResponseTime > 15 ? "warning" : "success"}
          icon={<Clock className="h-5 w-5" strokeWidth={2} />}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
