import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gabarito } from "@/components/Gabarito";
import { Aviso, BotaoLink, Cartao, Etiqueta } from "@/components/ui";
import { exigirAluno } from "@/lib/aluno-sessao";
import { formatarDataHora } from "@/lib/datas";
import { desafioDoAluno } from "@/lib/jogo";
import type { Conteudo, Resposta } from "@/lib/questoes/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { situacaoDesafio, urlImagem, type Questao, type RespostaBanco, type Tentativa } from "@/lib/tipos-banco";

export const metadata: Metadata = { title: "Resultado" };

export default async function Resultado({ params }: PageProps<"/aluno/desafio/[id]/resultado">) {
  const { id } = await params;
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const desafio = await desafioDoAluno(db, aluno, id);
  if (!desafio) notFound();

  const { data } = await db.from("tentativas").select("*").eq("desafio_id", id).eq("aluno_id", aluno.id).maybeSingle();
  const tentativa = data as Tentativa | null;
  const encerrado = situacaoDesafio(desafio) === "encerrado";

  if (!tentativa) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{desafio.titulo}</h1>
        <Aviso tipo="info">Você não fez este desafio.</Aviso>
        {encerrado && (
          <BotaoLink href={`/aluno/desafio/${id}/treino`}>🏋️ Fazer como treino (não vale ranking)</BotaoLink>
        )}
        <BotaoLink href="/aluno" variante="secundario">
          Voltar ao início
        </BotaoLink>
      </div>
    );
  }

  const { data: respostasBrutas } = await db
    .from("respostas")
    .select("*")
    .eq("tentativa_id", tentativa.id)
    .order("posicao");
  const respostas = (respostasBrutas ?? []) as RespostaBanco[];
  const respondidas = respostas.filter((r) => r.fracao !== null);
  const acertos = respondidas.reduce((s, r) => s + Number(r.fracao), 0);
  const total = tentativa.ordem.length;

  let questoes = new Map<string, Questao>();
  if (encerrado) {
    const { data: qs } = await db.from("questoes").select("*").in("id", tentativa.ordem);
    questoes = new Map(((qs ?? []) as Questao[]).map((q) => [q.id, q]));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Resultado</p>
        <h1 className="text-2xl font-bold">{desafio.titulo}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <Cartao>
          <p className="text-3xl font-extrabold text-marca-700">{Number(tentativa.pontos)}</p>
          <p className="text-sm text-slate-500">pontos</p>
        </Cartao>
        <Cartao>
          <p className="text-3xl font-extrabold">
            {Math.round(acertos * 10) / 10}
            <span className="text-lg text-slate-400">/{total}</span>
          </p>
          <p className="text-sm text-slate-500">acertos</p>
        </Cartao>
      </div>

      {!encerrado ? (
        <Aviso tipo="info">
          O gabarito e as explicações aparecem quando o desafio fechar, em {formatarDataHora(desafio.fecha_em)}. Assim
          ninguém passa as respostas enquanto ele está aberto.
        </Aviso>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Gabarito comentado</h2>
          {tentativa.ordem.map((qid, i) => {
            const q = questoes.get(qid);
            const r = respostas.find((x) => x.questao_id === qid);
            if (!q) return null;
            const fracao = r?.fracao === null || r?.fracao === undefined ? null : Number(r.fracao);
            return (
              <Cartao key={qid} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    {i + 1}. {q.enunciado}
                  </p>
                  {r?.tempo_esgotado ? (
                    <Etiqueta cor="ambar">Tempo esgotado</Etiqueta>
                  ) : fracao === null ? (
                    <Etiqueta>Sem resposta</Etiqueta>
                  ) : fracao === 1 ? (
                    <Etiqueta cor="verde">Acertou</Etiqueta>
                  ) : fracao > 0 ? (
                    <Etiqueta cor="ambar">{Math.round(fracao * 100)}%</Etiqueta>
                  ) : (
                    <Etiqueta cor="vermelho">Errou</Etiqueta>
                  )}
                </div>
                {q.imagem_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagem(q.imagem_path)!} alt="" className="max-h-48 rounded-lg border border-slate-200" />
                )}
                <Gabarito
                  conteudo={{ tipo: q.tipo, conteudo: q.conteudo } as Conteudo}
                  permutacao={r?.permutacao}
                  resposta={(r?.resposta as Resposta | null) ?? null}
                />
                {q.explicacao && (
                  <p className="rounded-lg bg-marca-50 px-3 py-2 text-sm whitespace-pre-line text-marca-900">
                    💡 {q.explicacao}
                  </p>
                )}
              </Cartao>
            );
          })}
        </section>
      )}
      {(encerrado || tentativa.concluida_em || tentativa.indice_atual >= total) && (
        <div className="space-y-2">
          <BotaoLink href={`/aluno/desafio/${id}/treino`}>🏋️ Refazer como treino</BotaoLink>
          <p className="text-center text-xs text-slate-500">
            O treino mostra a sua nota, mas o ranking e o XP contam só a primeira tentativa.
          </p>
        </div>
      )}
      <BotaoLink href="/aluno" variante="secundario">
        Voltar ao início
      </BotaoLink>
    </div>
  );
}
