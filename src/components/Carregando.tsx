/** Esqueleto mostrado na hora do clique enquanto a próxima tela é montada no servidor. */
export function Carregando({ blocos = 3 }: { blocos?: number }) {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Carregando">
      <div className="h-8 w-2/3 rounded-xl bg-marca-100" />
      <div className="h-36 rounded-3xl bg-marca-100/70" />
      {Array.from({ length: blocos - 1 }, (_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-slate-200/70" />
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
