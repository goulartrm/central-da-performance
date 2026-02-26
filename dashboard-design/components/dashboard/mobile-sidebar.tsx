"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Handshake,
  Users,
  Settings,
  LogOut,
  Menu,
  RefreshCw,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type SyncStatus = "synced" | "syncing" | "error";

const navItems = [
  {
    label: "Visão Geral",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Negócios",
    href: "/negocios",
    icon: Handshake,
  },
  {
    label: "Corretores",
    href: "/corretores",
    icon: Users,
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [lastSync, setLastSync] = useState("5 min");
  const { toast } = useToast();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleSync = async () => {
    setSyncStatus("syncing");
    try {
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-50 md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="glass-sidebar w-64 p-0">
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo_vetor-removebg-preview.png"
              alt="Vetor Imobi"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sync Section */}
        <div className="border-t border-border/50 px-3 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncStatus === "syncing"}
            className="w-full justify-start gap-2 bg-background/50"
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : syncStatus === "synced" ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <RefreshCw className="h-4 w-4 text-destructive" />
            )}
            <div className="flex flex-1 flex-col items-start">
              <span className="text-sm font-medium">Sync Agora</span>
              <span className="text-xs text-muted-foreground">
                {syncStatus === "synced" && `Atualizado há ${lastSync}`}
                {syncStatus === "syncing" && "Sincronizando..."}
                {syncStatus === "error" && "Erro na sincronização"}
              </span>
            </div>
          </Button>
        </div>

        {/* User Section - Fixed layout to prevent overlap */}
        <div className="border-t border-border/50 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src="/placeholder-user.jpg" alt="Gestor" />
              <AvatarFallback className="bg-primary/10 text-primary">
                GS
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-foreground truncate">
                Gestor Silva
              </span>
              <span className="text-xs text-muted-foreground truncate">
                gestor@vetorimobi.com
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
