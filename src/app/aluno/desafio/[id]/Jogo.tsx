"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import type { EstadoJogo } from "@/lib/jogo";
import { respostaCompleta, respostaInicial } from "@/lib/questoes/apresentacao";
import type { Resposta } from "@/lib/questoes/tipos";
import { carregarJogo, enviarResposta } from "../../actions";

type QuestaoEmJogo = Extract<EstadoJogo, { fase: "questao" }>;

export function Jogo({
  desafioId,
  titulo,
  totalQuestoes,
  jaComecou,
}: {
  desafioId: string;
  titulo: string;
  totalQuestoes: number;
  jaComecou: boolean;
}) {
  const [estado, setEstado] = useState<EstadoJogo | null>(null);
  const [pendente, iniciar] = useTransition();
  const [erroRede, setErroRede] = useState(false);

  const executar = useCallback((acao: () => Promise<EstadoJogo>) => {
    setErroRede(false);
    iniciar(async () => {
      try {
        setEstado(await acao());
      } catch {
        setErroRede(true);
      }
    });
  }, []);

  if (!estado) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          <li>📝 {totalQuestoes} questões, uma por vez.</li>
          <li>⏱️ Cada questão tem tempo limite. O tempo continua correndo se você sair da tela.</li>
          <li>↩️ Não dá para voltar à questão anterior.</li>
          <li>🎯 Uma tentativa só. O gabarito sai quando o desafio fechar.</li>
        </ul>
        {erroRede && <Aviso>Falha de conexão. Tente de novo.</Aviso>}
        <Botao
          className="w-full py-4 text-base"
          disabled={pendente}
          onClick={() => executar(() => carregarJogo(desafioId))}
        >
          {pendente ? "Carregando…" : jaComecou ? "Continuar" : "Começar"}
        </Botao>
      </div>
    );
  }

  if (estado.fase === "erro") {
    return (
      <div className="space-y-4">
        <Aviso>{estado.mensagem}</Aviso>
        <BotaoLink href="/aluno" variante="secundario">
          Voltar ao mapa
        </BotaoLink>
      </div>
    );
  }

  if (estado.fase === "fim") {
    return (
      <div className="space-y-5 py-8 text-center">
        <p className="text-6xl">🏆</p>
        <h1 className="text-2xl font-bold">Desafio concluído!</h1>
        <div className="flex flex-col gap-3">
          <BotaoLink href={`/aluno/desafio/${desafioId}/resultado`}>Ver meu resultado</BotaoLink>
          <BotaoLink href="/aluno" variante="secundario">
            Voltar ao mapa
          </BotaoLink>
        </div>
      </div>
    );
  }

  return (
    <TelaQuestao
      key={estado.questao.id}
      estado={estado}
      pendente={pendente}
      erroRede={erroRede}
      enviar={(resposta, saidas) => executar(() => enviarResposta(desafioId, estado.questao.id, resposta, saidas))}
    />
  );
}

function TelaQuestao({
  estado,
  pendente,
  erroRede,
  enviar,
}: {
  estado: QuestaoEmJogo;
  pendente: boolean;
  erroRede: boolean;
  enviar: (resposta: Resposta | null, saidas: number) => void;
}) {
  const { questao, posicao, total } = estado;
  const [resposta, setResposta] = useState<Resposta>(() => respostaInicial(questao.vista));
  const [restante, setRestante] = useState(questao.restanteMs);
  const saidas = useRef(0);
  const enviado = useRef(false);

  const confirmar = useCallback(
    (r: Resposta | null) => {
      if (enviado.current) return;
      enviado.current = true;
      enviar(r, saidas.current);
    },
    [enviar],
  );

  // Se o envio falhar, permite tentar de novo.
  useEffect(() => {
    if (erroRede) enviado.current = false;
  }, [erroRede]);

  useEffect(() => {
    const fim = Date.now() + questao.restanteMs;
    const timer = setInterval(() => {
      const r = Math.max(0, fim - Date.now());
      setRestante(r);
      if (r === 0) {
        clearInterval(timer);
        confirmar(null);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [questao.restanteMs, confirmar]);

  useEffect(() => {
    const aoMudar = () => {
      if (document.visibilityState === "hidden") saidas.current += 1;
    };
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, []);

  const segundos = Math.ceil(restante / 1000);
  const fracao = restante / (questao.tempoLimite * 1000);
  const completa = respostaCompleta(resposta);

  return (
    <div className="sem-selecao space-y-4" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span>
          Questão {posicao} de {total}
        </span>
        <span className={`tabular-nums ${segundos <= 10 ? "font-bold text-red-600" : ""}`}>⏱️ {segundos}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-[width] duration-200 ${fracao < 0.25 ? "bg-red-500" : "bg-marca-600"}`}
          style={{ width: `${Math.max(0, Math.min(1, fracao)) * 100}%` }}
        />
      </div>

      {questao.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={questao.imagemUrl}
          alt=""
          draggable={false}
          className="pointer-events-none mx-auto max-h-80 w-auto rounded-xl border border-slate-200"
        />
      )}
      <p className="whitespace-pre-line text-lg font-medium">{questao.enunciado}</p>

      <QuestaoInterativa vista={questao.vista} resposta={resposta} onChange={setResposta} desabilitada={pendente} />

      {erroRede && <Aviso>Falha de conexão. Toque em confirmar de novo.</Aviso>}
      <Botao
        className="sticky bottom-4 w-full py-4 text-base shadow-lg"
        disabled={pendente || (!completa && resposta.tipo === "multipla_escolha")}
        onClick={() => {
          if (!completa && !confirm("Há itens sem resposta. Confirmar mesmo assim?")) return;
          confirmar(resposta);
        }}
      >
        {pendente ? "Enviando…" : "Confirmar resposta"}
      </Botao>
      <p className="text-center text-xs text-slate-400">
        <Link href="/aluno">Sair</Link> · o tempo continua correndo
      </p>
    </div>
  );
}
