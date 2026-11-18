export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-5">
      <div className="space-y-2.5">
        <div className="esqueleto h-8 w-56" />
        <div className="esqueleto h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="esqueleto h-28 rounded-[var(--radius-pane)]" />
        ))}
      </div>
      <div className="esqueleto h-80 rounded-[var(--radius-pane)]" />
    </div>
  );
}
