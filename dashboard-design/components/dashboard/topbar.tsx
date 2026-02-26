"use client";

import { useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type SyncStatus = "synced" | "syncing" | "error";

interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export function Topbar({ breadcrumbs = [] }: TopbarProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [lastSync, setLastSync] = useState("5 min");
  const { toast } = useToast();

  const handleSync = async () => {
    setSyncStatus("syncing");
    try {
      // Don't pass minutes - let backend use default (365 days to get all data)
      const result = await api.triggerSync("all");
      setSyncStatus("synced");
      setLastSync("agora");
      toast({
        title: "Sincronização concluída!",
        description: `${result.recordsProcessed} registros processados.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus("error");
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 px-4 md:px-5 lg:px-6">
      {/* Breadcrumbs */}
      <nav className="ml-12 flex items-center gap-2 text-sm truncate md:ml-0 md:flex-nowrap">
        <span className="text-muted-foreground">Home</span>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.label} className="flex items-center gap-2">
            <span className="text-muted-foreground">/</span>
            <span
              className={cn(
                index === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Sync Status */}
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          {syncStatus === "synced" && (
            <>
              <span className="flex h-2 w-2 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">
                Atualizado há {lastSync}
              </span>
            </>
          )}
          {syncStatus === "syncing" && (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-primary">Sincronizando...</span>
            </>
          )}
          {syncStatus === "error" && (
            <>
              <span className="flex h-2 w-2 rounded-full bg-destructive" />
              <span className="text-sm text-destructive">
                Erro na sincronização
              </span>
            </>
          )}
        </div>

        {/* Mobile sync indicator */}
        <div className="flex items-center sm:hidden">
          {syncStatus === "synced" && (
            <span className="flex h-2 w-2 rounded-full bg-success" />
          )}
          {syncStatus === "syncing" && (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          )}
          {syncStatus === "error" && (
            <span className="flex h-2 w-2 rounded-full bg-destructive" />
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncStatus === "syncing"}
          className="gap-2 bg-background/50"
        >
          {syncStatus === "syncing" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : syncStatus === "synced" ? (
            <Check className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Sync Agora</span>
          <span className="sm:hidden">Sync</span>
        </Button>
      </div>
    </header>
  );
}
