"use client";

import { useState } from "react";
import type { GatewayConfigSafe } from "@piel360/shared";
import { GatewayConfigForm } from "@/components/admin/gateway-config-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateGatewayConfig,
  useGatewayConfigs,
  useUpdateGatewayConfig,
} from "@/lib/queries/gateway-configs";

function EditDialog({ config, onClose }: { config: GatewayConfigSafe; onClose: () => void }) {
  const update = useUpdateGatewayConfig(config.id);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {config.gatewayName}</DialogTitle>
        </DialogHeader>
        <GatewayConfigForm
          defaultValues={config}
          submitLabel="Guardar cambios"
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function GatewayConfigsPage() {
  const configs = useGatewayConfigs();
  const createConfig = useCreateGatewayConfig();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<GatewayConfigSafe | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gateway configs</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          Nueva configuración
        </Button>
      </div>

      {configs.isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {configs.data && configs.data.length === 0 && (
        <p className="text-sm text-muted-foreground">Aún no hay configuraciones de pasarela.</p>
      )}

      {configs.data && configs.data.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gateway</TableHead>
                <TableHead>Entorno</TableHead>
                <TableHead>Public key</TableHead>
                <TableHead>Secretos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.data.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{config.gatewayName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{config.environment}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{config.publicKey}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={config.hasPrivateKey ? "default" : "secondary"}>Private</Badge>
                      <Badge variant={config.hasIntegritySecret ? "default" : "secondary"}>Integridad</Badge>
                      <Badge variant={config.hasWebhookSecret ? "default" : "secondary"}>Webhook</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.isActive ? "default" : "secondary"}>
                      {config.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(config)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva configuración</DialogTitle>
          </DialogHeader>
          <GatewayConfigForm
            submitLabel="Crear"
            onSubmit={async (input) => {
              await createConfig.mutateAsync(input);
              setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {editing && <EditDialog config={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
