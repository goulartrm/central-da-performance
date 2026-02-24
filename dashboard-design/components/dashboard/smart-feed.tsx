"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api, Deal, ActivityLog } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";

type Sentiment = "positive" | "neutral" | "negative";

interface FeedItem {
  id: string;
  agent: string;
  client: string;
  timeAgo: string;
  summary: string;
  sentiment: Sentiment;
  property?: string;
  dealId: string;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const sentimentConfig: Record<string, { label: string; className: string }> = {
    Positive: {
      label: "Positivo",
      className: "bg-success-light text-success border-success/20",
    },
    Neutral: {
      label: "Neutro",
      className: "bg-muted-100 text-muted-600 border-border/50",
    },
    Negative: {
      label: "Atenção",
      className: "bg-error-light text-error border-error/20",
    },
    Urgent: {
      label: "Urgente",
      className: "bg-error-light text-error border-error/20",
    },
    positive: {
      label: "Positivo",
      className: "bg-success-light text-success border-success/20",
    },
    neutral: {
      label: "Neutro",
      className: "bg-muted-100 text-muted-600 border-border/50",
    },
    negative: {
      label: "Atenção",
      className: "bg-error-light text-error border-error/20",
    },
  };

  const config = sentimentConfig[sentiment] || sentimentConfig.neutral;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border",
        config.className
      )}
    >
      {config.label}
    </Badge>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <div className="saas-card rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm p-4 transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 saas-avatar">
          <AvatarFallback className="bg-primary text-white text-xs font-medium">
            {item.agent
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {item.agent}
            </span>
            <span className="text-muted-300">·</span>
            <span className="text-sm text-muted-600">{item.client}</span>
            <span className="ml-auto text-xs text-muted-500">
              {item.timeAgo}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-700">
            {item.summary}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <SentimentBadge sentiment={item.sentiment} />
            {item.property && (
              <Badge
                variant="outline"
                className="bg-muted-50 text-muted-600 border-border/50 px-2.5 py-1 text-xs font-medium rounded-full"
              >
                {item.property}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `${diffDays} dias`;
  return date.toLocaleDateString("pt-BR");
}

export function SmartFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch deals with activity logs
      const response = await api.getDeals({ limit: 20 });

      // For each deal, fetch details to get activity logs
      const dealsWithActivities = await Promise.all(
        response.deals.slice(0, 10).map(async (deal) => {
          try {
            const details = await api.getDealById(deal.id);
            return details;
          } catch {
            return null;
          }
        })
      );

      // Convert to feed items from recent activity logs
      const items: FeedItem[] = [];

      for (const deal of dealsWithActivities) {
        if (!deal) continue;

        // Add activity logs as feed items
        for (const activity of deal.activity_logs || []) {
          if (activity.type === "ConversationSummary" || activity.type === "Note") {
            items.push({
              id: activity.id,
              agent: deal.broker_name || "Corretor",
              client: deal.client_name,
              timeAgo: formatTimeAgo(activity.created_at),
              summary: activity.description,
              sentiment: (deal.sentiment?.toLowerCase() as Sentiment) || "neutral",
              property: deal.property_title || undefined,
              dealId: deal.id,
            });
          }
        }

        // If no activities but has smart summary, add the deal itself
        if ((!deal.activity_logs || deal.activity_logs.length === 0) && deal.smart_summary) {
          items.push({
            id: deal.id,
            agent: deal.broker_name || "Corretor",
            client: deal.client_name,
            timeAgo: deal.last_activity ? formatTimeAgo(deal.last_activity) : formatTimeAgo(deal.updated_at),
            summary: deal.smart_summary,
            sentiment: (deal.sentiment?.toLowerCase() as Sentiment) || "neutral",
            property: deal.property_title || undefined,
            dealId: deal.id,
          });
        }
      }

      // Sort by time (most recent first) - using the deals' updated_at as proxy
      items.sort((a, b) => {
        const dateA = new Date(a.timeAgo.includes("min") || a.timeAgo.includes("h") ? Date.now() : 0);
        const dateB = new Date(b.timeAgo.includes("min") || b.timeAgo.includes("h") ? Date.now() : 0);
        return dateB.getTime() - dateA.getTime();
      });

      setFeedItems(items.slice(0, 10));
    } catch (err) {
      console.error("Failed to fetch smart feed:", err);
      setError("Falha ao carregar feed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchFeed, 60000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  return (
    <div className="saas-card flex h-full flex-col rounded-xl border border-border/50 bg-white/50 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted-30/50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Últimas Atualizações
              </h2>
              <p className="text-xs text-muted-500">
                {feedItems.length > 0 ? `${feedItems.length} atualizações` : "Feed de inteligência em tempo real"}
              </p>
            </div>
          </div>
          <button
            onClick={fetchFeed}
            disabled={isLoading}
            className="p-2 hover:bg-muted-100 rounded-lg transition-colors"
            aria-label="Atualizar"
          >
            <RefreshCw className={cn("h-4 w-4 text-muted-500", isLoading && "animate-spin")} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <ScrollArea className="flex-1 saas-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-500" />
            <p className="mt-2 text-sm text-muted-500">Carregando atualizações...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-8 w-8 text-error" />
            <p className="mt-2 text-sm text-error">{error}</p>
            <button
              onClick={fetchFeed}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Sparkles className="h-12 w-12 text-muted-300" />
            <p className="mt-2 text-sm text-muted-500">Nenhuma atualização recente</p>
            <p className="text-xs text-muted-400 mt-1">As atividades aparecerão aqui</p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {feedItems.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
