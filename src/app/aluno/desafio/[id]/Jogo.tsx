"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import type { EstadoJogo } from "@/lib/jogo";
import { respostaCompleta, respostaInicial } from "@/lib/questoes/apresentacao";
import { ESCOLHA_UNICA } from "@/lib/questoes/tipos";
import type { Resposta } from "@/lib/questoes/tipos";
import { carregarJogo, enviarResposta } from "../../actions";

type QuestaoEmJogo = Extract<EstadoJogo, { fase: "questao" }>;

/** Tela cheia ajuda a manter o foco; o navegador pode recusar (iPhone, por exemplo). */
function entrarEmTelaCheia() {
  document.documentElement.requestFullscreen?.().catch(() => {});
}

function sairDaTelaCheia() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

export function Jogo({
  desafioId,
  titulo,
  totalQuestoes,
  jaComecou,
  tempoFixo,
  saidaZera,
  relampago = false,
  pontosPorAcerto,
}: {
  desafioId: string;
  titulo: string;
  totalQuestoes: number;
  jaComecou: boolean;
  tempoFixo: number | null;
  saidaZera: boolean;
  relampago?: boolean;
  pontosPorAcerto: number;
}) {
  const [estado, setEstado] = useState<EstadoJogo | null>(null);
  const [codigo, setCodigo] = useState("");
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

  useEffect(() => {
    if (estado?.fase === "fim" || estado?.fase === "erro") sairDaTelaCheia();
  }, [estado]);

  if (!estado || estado.fase === "codigo") {
    const pedirCodigo = relampago && !jaComecou;
    return (
      <div className="space-y-5">
        {relampago ? (
          <div className="rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-5 text-white shadow-lg">
            <p className="text-xs font-bold tracking-widest uppercase">⚡ CaduRush · em sala</p>
            <h1 className="mt-1 text-2xl font-extrabold">{titulo}</h1>
            <p className="mt-1 text-sm text-white/90">Peso 3: cada acerto vale {pontosPorAcerto} pontos.</p>
          </div>
        ) : (
          <h1 className="text-2xl font-bold">{titulo}</h1>
        )}
        <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          <li>📝 {totalQuestoes} questões, uma por vez.</li>
          <li>
            ⏱️ {tempoFixo ? `${tempoFixo} segundos por questão.` : "Cada questão tem tempo limite."} O tempo continua
            correndo se você sair da tela.
          </li>
          {saidaZera && (
            <li className="font-semibold text-red-700">
              🚫 Não saia desta tela nem troque de aba ou de app: se sair, a questão vale zero.
            </li>
          )}
          <li>↩️ Não dá para voltar à questão anterior.</li>
          <li>🎯 Uma tentativa só. O gabarito sai quando o desafio fechar.</li>
        </ul>
        {pedirCodigo && (
          <label className="block space-y-2">
            <span className="block text-sm font-semibold">Código do dia (está no quadro)</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="????"
              className="w-full rounded-xl border-2 border-orange-300 bg-white px-3 py-3 text-center font-mono text-3xl font-black tracking-[0.4em] uppercase focus:border-orange-500 focus:outline-none"
            />
          </label>
        )}
        {estado?.fase === "codigo" && estado.mensagem && <Aviso>{estado.mensagem}</Aviso>}
        {erroRede && <Aviso>Falha de conexão. Tente de novo.</Aviso>}
        <Botao
          className={`w-full py-4 text-base ${relampago ? "bg-orange-600 hover:bg-orange-700" : ""}`}
          disabled={pendente || (pedirCodigo && codigo.trim().length < 4)}
          onClick={() => {
            entrarEmTelaCheia();
            executar(() => carregarJogo(desafioId, pedirCodigo ? codigo : undefined));
          }}
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
          Voltar ao início
        </BotaoLink>
      </div>
    );
  }

  if (estado.fase === "fim") {
    return (
      <div className="space-y-5 py-8 text-center">
        {estado.aviso && <Aviso>{estado.aviso}</Aviso>}
        <p className="text-6xl">🏆</p>
        <h1 className="text-2xl font-bold">Desafio concluído!</h1>
        <div className="flex flex-col gap-3">
          <BotaoLink href={`/aluno/desafio/${desafioId}/resultado`}>Ver meu resultado</BotaoLink>
          <BotaoLink href="/aluno" variante="secundario">
            Voltar ao início
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
  const { questao, posicao, total, aviso } = estado;
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

  // Conta cada vez que o aluno sai: troca de aba ou de app, clique em outra
  // janela ou saída da tela cheia. Com a opção do desafio, a questão é zerada.
  const fora = useRef(false);
  const dialogoProprio = useRef(false);
  useEffect(() => {
    const saiu = () => {
      if (fora.current || dialogoProprio.current || enviado.current) return;
      fora.current = true;
      saidas.current += 1;
      if (questao.saidaZera) confirmar(null);
    };
    const voltou = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) fora.current = false;
    };
    const aoMudarVisibilidade = () => (document.visibilityState === "hidden" ? saiu() : voltou());
    const aoMudarTelaCheia = () => {
      if (!document.fullscreenElement) saiu();
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    document.addEventListener("fullscreenchange", aoMudarTelaCheia);
    window.addEventListener("blur", saiu);
    window.addEventListener("focus", voltou);
    return () => {
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      document.removeEventListener("fullscreenchange", aoMudarTelaCheia);
      window.removeEventListener("blur", saiu);
      window.removeEventListener("focus", voltou);
    };
  }, [questao.saidaZera, confirmar]);

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
      {aviso && <Aviso>{aviso}</Aviso>}
      {questao.saidaZera && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">
          Não saia desta tela: se sair, esta questão vale zero.
        </p>
      )}
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
        variante="sucesso"
        className="sticky bottom-4 w-full py-4 text-base shadow-lg"
        disabled={pendente || (!completa && ESCOLHA_UNICA.includes(resposta.tipo))}
        onClick={() => {
          if (!completa) {
            // O diálogo do navegador tira o foco da página: não conta como saída.
            dialogoProprio.current = true;
            const ok = confirm("Há itens sem resposta. Confirmar mesmo assim?");
            dialogoProprio.current = false;
            fora.current = false;
            if (!ok) return;
          }
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
