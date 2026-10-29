import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { medalhasDaTurmaDoAluno } from "@/lib/aluno-dados";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasNecessarias, nivelNecessario, ORDEM_BASICOS, ORDEM_ESPECIAIS, PERSONAGENS } from "@/lib/personagens";
import { progressoDoAluno } from "@/lib/progresso-dados";
import { CURIOSIDADE_PERSONAGEM } from "@/lib/personagens-curiosidades";

export const metadata: Metadata = { title: "Álbum de personagens" };

/** Álbum da coleção: todos os personagens, com os especiais bloqueados em cinza e uma curiosidade em cada. */
export default async function Colecao() {
  const aluno = await exigirAluno();
  const [medalhasTurma, { nivel }] = await Promise.all([
    medalhasDaTurmaDoAluno(aluno.turmaId),
    progressoDoAluno(aluno.id, aluno.turmaId),
  ]);
  const medalhas = medalhasTurma.get(aluno.id) ?? 0;
  const liberados = Math.min(medalhas, ORDEM_ESPECIAIS.length);
  const basicos = ORDEM_BASICOS.filter((i) => nivelNecessario(i) <= nivel || i === aluno.avatar).length;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-marca-600 via-marca-800 to-marca-950 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-extrabold">📖 Álbum de personagens</h1>
        <p className="mt-1 text-sm text-marca-100">
          {basicos + liberados} de {PERSONAGENS.length} na sua coleção. Cada nível novo libera 2 personagens, e cada
          desafio vencido libera um lendário. Toque num personagem para ler a curiosidade.
        </p>
      </section>

      <Grupo titulo={`✦ Lendários (${liberados} de ${ORDEM_ESPECIAIS.length})`} lendario>
        {ORDEM_ESPECIAIS.map((i) => {
          const n = medalhasNecessarias(i);
          return (
            <Figurinha
              key={i}
              indice={i}
              cor={aluno.cor}
              bloqueio={
                n > medalhas
                  ? `Vença ${n} ${n === 1 ? "desafio" : "desafios"} para liberar este lendário e a curiosidade dele.`
                  : null
              }
              lendario
            />
          );
        })}
      </Grupo>
      <Grupo titulo={`Personagens (${basicos} de ${ORDEM_BASICOS.length})`}>
        {ORDEM_BASICOS.map((i) => (
          <Figurinha
            key={i}
            indice={i}
            cor={aluno.cor}
            bloqueio={
              nivelNecessario(i) > nivel && i !== aluno.avatar
                ? `Chegue ao nível ${nivelNecessario(i)} para liberar este personagem e a curiosidade dele.`
                : null
            }
          />
        ))}
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, lendario, children }: { titulo: string; lendario?: boolean; children: React.ReactNode }) {
  return (
    <section
      className={
        lendario
          ? "rounded-3xl bg-gradient-to-br from-marca-950 via-marca-900 to-amber-900 p-4 shadow-lg ring-1 ring-amber-300/50"
          : "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <h2 className={`mb-3 font-extrabold ${lendario ? "text-amber-300" : "text-marca-900"}`}>{titulo}</h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">{children}</ul>
    </section>
  );
}

function Figurinha({
  indice,
  cor,
  bloqueio,
  lendario = false,
}: {
  indice: number;
  cor: number;
  bloqueio: string | null;
  lendario?: boolean;
}) {
  const p = PERSONAGENS[indice];
  const bloqueado = bloqueio !== null;
  return (
    <li>
      <details
        className={`rounded-2xl p-2 text-center ${
          lendario
            ? "bg-white/10 text-white open:bg-white/15 open:ring-1 open:ring-amber-300"
            : "bg-slate-50 open:bg-amber-50 open:ring-1 open:ring-amber-200"
        }`}
      >
        <summary className="flex cursor-pointer list-none flex-col items-center gap-1 pt-1">
          <span className="relative">
            <Avatar
              avatar={indice}
              cor={cor}
              tamanho={64}
              className={bloqueado ? (lendario ? "brightness-[0.35]" : "opacity-40 grayscale") : ""}
            />
            {bloqueado && <span className="absolute inset-0 flex items-center justify-center text-xl">🔒</span>}
          </span>
          <span className="text-xs leading-tight font-bold">{bloqueado ? "???" : p.nome}</span>
          <span className={`text-[10px] leading-tight ${lendario ? "text-amber-200" : "text-slate-500"}`}>
            {p.epoca}
          </span>
        </summary>
        <p className={`mt-2 text-left text-[11px] leading-snug ${lendario ? "text-amber-50" : "text-slate-700"}`}>
          {bloqueio ?? CURIOSIDADE_PERSONAGEM[p.nome]}
        </p>
      </details>
    </li>
  );
}
