import { formatarData } from "@/lib/datas";
import type { DiaRel } from "@/lib/publico/relatorio";

const SERIES = [
  { chave: "ativos", rotulo: "Jogadores que acessaram" },
  { chave: "partidas", rotulo: "Partidas iniciadas" },
  { chave: "inscritos", rotulo: "Inscritos novos" },
] as const;

const curto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/**
 * Três gráficos pequenos de barras por dia (um por medida, cada um na própria
 * escala). Passar o mouse numa barra mostra o dia e o valor.
 */
export function GraficoDias({ dias }: { dias: DiaRel[] }) {
  // Períodos longos: agrupa por semana para as barras não ficarem finas demais.
  const semanal = dias.length > 62;
  const pontos: (DiaRel & { ate: string })[] = [];
  for (let i = 0; i < dias.length; i += semanal ? 7 : 1) {
    const grupo = dias.slice(i, i + (semanal ? 7 : 1));
    pontos.push({
      dia: grupo[0].dia,
      ate: grupo[grupo.length - 1].dia,
      ativos: grupo.reduce((s, d) => s + d.ativos, 0),
      partidas: grupo.reduce((s, d) => s + d.partidas, 0),
      inscritos: grupo.reduce((s, d) => s + d.inscritos, 0),
    });
  }
  const rotuloPonto = (p: (typeof pontos)[number]) =>
    p.dia === p.ate ? formatarData(p.dia) : `${formatarData(p.dia)} a ${formatarData(p.ate)}`;

  return (
    <div className="space-y-5">
      {semanal && <p className="text-xs text-slate-500">Período longo: cada barra soma uma semana.</p>}
      <div className="grid gap-5 lg:grid-cols-3">
        {SERIES.map((s) => {
          const max = Math.max(1, ...pontos.map((p) => p[s.chave]));
          const total = pontos.reduce((t, p) => t + p[s.chave], 0);
          return (
            <figure key={s.chave} className="min-w-0">
              <figcaption className="mb-2 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-700">{s.rotulo}</span>
                <span className="text-xs text-slate-500">
                  máx. {max === 1 && total === 0 ? 0 : max} {semanal ? "por semana" : "por dia"}
                </span>
              </figcaption>
              <div className="flex h-28 items-end gap-0.5 border-b border-slate-300" role="img" aria-label={s.rotulo}>
                {pontos.map((p) => {
                  const v = p[s.chave];
                  return (
                    <div
                      key={p.dia}
                      className="group relative flex h-full min-w-0 flex-1 items-end"
                      title={`${rotuloPonto(p)}: ${v}`}
                    >
                      <div
                        className={`w-full rounded-t-[3px] ${v ? "bg-marca-500 group-hover:bg-marca-700" : "bg-transparent"}`}
                        style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums">
                <span>{curto(pontos[0].dia)}</span>
                {pontos.length > 2 && <span>{curto(pontos[Math.floor(pontos.length / 2)].dia)}</span>}
                <span>{curto(pontos[pontos.length - 1].ate)}</span>
              </div>
            </figure>
          );
        })}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-marca-700">Ver em tabela</summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <thead className="sticky top-0 bg-white text-xs text-slate-500">
              <tr>
                <th className="py-1 pr-3 font-medium">{semanal ? "Semana" : "Dia"}</th>
                {SERIES.map((s) => (
                  <th key={s.chave} className="py-1 pr-3 text-right font-medium">
                    {s.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...pontos].reverse().map((p) => (
                <tr key={p.dia} className="border-t border-slate-100">
                  <td className="py-1 pr-3">{rotuloPonto(p)}</td>
                  {SERIES.map((s) => (
                    <td key={s.chave} className="py-1 pr-3 text-right">
                      {p[s.chave]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
