"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Handshake,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/auth-context";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof Activity;
  requiresAdmin?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Visão Geral",
    href: "/",
    icon: Activity,
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
    requiresAdmin: true,
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };

  // Get display name from email
  const getDisplayName = () => {
    if (!user?.email) return "Usuário";
    const name = user.email.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col bg-white border-r border-border/50 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo Section - Clean */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-semibold text-white">V</span>
              </div>
              <span className="font-semibold text-sm text-foreground">
                Vetor Core
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-semibold text-white">V</span>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation - Clean & Minimal */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems
            .filter((item) => !item.requiresAdmin || isAdmin)
            .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-600 hover:bg-muted-50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            // Only wrap with Tooltip when collapsed
            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-white border border-border/50 shadow-md">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        {/* User Section - Clean */}
        <div className="border-t border-border/50 p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
              "hover:bg-muted-50"
            )}
          >
            <Avatar className="h-8 w-8 saas-avatar">
              <AvatarFallback className="bg-primary text-white text-xs font-medium">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-muted-500 truncate">
                  {user?.email || ""}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-muted-500 hover:text-foreground hover:bg-muted-100"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}
            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-8 w-8 text-muted-500 hover:text-foreground hover:bg-muted-100 absolute bottom-3 left-1/2 -translate-x-1/2"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-white border border-border/50 shadow-md">
                  Sair
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Collapse Toggle - Minimal */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-md border border-border/50 bg-white shadow-sm hover:bg-muted-50 hover:border-border"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" strokeWidth={2} />
          ) : (
            <ChevronLeft className="h-3 w-3" strokeWidth={2} />
          )}
        </Button>
      </aside>
    </TooltipProvider>
  );
}
