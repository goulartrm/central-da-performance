"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DealsTable } from "@/components/dashboard/deals-table";
import { FileText, TrendingUp, Users, DollarSign } from "lucide-react";

export default function NegociosPage() {
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
                <p className="text-xl font-semibold text-foreground">127</p>
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
                <p className="text-xl font-semibold text-success">42</p>
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
                <p className="text-xl font-semibold text-warning">18</p>
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
                <p className="text-xl font-semibold text-primary">R$ 12.4M</p>
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
