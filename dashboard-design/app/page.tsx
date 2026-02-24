"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { SmartFeed } from "@/components/dashboard/smart-feed";
import { DealsTable } from "@/components/dashboard/deals-table";
import { Activity } from "lucide-react";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header - Clean */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Activity className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Visão Geral
                </h1>
                <p className="text-sm text-muted-500">
                  Bem-vindo de volta. Aqui está o resumo do seu dia.
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-muted-500">
                Atualizado às {new Date().toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Smart Feed */}
          <div className="lg:col-span-2">
            <SmartFeed />
          </div>

          {/* Deals Table */}
          <div className="lg:col-span-3">
            <DealsTable />
          </div>
        </div>

        {/* Footer Status Bar - Clean */}
        <div className="saas-card flex items-center justify-between rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm px-5 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm font-medium text-foreground">
                Sistema Online
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm font-medium text-foreground">
                Mada Conectado
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-sm font-medium text-foreground">
                3 Pendências
              </span>
            </div>
          </div>
          <p className="text-xs font-medium text-muted-500">
            Vetor Core v1.0.0
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
