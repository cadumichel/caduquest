import type { LinhaRanking } from "@/lib/ranking";
import { Avatar } from "./Avatar";
import { Vazio } from "./ui";
import { formatarPontos } from "@/lib/pontos";

/** Ranking completo (só o professor vê todas as posições). */
export function TabelaRanking({
  ranking,
  nomes,
  medalhas,
}: {
  ranking: LinhaRanking[];
  nomes?: Map<string, string | null>;
  medalhas?: Map<string, number>;
}) {
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
            <td className="flex items-center gap-2 py-1.5 pr-2">
              <Avatar avatar={l.avatar} cor={l.cor} medalhas={medalhas?.get(l.alunoId) ?? 0} tamanho={26} />
              {l.apelido}
              {nomes?.get(l.alunoId) && <span className="text-slate-500"> · {nomes.get(l.alunoId)}</span>}
            </td>
            <td className="py-1.5 pr-2 text-right tabular-nums">{formatarPontos(l.pontos)}</td>
            <td className="py-1.5 text-right tabular-nums">{l.questoes ? `${Math.round(l.acerto * 100)}%` : "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
