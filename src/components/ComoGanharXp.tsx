import {
  BASICOS_POR_DESAFIO,
  BASICOS_POR_DESAFIO_BOM,
  INICIAIS,
  ORDEM_BASICOS,
  ORDEM_ESPECIAIS,
} from "@/lib/personagens";
import { BONUS_REVISAO, LIMITE_REVISAO_DIA } from "@/lib/revisao-bonus";
import { XP_POR_ACERTO, XP_POR_DESAFIO, XP_POR_QUESTAO, XP_POR_REVISAO, xpDoNivel } from "@/lib/progresso";

/** Explica ao aluno como ganhar XP, subir de nível e liberar personagens. */
export function ComoGanharXp() {
  const niveis = [2, 3, 4, 5, 6];
  return (
    <details className="group rounded-3xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-extrabold text-marca-900">
        <span>ℹ️ Como ganhar XP e personagens</span>
        <span className="text-sm text-sky-700 group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3 space-y-4 text-sm text-slate-700">
        <div>
          <p className="font-bold text-marca-900">⭐ XP: vem de tudo o que você faz</p>
          <ul className="mt-1 space-y-0.5">
            <li>+{XP_POR_QUESTAO} XP por questão respondida</li>
            <li>+{XP_POR_ACERTO} XP por questão certa (acerto parcial vale parte)</li>
            <li>+{XP_POR_DESAFIO} XP por desafio terminado</li>
            <li>
              +{XP_POR_REVISAO} XP por questão que você acerta na revisão dos erros (e ainda +{BONUS_REVISAO} pts de
              bônus no ranking, até {LIMITE_REVISAO_DIA} por dia)
            </li>
          </ul>
          <p className="mt-1">
            Exemplo: um desafio de 10 questões com 7 certas dá{" "}
            <b>{10 * XP_POR_QUESTAO + 7 * XP_POR_ACERTO + XP_POR_DESAFIO} XP</b>.
          </p>
        </div>
        <div>
          <p className="font-bold text-marca-900">📈 Níveis: o XP total que você precisa</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {niveis.map((n) => (
              <span key={n} className="rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-sky-200">
                Nível {n}: <b>{xpDoNivel(n)} XP</b>
              </span>
            ))}
            <span className="rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-sky-200">e assim por diante</span>
          </div>
        </div>
        <div>
          <p className="font-bold text-marca-900">🧑‍🎓 Personagens: termine desafios</p>
          <p>
            Você começa com {INICIAIS.length} personagens. Cada desafio que você termina libera mais{" "}
            {BASICOS_POR_DESAFIO_BOM} se você acertar mais da metade das questões, ou {BASICOS_POR_DESAFIO} se acertar
            metade ou menos. São {ORDEM_BASICOS.length} ao todo.
          </p>
        </div>
        <div>
          <p className="font-bold text-marca-900">✦ Lendários: complete temporadas</p>
          <p>
            Faça todos os desafios de uma temporada com pelo menos 50% de acerto e ganhe um lendário quando ela encerrar
            (abaixo de 50%, você ganha um personagem comum). O CaduRush em sala não entra nessa conta.
          </p>
          <p className="mt-1">
            Fazer a maior pontuação da turma em um desafio também dá uma medalha 🏅 e um lendário (se empatar no topo,
            todos os empatados ganham). Os personagens novos são sorteados: quando aparecer o aviso 🎁, toque nele para
            revelar quem você ganhou. Os lendários são {ORDEM_ESPECIAIS.length} ao todo.
          </p>
        </div>
      </div>
    </details>
  );
}
