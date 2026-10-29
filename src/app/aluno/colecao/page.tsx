import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { medalhasDaTurmaDoAluno } from "@/lib/aluno-dados";
import { exigirAluno } from "@/lib/aluno-sessao";
import { BASICOS, medalhasNecessarias, ORDEM_ESPECIAIS, PERSONAGENS } from "@/lib/personagens";
import { CURIOSIDADE_PERSONAGEM } from "@/lib/personagens-curiosidades";

export const metadata: Metadata = { title: "Álbum de personagens" };

/** Álbum da coleção: todos os personagens, com os especiais bloqueados em cinza e uma curiosidade em cada. */
export default async function Colecao() {
  const aluno = await exigirAluno();
  const medalhas = (await medalhasDaTurmaDoAluno(aluno.turmaId)).get(aluno.id) ?? 0;
  const liberados = Math.min(medalhas, ORDEM_ESPECIAIS.length);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-marca-600 via-marca-800 to-marca-950 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-extrabold">📖 Álbum de personagens</h1>
        <p className="mt-1 text-sm text-marca-100">
          {BASICOS.length + liberados} de {PERSONAGENS.length} na sua coleção. Cada desafio vencido libera um especial.
          Toque num personagem para ler a curiosidade.
        </p>
      </section>

      <Grupo titulo={`Especiais (${liberados} de ${ORDEM_ESPECIAIS.length})`}>
        {ORDEM_ESPECIAIS.map((i) => (
          <Figurinha key={i} indice={i} cor={aluno.cor} bloqueado={medalhasNecessarias(i) > medalhas} />
        ))}
      </Grupo>
      <Grupo titulo={`Personagens (${BASICOS.length})`}>
        {BASICOS.map((i) => (
          <Figurinha key={i} indice={i} cor={aluno.cor} bloqueado={false} />
        ))}
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-extrabold text-marca-900">{titulo}</h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">{children}</ul>
    </section>
  );
}

function Figurinha({ indice, cor, bloqueado }: { indice: number; cor: number; bloqueado: boolean }) {
  const p = PERSONAGENS[indice];
  const precisa = medalhasNecessarias(indice);
  return (
    <li>
      <details className="rounded-2xl bg-slate-50 p-2 text-center open:bg-amber-50 open:ring-1 open:ring-amber-200">
        <summary className="flex cursor-pointer list-none flex-col items-center gap-1">
          <span className="relative">
            <Avatar avatar={indice} cor={cor} tamanho={64} className={bloqueado ? "opacity-40 grayscale" : ""} />
            {bloqueado && <span className="absolute inset-0 flex items-center justify-center text-xl">🔒</span>}
          </span>
          <span className="text-xs leading-tight font-bold">{bloqueado ? "???" : p.nome}</span>
          <span className="text-[10px] leading-tight text-slate-500">{p.epoca}</span>
        </summary>
        <p className="mt-2 text-left text-[11px] leading-snug text-slate-700">
          {bloqueado
            ? `Vença ${precisa} ${precisa === 1 ? "desafio" : "desafios"} para liberar este personagem e a curiosidade dele.`
            : CURIOSIDADE_PERSONAGEM[p.nome]}
        </p>
      </details>
    </li>
  );
}
