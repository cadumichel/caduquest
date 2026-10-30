import { formatarData } from "@/lib/datas";
import type { Conquista, Desempenho, Progresso } from "@/lib/progresso";
import { nomeDoNivel } from "@/lib/progresso";

/** Partes do perfil do aluno, usadas na tela dele e no painel do professor. */

/** Medalha do cartão conforme os desafios vencidos (guia visual). */
export function medalhaDoCartao(medalhas: number) {
  if (medalhas >= 10) return "diamante";
  if (medalhas >= 5) return "coroa";
  if (medalhas >= 3) return "ouro";
  if (medalhas >= 1) return "prata";
  return "bronze";
}

export function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="truncate font-bold text-marca-950">{valor}</dd>
    </div>
  );
}

export function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
      <p className="text-xl font-extrabold">{valor}</p>
      <p className="text-[11px] leading-tight text-marca-100">{rotulo}</p>
    </div>
  );
}

export function BarraXp({ progresso }: { progresso: Progresso }) {
  const pct = Math.round((progresso.noNivel / progresso.paraProximo) * 100);
  return (
    <div className="relative mt-5">
      <div className="flex items-end justify-between text-xs text-marca-100">
        <span>
          <span className="text-base font-extrabold text-white">Nível {progresso.nivel}</span> ·{" "}
          {nomeDoNivel(progresso.nivel)}
        </span>
        <span className="tabular-nums">
          {progresso.noNivel}/{progresso.paraProximo} XP
        </span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-gradient-to-r from-ouro-claro to-ouro" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-marca-100">
        Cada questão dá XP, e acertar dá mais. Desafio concluído: +20 XP. Revisão acertada: +5 XP.
      </p>
    </div>
  );
}

export const corAcerto = (a: number) => (a >= 0.8 ? "bg-emerald-500" : a >= 0.5 ? "bg-amber-400" : "bg-rose-500");

export function MapaHabilidades({
  habilidades,
  doProfessor = false,
}: {
  habilidades: Desempenho[];
  doProfessor?: boolean;
}) {
  const comDados = habilidades.filter((h) => h.questoes >= 3);
  const fraca = [...comDados].sort((a, b) => a.acerto - b.acerto)[0];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-extrabold text-marca-900">🧭 Mapa de habilidades</h2>
      <p className="mb-3 text-sm text-slate-600">
        {doProfessor ? "Acerto do aluno" : "Seu acerto"} em cada habilidade cobrada na prova.
      </p>
      <ul className="space-y-2.5">
        {habilidades.map((h) => (
          <li key={h.nome}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{h.nome}</span>
              <span className="tabular-nums text-slate-500">
                {h.questoes
                  ? `${Math.round(h.acerto * 100)}% · ${h.questoes} ${h.questoes === 1 ? "questão" : "questões"}`
                  : "sem questões ainda"}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              {h.questoes > 0 && (
                <div
                  className={`h-full rounded-full ${corAcerto(h.acerto)}`}
                  style={{ width: `${Math.max(4, Math.round(h.acerto * 100))}%` }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      {fraca && fraca.acerto < 0.7 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          💡 {doProfessor ? "Ponto fraco" : "Foque em"} <strong>{fraca.nome}</strong>
          {doProfessor ? "." : ": é onde você mais pode crescer. A revisão de erros ajuda!"}
        </p>
      )}
    </section>
  );
}

export function Historico({
  historico,
  doProfessor = false,
}: {
  historico: Progresso["historico"];
  doProfessor?: boolean;
}) {
  const ultimos = doProfessor ? historico : historico.slice(-10);
  if (!ultimos.length) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-extrabold text-marca-900">📈 {doProfessor ? "Evolução" : "Sua evolução"}</h2>
      <p className="mb-3 text-sm text-slate-600">Acerto em cada desafio, do mais antigo ao mais recente.</p>
      <div className="flex h-36 items-end gap-1.5 overflow-x-auto">
        {ultimos.map((d) => {
          const pct = Math.round(d.acerto * 100);
          return (
            <div
              key={d.id}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${d.titulo}: ${pct}%`}
            >
              <span className="text-[10px] font-bold tabular-nums text-slate-600">{pct}%</span>
              <div
                className={`w-full rounded-t-md ${corAcerto(d.acerto)}`}
                style={{ height: `${Math.max(4, pct)}%` }}
              />
              <span className="w-full truncate text-center text-[10px] text-slate-500">
                {d.tipo === "relampago" ? "⚡" : formatarData(d.abre_em.slice(0, 10)).slice(0, 5)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Conquistas({ conquistas, doProfessor = false }: { conquistas: Conquista[]; doProfessor?: boolean }) {
  const feitas = conquistas.filter((c) => c.conquistada).length;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-extrabold text-marca-900">🏅 Conquistas</h2>
      <p className="mb-3 text-sm text-slate-600">
        {feitas} de {conquistas.length}. {doProfessor ? "Clique" : "Toque"} numa medalha para ver como ganhar.
      </p>
      <ul className={`grid gap-2 ${doProfessor ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4"}`}>
        {conquistas.map((c) => (
          <li key={c.id}>
            <details className="group">
              <summary
                className={`flex aspect-square cursor-pointer list-none flex-col items-center justify-center rounded-2xl p-1 text-center ${
                  c.conquistada
                    ? "bg-gradient-to-b from-amber-50 to-amber-100 ring-1 ring-amber-300"
                    : "bg-slate-100 opacity-60 grayscale"
                }`}
              >
                <span className="text-2xl">{c.conquistada ? c.icone : "🔒"}</span>
                <span className="mt-0.5 text-[10px] leading-tight font-semibold">{c.nome}</span>
              </summary>
              <p className="mt-1 text-[11px] leading-tight text-slate-600">{c.descricao}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
