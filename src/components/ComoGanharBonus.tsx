import { BONUS_DESAFIO, BONUS_MAXIMO, BONUS_SEQUENCIA } from "@/lib/constancia";
import { BONUS_META, META_PARTICIPACAO } from "@/lib/ligas";

/** Quanto vale o n-ésimo desafio seguido da ofensiva (1, 2, 3...). */
function bonusDoPasso(n: number) {
  return Math.min(BONUS_DESAFIO + BONUS_SEQUENCIA * (n - 1), BONUS_MAXIMO);
}

/** Primeiro passo da ofensiva que já vale o bônus máximo. */
const PASSO_MAXIMO = Math.ceil((BONUS_MAXIMO - BONUS_DESAFIO) / BONUS_SEQUENCIA) + 1;

/** Explica ao aluno, em um só lugar, como os pontos e os bônus são contados. */
export function ComoGanharBonus({ aberto = false, comLiga = true }: { aberto?: boolean; comLiga?: boolean }) {
  const passos = Array.from({ length: PASSO_MAXIMO }, (_, i) => i + 1);
  return (
    <details open={aberto} className="group rounded-3xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-extrabold text-marca-900">
        <span>ℹ️ Como funcionam os pontos e os bônus</span>
        <span className="text-sm text-sky-700 group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3 space-y-4 text-sm text-slate-700">
        <div>
          <p className="font-bold text-marca-900">🎯 Pontos das questões</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              Cada questão certa vale os pontos que aparecem na tela de início do desafio (normalmente 10). Desafios
              especiais valem mais.
            </li>
            <li>Nas questões com vários itens (ligar, ordenar, V ou F), acertar só uma parte vale parte dos pontos.</li>
            <li>Questão errada, sem resposta ou zerada vale 0.</li>
            <li>Só a primeira vez que você faz o desafio conta. Refazer como treino não dá pontos.</li>
          </ul>
        </div>
        <div>
          <p className="font-bold text-marca-900">🔥 Ofensiva: faça os desafios da semana sem pular nenhum</p>
          <p>
            Cada desafio semanal que você termina antes de ele fechar dá bônus. Quanto mais desafios seguidos, maior o
            bônus:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {passos.map((n) => (
              <span key={n} className="rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-sky-200">
                {n}º{n === PASSO_MAXIMO ? " em diante" : ""}: <b>+{bonusDoPasso(n)}</b>
              </span>
            ))}
          </div>
          <p className="mt-2">
            Se um desafio fechar sem você terminar, a sequência volta para o 1º (+{BONUS_DESAFIO}), mas você não perde o
            bônus que já ganhou. O CaduRush (em sala) não conta para a ofensiva.
          </p>
        </div>
        <div>
          <p className="font-bold text-marca-900">🤝 Meta da turma: todo mundo ganha junto</p>
          <p>
            Se {Math.round(META_PARTICIPACAO * 100)}% da turma terminar todos os desafios semanais da semana, todos os
            alunos ganham +{BONUS_META} pontos, inclusive quem não fez. Vale uma vez por semana.
          </p>
        </div>
        <div>
          <p className="font-bold text-marca-900">⚡ Bônus por rapidez: só em alguns desafios</p>
          <p>
            Quando o desafio avisa “Bônus por rapidez” antes de começar, cada questão certa vale até 50% a mais se você
            responder rápido.
          </p>
        </div>
        <p className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-sky-200">
          <b>Onde o bônus aparece:</b> o da ofensiva e o da meta da turma entram só no <b>ranking geral</b>.
          {comLiga && (
            <>
              {" "}
              A <b>liga da semana</b> conta só os pontos das questões desta semana (com a rapidez, que faz parte da
              questão). Por isso os dois números podem ser diferentes.
            </>
          )}
        </p>
      </div>
    </details>
  );
}
