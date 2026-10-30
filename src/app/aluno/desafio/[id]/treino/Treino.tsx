"use client";
import { useEffect, useState, useTransition } from "react";
import { Gabarito } from "@/components/Gabarito";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import { respostaCompleta, respostaInicial } from "@/lib/questoes/apresentacao";
import { ESCOLHA_UNICA, type Resposta } from "@/lib/questoes/tipos";
import type { CorrecaoTreino, ItemTreino, QuestaoTreino } from "@/lib/treino";
import { comecarTreino, corrigirRespostasTreino } from "../../../actions";

type Placar = { acertos: number; pontos: number };

/** Nota com até 2 casas decimais, no formato brasileiro. */
const nota = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/**
 * Refazer o desafio como treino, sem tempo e sem valer ranking nem XP.
 * Desafio encerrado: gabarito logo após cada resposta. Aberto: só a nota no fim.
 */
export function Treino({ desafioId, titulo }: { desafioId: string; titulo: string }) {
  const [questoes, setQuestoes] = useState<QuestaoTreino[] | null>(null);
  const [encerrado, setEncerrado] = useState(false);
  const [indice, setIndice] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [itens, setItens] = useState<ItemTreino[]>([]);
  const [correcao, setCorrecao] = useState<CorrecaoTreino | null>(null);
  const [placar, setPlacar] = useState<Placar>({ acertos: 0, pontos: 0 });
  const [fim, setFim] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const comecar = () =>
    iniciar(async () => {
      setErro(null);
      try {
        const r = await comecarTreino(desafioId);
        if ("erro" in r) return setErro(r.erro);
        setQuestoes(r.questoes);
        setEncerrado(r.encerrado);
        setIndice(0);
        setItens([]);
        setCorrecao(null);
        setPlacar({ acertos: 0, pontos: 0 });
        setFim(false);
        setResposta(r.questoes[0] ? respostaInicial(r.questoes[0].vista) : null);
      } catch {
        setErro("Falha de conexão. Tente de novo.");
      }
    });

  useEffect(() => {
    comecar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avancar = () => {
    const prox = indice + 1;
    setCorrecao(null);
    if (!questoes || prox >= questoes.length) return setFim(true);
    setIndice(prox);
    setResposta(respostaInicial(questoes[prox].vista));
  };

  const confirmar = (q: QuestaoTreino, r: Resposta) =>
    iniciar(async () => {
      setErro(null);
      const item = { questaoId: q.id, permutacao: q.permutacao, resposta: r };
      const ultima = questoes !== null && indice === questoes.length - 1;
      try {
        if (encerrado) {
          const c = await corrigirRespostasTreino(desafioId, [item]);
          if ("erro" in c) return setErro(c.erro);
          setPlacar((p) => ({ acertos: p.acertos + c.acertos, pontos: p.pontos + c.pontos }));
          setCorrecao(c.correcoes[0] ?? null);
          if (!c.correcoes[0]) avancar();
          return;
        }
        // Desafio ainda aberto: corrige tudo de uma vez no fim, sem mostrar questão por questão.
        const todos = [...itens.filter((i) => i.questaoId !== q.id), item];
        setItens(todos);
        if (!ultima) return avancar();
        const c = await corrigirRespostasTreino(desafioId, todos);
        if ("erro" in c) return setErro(c.erro);
        setPlacar({ acertos: c.acertos, pontos: c.pontos });
        setFim(true);
      } catch {
        setErro("Falha de conexão. Tente de novo.");
      }
    });

  if (fim && questoes) {
    return (
      <div className="space-y-5 py-8 text-center">
        <p className="text-6xl">🏋️</p>
        <h1 className="text-2xl font-bold">Treino concluído!</h1>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-3xl font-extrabold text-marca-700">{nota(placar.pontos)}</p>
            <p className="text-sm text-slate-500">pontos no treino</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-3xl font-extrabold">
              {nota(placar.acertos)}
              <span className="text-lg text-slate-400">/{questoes.length}</span>
            </p>
            <p className="text-sm text-slate-500">acertos</p>
          </div>
        </div>
        <Aviso tipo="info">
          Treino não conta para o ranking nem para o XP: vale só a primeira tentativa.
          {!encerrado && " O gabarito de cada questão sai quando o desafio fechar."}
        </Aviso>
        <div className="flex flex-col gap-3">
          <Botao disabled={pendente} onClick={comecar}>
            {pendente ? "Carregando…" : "Treinar de novo"}
          </Botao>
          <BotaoLink href={`/aluno/desafio/${desafioId}/resultado`} variante="secundario">
            Voltar ao resultado
          </BotaoLink>
        </div>
      </div>
    );
  }

  if (!questoes || !resposta) {
    return (
      <div className="space-y-4">
        {erro ? <Aviso>{erro}</Aviso> : <p className="py-10 text-center text-slate-500">Carregando…</p>}
        {erro && (
          <BotaoLink href={`/aluno/desafio/${desafioId}/resultado`} variante="secundario">
            Voltar
          </BotaoLink>
        )}
      </div>
    );
  }

  const questao = questoes[indice];
  const completa = respostaCompleta(resposta);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span className="font-bold text-marca-900">🏋️ Treino · {titulo}</span>
        <span>
          {indice + 1} de {questoes.length}
        </span>
      </div>
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-600">
        Sem tempo e sem valer ranking nem XP.
      </p>
      {questao.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={questao.imagemUrl} alt="" className="mx-auto max-h-80 w-auto rounded-xl border border-slate-200" />
      )}
      <p className="whitespace-pre-line text-lg font-medium">{questao.enunciado}</p>

      {correcao ? (
        <div className="space-y-3">
          <Aviso tipo={correcao.fracao === 1 ? "ok" : "info"}>
            {correcao.fracao === 1
              ? "✅ Acertou!"
              : correcao.fracao > 0
                ? `Quase: ${Math.round(correcao.fracao * 100)}% certo. Veja o gabarito.`
                : "❌ Errou. Veja o gabarito."}
          </Aviso>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Gabarito conteudo={correcao.conteudo} permutacao={questao.permutacao} resposta={resposta} />
          </div>
          {correcao.explicacao && (
            <p className="rounded-lg bg-marca-50 px-3 py-2 text-sm text-marca-900">💡 {correcao.explicacao}</p>
          )}
          <Botao className="w-full py-4 text-base" onClick={avancar}>
            {indice < questoes.length - 1 ? "Próxima" : "Ver nota do treino"}
          </Botao>
        </div>
      ) : (
        <>
          <QuestaoInterativa vista={questao.vista} resposta={resposta} onChange={setResposta} desabilitada={pendente} />
          {erro && <Aviso>{erro}</Aviso>}
          <Botao
            variante="sucesso"
            className="w-full py-4 text-base"
            disabled={pendente || (!completa && ESCOLHA_UNICA.includes(resposta.tipo))}
            onClick={() => confirmar(questao, resposta)}
          >
            {pendente ? "Corrigindo…" : "Confirmar resposta"}
          </Botao>
        </>
      )}
    </div>
  );
}
