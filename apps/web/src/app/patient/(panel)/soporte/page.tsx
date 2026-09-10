export default function SoportePage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Soporte</h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        ¿Necesitas ayuda? Escríbenos a{" "}
        <a
          className="font-medium text-foreground underline"
          href="mailto:soporte@piel360.com"
        >
          soporte@piel360.com
        </a>
        .
      </p>
    </div>
  );
}
