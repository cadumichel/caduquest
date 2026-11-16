"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Gabarito } from "@/components/Gabarito";
import { PalcoQuestao, useModoFoco } from "@/components/PalcoQuestao";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import { respostaCompleta, respostaInicial } from "@/lib/questoes/apresentacao";
import { XP_POR_REVISAO } from "@/lib/progresso";
import { LIMITE_REVISAO_DIA } from "@/lib/revisao-bonus";
import type { Resposta } from "@/lib/questoes/tipos";
import { proximaRevisao, responderRevisao, type CorrecaoRevisao, type QuestaoRevisao } from "../actions";

type Atual = { questao: QuestaoRevisao; posicao: number; total: number };

/** Rodada curta (até 5) com as questões que o aluno errou, com o gabarito logo após cada resposta. */
export function Revisao({ pendentes }: { pendentes: number }) {
  const [atual, setAtual] = useState<Atual | null>(null);
  const [fim, setFim] = useState(false);
  const [feitas, setFeitas] = useState<string[]>([]);
  const [acertos, setAcertos] = useState(0);
  const [bonusRodada, setBonusRodada] = useState(0);
  const [zerou, setZerou] = useState(false);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [correcao, setCorrecao] = useState<CorrecaoRevisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  useModoFoco(Boolean(atual && resposta && !fim));

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
        {(acertos > 0 || bonusRodada > 0) && (
          <p className="font-bold text-marca-900">
            +{acertos * XP_POR_REVISAO} XP{bonusRodada > 0 && ` · +${bonusRodada} pts de bônus no ranking`}
          </p>
        )}
        {zerou && (
          <Aviso tipo="ok">🔁 Você zerou a sua revisão de erros! Conquista “Aprendi com o erro” desbloqueada.</Aviso>
        )}
        <div className="flex flex-col gap-3">
          {pendentes - acertos > 0 && (
            <Botao
              onClick={() => {
                setFeitas([]);
                setAcertos(0);
                setBonusRodada(0);
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
    <PalcoQuestao
      enunciado={questao.enunciado}
      imagemUrl={questao.imagemUrl}
      topo={
        <>
          <div className="flex items-center justify-between text-sm font-medium text-slate-600">
            <span className="font-bold text-marca-900">📚 Revisão de erros</span>
            <span>
              {posicao} de {total} ·{" "}
              <Link href="/aluno" className="text-marca-700 underline">
                sair
              </Link>
            </span>
          </div>
        </>
      }
    >
      {correcao ? (
        <div className="space-y-3">
          <Aviso tipo={correcao.fracao === 1 ? "ok" : "info"}>
            {correcao.fracao === 1
              ? `✅ Erro corrigido! Esta questão sai da sua revisão. +${XP_POR_REVISAO} XP${
                  correcao.corrigiu?.bonus
                    ? ` e +${correcao.corrigiu.bonus} pts de bônus no ranking.`
                    : correcao.corrigiu?.limiteAtingido
                      ? `. O bônus no ranking vale para ${LIMITE_REVISAO_DIA} erros por dia: amanhã tem mais.`
                      : "."
                }`
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
          <QuestaoInterativa
            vista={questao.vista}
            resposta={resposta}
            onChange={setResposta}
            desabilitada={pendente}
            certas={questao.certas}
          />
          {erro && <Aviso>{erro}</Aviso>}
          <Botao
            variante="sucesso"
            className="w-full py-4 text-base shadow-lg"
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
                  if (r.corrigiu?.bonus) setBonusRodada((b) => b + r.corrigiu!.bonus);
                  if (r.corrigiu?.zerou) setZerou(true);
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
    </PalcoQuestao>
  );
}
