"use client";

import React from "react"

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileSidebar } from "./mobile-sidebar";
import { cn } from "@/lib/utils";
import { useIsLandscapeMobile } from "@/hooks/use-landscape";

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardLayout({
  children,
  breadcrumbs,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isLandscapeMobile = useIsLandscapeMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Background decorative elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar - hidden on tablet+ */}
      <MobileSidebar />

      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          "md:ml-64",
          sidebarCollapsed && "md:ml-16"
        )}
      >
        {/* Hide Topbar in landscape mobile mode */}
        {!isLandscapeMobile && <Topbar breadcrumbs={breadcrumbs} />}
        <div
          className={cn(
            "p-4 md:p-5 lg:p-6",
            // Adjust top padding based on landscape mode
            isLandscapeMobile ? "pt-4" : "pt-16 md:pt-6 lg:pt-6"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
