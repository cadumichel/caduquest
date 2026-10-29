import { BONUS_META, META_PARTICIPACAO, type MetaTurma as Meta } from "@/lib/ligas";

/** Meta coletiva da semana: se 80% da turma fizer os desafios, todos ganham bônus. */
export function MetaTurma({ meta }: { meta: Meta }) {
  const s = meta.atual;
  if (!s || s.total === 0) return null;
  const pct = Math.round((s.participantes / s.total) * 100);
  const alvo = Math.round(META_PARTICIPACAO * 100);
  return (
    <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold text-marca-900">🤝 Meta da turma</p>
        <span className="text-sm font-bold tabular-nums text-sky-800">
          {s.participantes}/{s.total}
        </span>
      </div>
      <p className="text-sm text-slate-600">
        {s.batida
          ? `Meta batida! Todos da turma ganharam +${BONUS_META} pontos nesta semana. 🎉`
          : `Se ${alvo}% da turma fizer todos os desafios da semana, todos ganham +${BONUS_META} pontos. ${
              s.faltam === 1 ? "Falta 1 aluno" : `Faltam ${s.faltam} alunos`
            }: chame os colegas!`}
      </p>
      <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-sky-100">
        <div
          className={`h-full rounded-full ${s.batida ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute top-0 h-full w-0.5 bg-marca-900/60" style={{ left: `${alvo}%` }} />
      </div>
      {meta.semanasBatidas > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          A turma já bateu a meta em {meta.semanasBatidas} {meta.semanasBatidas === 1 ? "semana" : "semanas"} nesta
          temporada.
        </p>
      )}
    </section>
  );
}
