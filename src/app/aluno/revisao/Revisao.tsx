"use client";
import { useEffect, useState, useTransition } from "react";
import { Gabarito } from "@/components/Gabarito";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import { respostaCompleta, respostaInicial } from "@/lib/questoes/apresentacao";
import type { Resposta } from "@/lib/questoes/tipos";
import { proximaRevisao, responderRevisao, type CorrecaoRevisao, type QuestaoRevisao } from "../actions";

type Atual = { questao: QuestaoRevisao; posicao: number; total: number };

/** Rodada curta (até 5) com as questões que o aluno errou, com o gabarito logo após cada resposta. */
export function Revisao({ pendentes }: { pendentes: number }) {
  const [atual, setAtual] = useState<Atual | null>(null);
  const [fim, setFim] = useState(false);
  const [feitas, setFeitas] = useState<string[]>([]);
  const [acertos, setAcertos] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [correcao, setCorrecao] = useState<CorrecaoRevisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const carregar = (lista: string[]) =>
    iniciar(async () => {
      setErro(null);
      try {
        const prox = await proximaRevisao(lista);
        setCorrecao(null);
        if (!prox) {
          setFim(true);
          setAtual(null);
          return;
        }
        setAtual(prox);
        setResposta(respostaInicial(prox.questao.vista));
      } catch {
        setErro("Falha de conexão. Tente de novo.");
      }
    });

  useEffect(() => {
    carregar([]);
  }, []);

  if (fim) {
    return (
      <div className="space-y-5 py-8 text-center">
        <p className="text-6xl">📚</p>
        <h1 className="text-2xl font-bold">Revisão concluída!</h1>
        <p className="text-slate-600">
          Você acertou {acertos} de {feitas.length}. As que você acertou saem da sua lista de revisão.
        </p>
        <div className="flex flex-col gap-3">
          {pendentes - acertos > 0 && (
            <Botao
              onClick={() => {
                setFeitas([]);
                setAcertos(0);
                setFim(false);
                carregar([]);
              }}
            >
              Fazer outra rodada
            </Botao>
          )}
          <BotaoLink href="/aluno" variante="secundario">
            Voltar ao início
          </BotaoLink>
        </div>
      </div>
    );
  }

  if (!atual || !resposta) {
    return erro ? <Aviso>{erro}</Aviso> : <p className="py-10 text-center text-slate-500">Carregando…</p>;
  }

  const { questao, posicao, total } = atual;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span className="font-bold text-marca-900">📚 Revisão de erros</span>
        <span>
          {posicao} de {total}
        </span>
      </div>
      {questao.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={questao.imagemUrl} alt="" className="mx-auto max-h-80 w-auto rounded-xl border border-slate-200" />
      )}
      <p className="whitespace-pre-line text-lg font-medium">{questao.enunciado}</p>

      {correcao ? (
        <div className="space-y-3">
          <Aviso tipo={correcao.fracao === 1 ? "ok" : "info"}>
            {correcao.fracao === 1
              ? "✅ Acertou! Esta questão sai da sua revisão."
              : correcao.fracao > 0
                ? `Quase: ${Math.round(correcao.fracao * 100)}% certo. Veja o gabarito.`
                : "❌ Ainda não. Veja o gabarito e tente de novo numa próxima rodada."}
          </Aviso>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Gabarito conteudo={correcao.conteudo} permutacao={questao.permutacao} resposta={resposta} />
          </div>
          {correcao.explicacao && (
            <p className="rounded-lg bg-marca-50 px-3 py-2 text-sm text-marca-900">💡 {correcao.explicacao}</p>
          )}
          <Botao className="w-full py-4 text-base" disabled={pendente} onClick={() => carregar(feitas)}>
            {pendente ? "Carregando…" : posicao < total ? "Próxima" : "Ver resultado"}
          </Botao>
        </div>
      ) : (
        <>
          <QuestaoInterativa vista={questao.vista} resposta={resposta} onChange={setResposta} desabilitada={pendente} />
          {erro && <Aviso>{erro}</Aviso>}
          <Botao
            variante="sucesso"
            className="w-full py-4 text-base"
            disabled={pendente || !respostaCompleta(resposta)}
            onClick={() =>
              iniciar(async () => {
                setErro(null);
                try {
                  const r = await responderRevisao(questao.id, questao.permutacao, resposta);
                  if ("erro" in r) {
                    setErro(r.erro);
                    return;
                  }
                  setCorrecao(r);
                  setFeitas((f) => [...f, questao.id]);
                  if (r.fracao === 1) setAcertos((a) => a + 1);
                } catch {
                  setErro("Falha de conexão. Tente de novo.");
                }
              })
            }
          >
            {pendente ? "Corrigindo…" : "Confirmar resposta"}
          </Botao>
        </>
      )}
    </div>
  );
}
