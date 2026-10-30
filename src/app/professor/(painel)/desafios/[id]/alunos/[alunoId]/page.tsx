import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Gabarito } from "@/components/Gabarito";
import { Cartao, Etiqueta, Titulo, Vazio } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { formatarPontos } from "@/lib/pontos";
import { exigirProfessor } from "@/lib/professor";
import type { Conteudo, Resposta } from "@/lib/questoes/tipos";
import { rotuloResultado } from "@/lib/relatorio";
import { urlImagem, type Aluno, type Questao, type RespostaBanco, type Tentativa } from "@/lib/tipos-banco";

export const metadata: Metadata = { title: "Respostas do aluno" };

const segundos = (r: RespostaBanco) =>
  r.respondida_em ? Math.round((new Date(r.respondida_em).getTime() - new Date(r.servida_em).getTime()) / 1000) : null;

/** O que um aluno respondeu em cada questão de um desafio (só o professor vê). */
export default async function RespostasDoAluno({ params }: PageProps<"/professor/desafios/[id]/alunos/[alunoId]">) {
  const { id, alunoId } = await params;
  const { supabase } = await exigirProfessor();
  const [{ data: desafio }, { data: alunoBruto }, { data: tentativaBruta }] = await Promise.all([
    supabase
      .from("desafios")
      .select("id, titulo, tipo, desafio_questoes(posicao, questoes(*))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("alunos").select("id, apelido, nome_real, avatar, cor").eq("id", alunoId).maybeSingle(),
    supabase.from("tentativas").select("*").eq("desafio_id", id).eq("aluno_id", alunoId).maybeSingle(),
  ]);
  if (!desafio || !alunoBruto) notFound();
  const aluno = alunoBruto as Pick<Aluno, "id" | "apelido" | "nome_real" | "avatar" | "cor">;
  const tentativa = tentativaBruta as Tentativa | null;
  const questoes = [...(desafio.desafio_questoes as unknown as { posicao: number; questoes: Questao }[])]
    .sort((a, b) => a.posicao - b.posicao)
    .map((dq) => dq.questoes);

  const { data: respostasBrutas } = tentativa
    ? await supabase.from("respostas").select("*").eq("tentativa_id", tentativa.id)
    : { data: [] };
  const respostas = new Map(((respostasBrutas ?? []) as RespostaBanco[]).map((r) => [r.questao_id, r]));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/professor/desafios/${id}`} className="text-sm text-marca-700">
          ← {desafio.tipo === "relampago" && "⚡ "}
          {desafio.titulo}
        </Link>
        <Titulo>
          <span className="flex items-center gap-3">
            <Avatar avatar={aluno.avatar} cor={aluno.cor} tamanho={40} />
            <span>
              {aluno.apelido}
              {aluno.nome_real && <span className="text-base font-normal text-slate-500"> · {aluno.nome_real}</span>}
            </span>
          </span>
        </Titulo>
        <p className="text-sm">
          <Link href={`/professor/alunos/${aluno.id}`} className="text-marca-700">
            Ver perfil do aluno →
          </Link>
        </p>
      </div>

      {!tentativa ? (
        <Vazio>Este aluno não fez o desafio.</Vazio>
      ) : (
        <>
          <Cartao className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <strong>{formatarPontos(tentativa.pontos)}</strong> pontos
            </span>
            <span>Começou {formatarDataHora(tentativa.iniciada_em)}</span>
            <span>
              {tentativa.concluida_em ? `Terminou ${formatarDataHora(tentativa.concluida_em)}` : "Não terminou"}
            </span>
          </Cartao>
          <section className="space-y-3">
            {questoes.map((q, i) => {
              const r = respostas.get(q.id);
              const fracao = r?.fracao === null || r?.fracao === undefined ? null : Number(r.fracao);
              const tempo = r ? segundos(r) : null;
              return (
                <Cartao key={q.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/professor/questoes/${q.id}`} className="font-medium hover:text-marca-700">
                      {i + 1}. {q.enunciado}
                    </Link>
                    <Etiqueta
                      cor={!r || fracao === null ? "cinza" : fracao >= 1 ? "verde" : fracao > 0 ? "ambar" : "vermelho"}
                    >
                      {rotuloResultado(r && { fracao, esgotada: r.tempo_esgotado, zerada: r.zerada_por_saida })}
                    </Etiqueta>
                  </div>
                  {r && (
                    <p className="text-xs text-slate-500">
                      {tempo !== null && `Respondeu em ${tempo} s`}
                      {r.saidas_tela > 0 && ` · saiu da tela ${r.saidas_tela}×`}
                      {r.pontos !== null && ` · ${formatarPontos(r.pontos)} pts`}
                    </p>
                  )}
                  {q.imagem_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urlImagem(q.imagem_path)!}
                      alt=""
                      className="max-h-48 rounded-lg border border-slate-200"
                    />
                  )}
                  <Gabarito
                    conteudo={{ tipo: q.tipo, conteudo: q.conteudo } as Conteudo}
                    permutacao={r?.permutacao}
                    resposta={(r?.resposta as Resposta | null) ?? null}
                    doProfessor
                  />
                </Cartao>
              );
            })}
          </section>
          <p className="text-xs text-slate-500">
            Questões na ordem do desafio. O aluno viu as questões e as alternativas embaralhadas; a resposta já aparece
            traduzida para a ordem original.
          </p>
        </>
      )}
    </div>
  );
}
