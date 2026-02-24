"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Loader2, XCircle, Plug } from "lucide-react";
import { toast } from "sonner";

type ConnectionStatus = "idle" | "testing" | "success" | "error";

export function CRMIntegration() {
  const [crm, setCRM] = useState<string>("");
  const [apiToken, setApiToken] = useState("");
  const [crmUrl, setCrmUrl] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");

  const handleTestConnection = async () => {
    if (!crm || !apiToken) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setConnectionStatus("testing");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate success/failure randomly for demo
    const success = Math.random() > 0.3;

    if (success) {
      setConnectionStatus("success");
      toast.success("Conexão estabelecida com sucesso!");
    } else {
      setConnectionStatus("error");
      toast.error("Falha na conexão. Verifique suas credenciais.");
    }
  };

  return (
    <div className="glass-card rounded-lg">
      <div className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Integração CRM
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure a conexão com seu sistema CRM
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="crm" className="text-foreground">
            Escolha seu CRM
          </Label>
          <Select value={crm} onValueChange={setCRM}>
            <SelectTrigger id="crm" className="bg-background/50">
              <SelectValue placeholder="Selecione o CRM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vista">Vista Software</SelectItem>
              <SelectItem value="kenlo">Kenlo</SelectItem>
              <SelectItem value="universal">Universal (API REST)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiToken" className="text-foreground">
            API Token / Login
          </Label>
          <Input
            id="apiToken"
            type="password"
            placeholder="Insira seu token de API"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            className="bg-background/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="crmUrl" className="text-foreground">
            URL do CRM{" "}
            <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="crmUrl"
            type="url"
            placeholder="https://seucrm.com.br/api"
            value={crmUrl}
            onChange={(e) => setCrmUrl(e.target.value)}
            className="bg-background/50"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleTestConnection}
            disabled={connectionStatus === "testing"}
            className="gap-2"
          >
            {connectionStatus === "testing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Plug className="h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>

          {connectionStatus === "success" && (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Conectado</span>
            </div>
          )}

          {connectionStatus === "error" && (
            <div className="flex items-center gap-1.5 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Falha na conexão</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
