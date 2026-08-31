export default function PreferenciasPage() {
  return (
    <div className="max-w-2xl space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preferencias</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente podrás personalizar notificaciones, idioma y otras opciones
          de la plataforma.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        Esta sección estará disponible en una próxima actualización.
      </div>
    </div>
  );
}
