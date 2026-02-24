"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  Settings,
  Bell,
  Save,
  Check,
  RefreshCw,
  Shield,
  Lock,
} from "lucide-react";

// Access Denied Component
function AccessDenied() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 mx-auto mb-4">
          <Lock className="h-8 w-8 text-error" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Acesso Negado
        </h1>
        <p className="text-muted-500 max-w-md">
          Voce nao tem permissao para acessar esta pagina. Apenas
          administradores podem visualizar as configuracoes do sistema.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-500">
          <Shield className="h-4 w-4" strokeWidth={2} />
          <span>Requer papel de administrador</span>
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { isAdmin } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <AccessDenied />
      </DashboardLayout>
    );
  }

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Settings className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Configuracoes
              </h1>
              <p className="text-sm text-muted-500">
                Gerencie preferencias e notificacoes do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="saas-card rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
          <div className="border-b border-border/50 bg-muted-30/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Bell className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Notificacoes
                </h2>
                <p className="text-xs text-muted-500">
                  Configure alertas e lembretes automaticos
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Alertas de Sentimento Negativo
                  </p>
                  <p className="text-xs text-muted-500">
                    Receba notificacoes quando leads demonstrarem desinteresse
                  </p>
                </div>
                <button
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    "bg-primary"
                  )}
                >
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform translate-x-5" />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Resumo Diario por Email
                  </p>
                  <p className="text-xs text-muted-500">
                    Resumo das atividades e metricas do dia
                  </p>
                </div>
                <button
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    "bg-muted-200"
                  )}
                >
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Notificacoes de Novos Leads
                  </p>
                  <p className="text-xs text-muted-500">
                    Alertas em tempo real para novos leads qualificados
                  </p>
                </div>
                <button
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    "bg-primary"
                  )}
                >
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform translate-x-5" />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Lembretes de Follow-up
                  </p>
                  <p className="text-xs text-muted-500">
                    Lembretes automaticos para leads sem resposta ha +24h
                  </p>
                </div>
                <button
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    "bg-primary"
                  )}
                >
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform translate-x-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" strokeWidth={2} />
              Configuracoes salvas com sucesso
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="saas-btn-primary min-w-32"
          >
            {isSaving ? (
              <>
                <RefreshCw
                  className="h-4 w-4 mr-2 animate-spin"
                  strokeWidth={2}
                />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" strokeWidth={2} />
                Salvar Alteracoes
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
