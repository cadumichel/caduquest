import type { Metadata } from "next";
import Link from "next/link";
import { BotaoLink, Cartao, Vazio } from "@/components/ui";
import { temporadaAtualDoAluno } from "@/lib/aluno-dados";
import { exigirAluno } from "@/lib/aluno-sessao";
import { diasAte, formatarData } from "@/lib/datas";
import { listarPaginas, type Situacao, type TopicoPlano } from "@/lib/plano-estudo";
import { planoDoAluno } from "@/lib/plano-estudo-dados";
import { errosParaRevisar } from "@/lib/revisao";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Plano de estudo" };

const ROTULO: Record<Situacao, { texto: string; classe: string; barra: string }> = {
  reforcar: { texto: "Comece por aqui", classe: "bg-red-100 text-red-800", barra: "bg-red-500" },
  rever: { texto: "Vale rever", classe: "bg-amber-100 text-amber-900", barra: "bg-amber-500" },
  dominado: { texto: "Você já sabe", classe: "bg-emerald-100 text-emerald-800", barra: "bg-emerald-500" },
};

/** O que rever para a prova, do tema mais fraco para o mais forte, com as páginas da apostila. */
export default async function PlanoDeEstudoPagina() {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const temporada = await temporadaAtualDoAluno(aluno.turmaId);
  if (!temporada) return <Vazio>Ainda não há temporada.</Vazio>;
  const [plano, erros] = await Promise.all([
    planoDoAluno(db, aluno.id, temporada.id),
    errosParaRevisar(db, aluno.id, aluno.turmaId),
  ]);
  const faltam = diasAte(temporada.data_prova);
  const paraEstudar = plano.capitulos.filter((c) => c.situacao !== "dominado");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/aluno" className="text-sm font-medium text-marca-700">
          ← Início
        </Link>
        <h1 className="text-2xl font-extrabold text-marca-900">🧭 Plano de estudo para a prova</h1>
        <p className="text-sm text-slate-600">
          {faltam > 1
            ? `Faltam ${faltam} dias: a prova é em ${formatarData(temporada.data_prova)}.`
            : faltam === 1
              ? "A prova é amanhã."
              : faltam === 0
                ? "A prova é hoje."
                : `A prova foi em ${formatarData(temporada.data_prova)}.`}{" "}
          Feito com as suas respostas nos desafios de {temporada.nome}.
        </p>
      </div>

      {plano.questoes === 0 ? (
        <Vazio>
          O plano aparece quando o primeiro desafio que você fez fechar e o gabarito sair. Até lá, faça os desafios
          abertos.
        </Vazio>
      ) : (
        <>
          <Cartao className="space-y-3">
            <p className="font-extrabold text-marca-900">
              {plano.erradas === 0
                ? "Você acertou tudo até aqui. Uma passada nos capítulos e pronto!"
                : paraEstudar.length
                  ? `Comece por ${paraEstudar[0].nome}: é onde você mais errou.`
                  : "Você está bem em todos os capítulos. Feche os erros que sobraram."}
            </p>
            {plano.paginas.length > 0 && (
              <p className="text-sm text-slate-700">
                📖 Páginas da apostila para reler: <strong>{listarPaginas(plano.paginas)}</strong>.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {erros.length > 0 && (
                <BotaoLink href="/aluno/revisao">
                  Treinar {erros.length === 1 ? "a questão que errei" : `as ${erros.length} questões que errei`}
                </BotaoLink>
              )}
              <BotaoLink href="/aluno#desafios-anteriores" variante="secundario">
                Refazer um desafio como treino
              </BotaoLink>
            </div>
          </Cartao>

          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-marca-900">Por capítulo</h2>
            {plano.capitulos.map((c) => (
              <Topico key={c.nome} topico={c} />
            ))}
          </section>

          {plano.habilidades.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-extrabold text-marca-900">Por tipo de habilidade</h2>
              {plano.habilidades.map((h) => (
                <Topico key={h.nome} topico={h} semPaginas />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Topico({ topico, semPaginas = false }: { topico: TopicoPlano; semPaginas?: boolean }) {
  const rotulo = ROTULO[topico.situacao];
  const pct = Math.round(topico.acerto * 100);
  return (
    <Cartao className="space-y-2 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{topico.nome}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${rotulo.classe}`}>{rotulo.texto}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100" role="img" aria-label={`${pct}% de acerto`}>
        <div className={`h-2.5 rounded-full ${rotulo.barra}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
      <p className="text-sm text-slate-600">
        {pct}% de acerto em {topico.questoes} {topico.questoes === 1 ? "questão" : "questões"}
        {topico.erradas > 0 && ` · ${topico.erradas} para rever`}
        {!semPaginas && topico.paginas.length > 0 && (
          <>
            {" "}
            · releia {topico.paginas.length === 1 ? "a página" : "as páginas"}{" "}
            <strong>{listarPaginas(topico.paginas)}</strong>
          </>
        )}
      </p>
    </Cartao>
  );
}
