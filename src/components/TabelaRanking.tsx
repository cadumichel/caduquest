import type { LinhaRanking } from "@/lib/ranking";
import { Vazio } from "./ui";

/** Ranking completo (só o professor vê todas as posições). */
export function TabelaRanking({ ranking, nomes }: { ranking: LinhaRanking[]; nomes?: Map<string, string | null> }) {
  if (!ranking.length) return <Vazio>Sem alunos ainda.</Vazio>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-slate-500">
        <tr>
          <th className="py-2 pr-2">#</th>
          <th className="py-2 pr-2">Apelido</th>
          <th className="py-2 pr-2 text-right">Pontos</th>
          <th className="py-2 text-right">Acerto</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {ranking.map((l) => (
          <tr key={l.alunoId}>
            <td className="py-1.5 pr-2 font-semibold">{l.posicao}º</td>
            <td className="py-1.5 pr-2">
              {l.apelido}
              {nomes?.get(l.alunoId) && <span className="text-slate-500"> · {nomes.get(l.alunoId)}</span>}
            </td>
            <td className="py-1.5 pr-2 text-right tabular-nums">{l.pontos}</td>
            <td className="py-1.5 text-right tabular-nums">{l.questoes ? `${Math.round(l.acerto * 100)}%` : "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
