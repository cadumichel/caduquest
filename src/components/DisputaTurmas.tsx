import { recadoDaDisputa, type Disputa } from "@/lib/disputa-turmas";

const numero = (n: number) => String(n).replace(".", ",");

/** Placar das turmas da mesma série: média de pontos por aluno, por desafio. */
export function DisputaTurmas({
  disputa,
  turmaId,
  doProfessor = false,
}: {
  disputa: Disputa;
  turmaId: string;
  /** No painel não há "sua turma": sai o recado de torcida. */
  doProfessor?: boolean;
}) {
  const maior = Math.max(1, ...disputa.turmas.map((t) => t.media));
  return (
    <section className="rounded-3xl border border-marca-100 bg-white p-4 shadow-sm">
      <h2 className="font-extrabold text-marca-900">⚔️ Disputa das turmas · {disputa.serie}</h2>
      {!doProfessor && <p className="mt-1 text-sm text-slate-700">{recadoDaDisputa(disputa.turmas, turmaId)}</p>}
      <ol className="mt-3 space-y-2.5">
        {disputa.turmas.map((t, i) => {
          const minha = t.turmaId === turmaId;
          return (
            <li key={t.turmaId}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className={minha ? "font-extrabold text-marca-900" : "font-medium text-slate-700"}>
                  {i + 1}º · Turma {t.nome}
                  {minha && !doProfessor && " (a sua)"}
                </span>
                <span className="font-bold text-slate-900">{numero(t.media)} pts</span>
              </div>
              <div className="mt-1 h-2.5 rounded-full bg-slate-100">
                <div
                  className={`h-2.5 rounded-full ${minha ? "bg-marca-600" : "bg-slate-400"}`}
                  style={{ width: `${Math.max((t.media / maior) * 100, 3)}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {Math.round(t.participacao * 100)}% da turma já pontuou · {t.alunos} alunos
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-slate-500">
        O placar é a média de pontos por aluno em cada desafio: turma maior não leva vantagem, e quem não faz o desafio
        puxa a média para baixo.
      </p>
    </section>
  );
}
