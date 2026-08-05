import Link from "next/link";

export function AdminStub({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{blurb}</p>
      <p className="text-xs text-muted-foreground">
        Explora{" "}
        <Link
          href="/admin/bolsa-unidades"
          className="font-medium text-primary underline"
        >
          Bolsa de unidades
        </Link>
        .
      </p>
    </div>
  );
}
