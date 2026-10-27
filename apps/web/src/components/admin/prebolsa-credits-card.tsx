"use client";

import { useState } from "react";
import { ArrowRight, Clock3, ShieldCheck, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import {
  useActivatePrebolsa,
  useDiscardPrebolsa,
  usePrebolsa,
  type PrebolsaItem,
  type PrebolsaStage,
} from "@/lib/queries/admin-bolsa-units";

const STAGE_LABEL: Record<PrebolsaStage, string> = {
  pendingPayment: "Pendiente de pago",
  awaitingCredits: "Esperando créditos",
  ready: "Listo para activar",
};

function Counter({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "amber" | "sky" | "emerald";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-900",
    sky: "bg-sky-50 text-sky-900",
    emerald: "bg-emerald-50 text-emerald-900",
  };
  return (
    <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] opacity-70">prebolsas</p>
    </div>
  );
}

function PrebolsaActions({
  item,
  busy,
  onActivate,
  onDiscard,
}: {
  item: PrebolsaItem;
  busy: boolean;
  onActivate: (item: PrebolsaItem) => void;
  onDiscard: (item: PrebolsaItem) => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => onActivate(item)}
      >
        Activar
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => onDiscard(item)}
      >
        Eliminar
      </Button>
    </div>
  );
}

export function PrebolsaCreditsCard() {
  const prebolsa = usePrebolsa();
  const activate = useActivatePrebolsa();
  const discard = useDiscardPrebolsa();
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const counts = prebolsa.data?.counts;
  const busyId = activate.isPending
    ? activate.variables
    : discard.isPending
      ? discard.variables
      : null;

  function activateItem(item: PrebolsaItem) {
    const unpaid = item.stage === "pendingPayment";
    const confirmed = window.confirm(
      unpaid
        ? `Esta compra aún no tiene el pago confirmado. ¿Activar igual «${item.plan.name}» para ${item.user.name}? Se apartan ${item.poolRequired} créditos.`
        : `¿Activar «${item.plan.name}» para ${item.user.name}? Se apartan ${item.poolRequired} créditos de la bolsa.`,
    );
    if (!confirmed) return;
    if (item.poolAvailable < item.poolRequired) {
      setActionError("No hay créditos en bolsa");
      return;
    }
    setActionError(null);
    activate.mutate(item.id, {
      onError: (err) => {
        setActionError(
          err instanceof ApiError
            ? err.message
            : "No se pudo activar la prebolsa",
        );
      },
    });
  }

  function discardItem(item: PrebolsaItem) {
    const paid = item.stage !== "pendingPayment";
    const confirmed = window.confirm(
      paid
        ? `¿Eliminar la prebolsa de ${item.user.name}? El pago ya quedó registrado y la petición se cancela.`
        : `¿Eliminar la prebolsa de ${item.user.name} (${item.plan.name})?`,
    );
    if (!confirmed) return;
    setActionError(null);
    discard.mutate(item.id, {
      onError: (err) => {
        setActionError(
          err instanceof ApiError
            ? err.message
            : "No se pudo eliminar la prebolsa",
        );
      },
    });
  }

  return (
    <>
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <WalletCards className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold">Prebolsa de créditos</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Los créditos comprados se quedan pendientes hasta que el pago
                se confirme y la bolsa tenga el tipo de análisis. Un proceso
                automático activa el plan y resta esos créditos.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
            <Counter
              value={counts?.pendingPayment ?? 0}
              label="Pendientes de pago"
              tone="amber"
            />
            <Counter
              value={counts?.awaitingCredits ?? 0}
              label="Esperando créditos"
              tone="sky"
            />
            <Counter
              value={counts?.ready ?? 0}
              label="Listos para activar"
              tone="emerald"
            />
          </div>
          <Button type="button" className="shrink-0" onClick={() => setOpen(true)}>
            Gestionar prebolsas
          </Button>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium">Flujo de estados de la prebolsa</p>
          <ol className="mt-3 grid gap-3 md:grid-cols-3">
            <li className="flex gap-3 rounded-xl bg-muted/40 p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                1
              </span>
              <div>
                <p className="flex items-center gap-1 text-sm font-medium">
                  <Clock3 className="size-3.5" aria-hidden /> Pendiente de pago
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  El usuario inicia la compra aunque la bolsa no alcance. La
                  prebolsa queda en espera.
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-xl bg-muted/40 p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800">
                2
              </span>
              <div>
                <p className="flex items-center gap-1 text-sm font-medium">
                  <ArrowRight className="size-3.5" aria-hidden /> Pago recibido
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Wompi confirma el pago. El plan sigue pendiente hasta que haya
                  créditos de ese análisis.
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-xl bg-muted/40 p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                3
              </span>
              <div>
                <p className="flex items-center gap-1 text-sm font-medium">
                  <ShieldCheck className="size-3.5" aria-hidden /> Activada
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cuando la bolsa cubre los créditos, el cron activa el plan y
                  descuenta la bolsa y la prebolsa.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Prebolsas</DialogTitle>
            <DialogDescription>
              Activar aparta los créditos y pasa el plan a activo. Eliminar
              saca la petición: si nadie pagó se borra; si el pago ya entró,
              se cancela.
            </DialogDescription>
          </DialogHeader>
          {actionError ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
          <div className="max-h-[24rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Usuario</th>
                  <th className="py-2 pr-3 font-medium">Plan</th>
                  <th className="py-2 pr-3 font-medium">Créditos</th>
                  <th className="py-2 pr-3 font-medium">Bolsa</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {(prebolsa.data?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-muted-foreground">
                      No hay compras en prebolsa.
                    </td>
                  </tr>
                ) : (
                  prebolsa.data?.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{item.user.name}</p>
                        <p className="text-xs text-muted-foreground">{item.user.email}</p>
                      </td>
                      <td className="py-2 pr-3">{item.plan.name}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {item.poolRequired}
                        <span className="block text-xs text-muted-foreground">
                          hay {item.poolAvailable}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{item.poolLabel}</td>
                      <td className="py-2 pr-3">{STAGE_LABEL[item.stage]}</td>
                      <td className="py-2">
                        <PrebolsaActions
                          item={item}
                          busy={busyId === item.id}
                          onActivate={activateItem}
                          onDiscard={discardItem}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
