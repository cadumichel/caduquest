import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Gabarito } from "@/components/Gabarito";
import { Aviso, BotaoLink, Cartao, Etiqueta } from "@/components/ui";
import { formatarPontos } from "@/lib/pontos";
import { partidaDoJogador, type RespostaPublica } from "@/lib/publico/jogo";
import { rankingPublico } from "@/lib/publico/ranking";
import { eraPorId, PONTUACAO_MAXIMA } from "@/lib/publico/regras";
import { exigirJogador } from "@/lib/publico/sessao";
import type { Conteudo } from "@/lib/questoes/tipos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { urlImagem, type Questao } from "@/lib/tipos-banco";
import type { MotivoZerada } from "@/lib/tela-protegida";
import { BotaoJogar } from "../../../BotaoJogar";

export const metadata: Metadata = { title: "Resultado" };

// Genérico em "tela_alterada": ninguém deve saber que extensões são detectadas.
const MOTIVO: Record<MotivoZerada, string> = {
  saida: "você saiu da tela na rodada final.",
  teclado: "uma tecla foi apertada na rodada final.",
  tela_alterada: "as regras da rodada final não foram seguidas.",
  clique_fora: "houve um clique fora das alternativas na rodada final.",
};

export default async function ResultadoPublico({ params }: PageProps<"/jogar/partida/[id]/resultado">) {
  const { id } = await params;
  const jogador = await exigirJogador();
  const db = criarClienteAdmin();
  const partida = await partidaDoJogador(db, jogador.id, id);
  if (!partida) notFound();
  if (!partida.concluida_em) redirect(`/jogar/partida/${id}`);
  const era = eraPorId(partida.era);

  const [{ data: rs }, { data: qs }, ranking] = await Promise.all([
    db.from("respostas_publicas").select("*").eq("partida_id", id).order("posicao"),
    db.from("questoes").select("*").in("id", partida.ordem),
    partida.vale_ranking ? rankingPublico(db, partida.era) : Promise.resolve([]),
  ]);
  const respostas = (rs ?? []) as RespostaPublica[];
  const questoes = new Map(((qs ?? []) as Questao[]).map((q) => [q.id, q]));
  const acertos = respostas.reduce((s, r) => s + Number(r.fracao ?? 0), 0);
  const eu = ranking.find((l) => l.jogadorId === jogador.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Resultado {partida.vale_ranking ? "· vale ranking" : "· treino"}</p>
        <h1 className="text-2xl font-bold">{era ? `${era.emoji} ${era.nome}` : "Desafio"}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Cartao className="p-3">
          <p className="text-2xl font-extrabold text-marca-700">{formatarPontos(partida.pontos)}</p>
          <p className="text-xs text-slate-500">de {PONTUACAO_MAXIMA} pontos</p>
        </Cartao>
        <Cartao className="p-3">
          <p className="text-2xl font-extrabold">
            {formatarPontos(acertos)}
            <span className="text-base text-slate-400">/{partida.ordem.length}</span>
          </p>
          <p className="text-xs text-slate-500">acertos</p>
        </Cartao>
        <Cartao className="p-3">
          <p className="text-2xl font-extrabold">{eu ? `${eu.posicao}º` : "–"}</p>
          <p className="text-xs text-slate-500">{eu ? `de ${ranking.length} na era` : "treino"}</p>
        </Cartao>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Gabarito comentado</h2>
        {partida.ordem.map((qid, i) => {
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
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {r?.tempo_esgotado ? (
                    <Etiqueta cor="ambar">Tempo esgotado</Etiqueta>
                  ) : r?.motivo_zerada ? (
                    <Etiqueta cor="vermelho">Zerada</Etiqueta>
                  ) : fracao === null ? (
                    <Etiqueta>Sem resposta</Etiqueta>
                  ) : fracao === 1 ? (
                    <Etiqueta cor="verde">Acertou</Etiqueta>
                  ) : fracao > 0 ? (
                    <Etiqueta cor="ambar">{Math.round(fracao * 100)}%</Etiqueta>
                  ) : (
                    <Etiqueta cor="vermelho">Errou</Etiqueta>
                  )}
                  <span className="text-xs text-slate-500">
                    {r?.final ? "🔥 " : ""}+{formatarPontos(r?.pontos ?? 0)}
                  </span>
                </div>
              </div>
              {r?.motivo_zerada && <Aviso>Valeu zero: {MOTIVO[r.motivo_zerada]}</Aviso>}
              {q.imagem_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urlImagem(q.imagem_path)!} alt="" className="max-h-48 rounded-lg border border-slate-200" />
              )}
              <Gabarito
                conteudo={{ tipo: q.tipo, conteudo: q.conteudo } as Conteudo}
                permutacao={r?.permutacao}
                resposta={r?.resposta ?? null}
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

      <div className="space-y-2">
        <BotaoJogar era={partida.era}>🏋️ Jogar de novo (treino)</BotaoJogar>
        <p className="text-center text-xs text-slate-500">
          O treino sorteia outras questões e mostra a sua nota, mas o ranking conta só a primeira partida.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <BotaoLink href={`/jogar/ranking?era=${partida.era}`} variante="secundario">
          🏆 Ranking
        </BotaoLink>
        <BotaoLink href="/jogar" variante="secundario">
          Outros desafios
        </BotaoLink>
      </div>
    </div>
  );
}
