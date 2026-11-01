"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FaixaRelampago } from "@/components/FaixaRelampago";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import { useTelaProtegida } from "@/components/useTelaProtegida";
import { formatarPontos } from "@/lib/pontos";
import type { EstadoPartida } from "@/lib/publico/jogo";
import { BONUS_RAPIDEZ, PESO_FINAL, PONTOS_ACERTO, QUESTOES_FINAIS, QUESTOES_POR_PARTIDA } from "@/lib/publico/regras";
import { respostaCompleta, respostaInicial } from "@/lib/questoes/apresentacao";
import { ESCOLHA_UNICA, type Resposta } from "@/lib/questoes/tipos";
import { textoMarca, type MotivoZerada } from "@/lib/tela-protegida";
import { carregarPartida, responderPublico } from "../../actions";

type QuestaoEmJogo = Extract<EstadoPartida, { fase: "questao" }>;

function entrarEmTelaCheia() {
  document.documentElement.requestFullscreen?.().catch(() => {});
}

function sairDaTelaCheia() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

const NORMAIS = QUESTOES_POR_PARTIDA - QUESTOES_FINAIS;

/** Regras da rodada final, mostradas antes dela começar. */
function RegrasFinal() {
  return (
    <ul className="space-y-2 text-sm">
      <li>🚫 Sem consulta: não saia desta tela nem troque de aba ou de app.</li>
      <li>⌨️ Não use o teclado: responda só com o mouse ou tocando na tela.</li>
      <li>🖱️ No computador, clique só nas alternativas e nos botões.</li>
      <li>❗ Se alguma dessas regras for quebrada, aquela questão vale zero.</li>
      <li>⭐ Cada questão da rodada final vale o dobro: até {PESO_FINAL * (PONTOS_ACERTO + BONUS_RAPIDEZ)} pontos.</li>
    </ul>
  );
}

export function JogoPublico({
  partidaId,
  titulo,
  valeRanking,
  jaComecou,
  apelido,
}: {
  partidaId: string;
  titulo: React.ReactNode;
  valeRanking: boolean;
  jaComecou: boolean;
  apelido: string;
}) {
  const [estado, setEstado] = useState<EstadoPartida | null>(null);
  const [pendente, iniciar] = useTransition();
  const [erroRede, setErroRede] = useState(false);

  const executar = useCallback((acao: () => Promise<EstadoPartida>) => {
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
    if (estado?.fase !== "questao" || !estado.final) sairDaTelaCheia();
  }, [estado]);

  if (!estado) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          <li>📝 {QUESTOES_POR_PARTIDA} questões, uma por vez, em formatos variados.</li>
          <li>
            🔎 Questões 1 a {NORMAIS}: <strong>com consulta</strong>. Pode pesquisar, mas o tempo continua correndo.
          </li>
          <li>
            ⚡ Cada acerto vale {PONTOS_ACERTO} pontos, mais até {BONUS_RAPIDEZ} de bônus pela rapidez.
          </li>
          <li>
            🔥 Questões {NORMAIS + 1} e {QUESTOES_POR_PARTIDA}: <strong>Rodada final, sem consulta</strong>, valendo o
            dobro. Antes dela, você vê as regras.
          </li>
          <li>↩️ Não dá para voltar à questão anterior.</li>
          <li>
            {valeRanking
              ? "🏆 Esta é a sua primeira partida desta era: ela vale para o ranking."
              : "🏋️ Esta partida é treino: não muda o ranking."}
          </li>
        </ul>
        {erroRede && <Aviso>Falha de conexão. Tente de novo.</Aviso>}
        <Botao
          className="w-full py-4 text-base"
          disabled={pendente}
          onClick={() => executar(() => carregarPartida(partidaId))}
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
        <BotaoLink href="/jogar" variante="secundario">
          Voltar aos desafios
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
          <BotaoLink href={`/jogar/partida/${partidaId}/resultado`}>Ver meu resultado</BotaoLink>
          <BotaoLink href="/jogar" variante="secundario">
            Voltar aos desafios
          </BotaoLink>
        </div>
      </div>
    );
  }

  if (estado.fase === "aviso_final") {
    return (
      <div className="space-y-5">
        {estado.aviso && <Aviso>{estado.aviso}</Aviso>}
        <div className="rounded-3xl bg-gradient-to-br from-rose-600 via-red-700 to-marca-950 p-6 text-white shadow-lg">
          <p className="text-xs font-bold tracking-widest uppercase">🔥 Rodada final</p>
          <h1 className="mt-1 text-2xl font-extrabold">Agora é sem consulta!</h1>
          <p className="mt-1 text-sm text-white/90">
            Você tem {formatarPontos(estado.pontos)} pontos. Faltam {QUESTOES_FINAIS} questões, valendo o dobro.
          </p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          <RegrasFinal />
        </div>
        <p className="text-center text-xs text-slate-500">
          É o mesmo modo que os alunos do professor Cadu usam em sala. Respire fundo e comece quando estiver pronto.
        </p>
        {erroRede && <Aviso>Falha de conexão. Tente de novo.</Aviso>}
        <Botao
          className="w-full bg-red-600 py-4 text-base hover:bg-red-700"
          disabled={pendente}
          onClick={() => {
            entrarEmTelaCheia();
            executar(() => carregarPartida(partidaId, true));
          }}
        >
          {pendente ? "Carregando…" : "Começar a rodada final"}
        </Botao>
      </div>
    );
  }

  return (
    <TelaQuestao
      key={estado.questao.id}
      estado={estado}
      pendente={pendente}
      erroRede={erroRede}
      apelido={apelido}
      enviar={(resposta, saidas, motivo) =>
        executar(() => responderPublico(partidaId, estado.questao.id, resposta, saidas, motivo))
      }
    />
  );
}

function TelaQuestao({
  estado,
  pendente,
  erroRede,
  apelido,
  enviar,
}: {
  estado: QuestaoEmJogo;
  pendente: boolean;
  erroRede: boolean;
  apelido: string;
  enviar: (resposta: Resposta | null, saidas: number, motivo: MotivoZerada | null) => void;
}) {
  const { questao, posicao, total, final, aviso } = estado;
  const [resposta, setResposta] = useState<Resposta>(() => respostaInicial(questao.vista));
  const [restante, setRestante] = useState(questao.restanteMs);
  const saidas = useRef(0);
  const enviado = useRef(false);
  const fora = useRef(false);
  const dialogoProprio = useRef(false);

  const confirmar = useCallback(
    (r: Resposta | null, motivo: MotivoZerada | null = null) => {
      if (enviado.current) return;
      enviado.current = true;
      enviar(r, saidas.current, motivo);
    },
    [enviar],
  );

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

  const zerar = useCallback((motivo: MotivoZerada) => confirmar(null, motivo), [confirmar]);
  useTelaProtegida({ protegida: final, tecladoBloqueado: true, enviado, saidas, fora, dialogoProprio, zerar });

  const [marca] = useState(() => (final ? textoMarca(apelido) : ""));
  const segundos = Math.ceil(restante / 1000);
  const fracao = restante / (questao.tempoLimite * 1000);
  const completa = respostaCompleta(resposta);

  return (
    <div
      translate={final ? "no" : undefined}
      className={`relative isolate space-y-4 ${final ? "sem-selecao notranslate rounded-2xl p-3 ring-4 ring-red-300" : ""}`}
      onCopy={final ? (e) => e.preventDefault() : undefined}
      onContextMenu={final ? (e) => e.preventDefault() : undefined}
    >
      {marca && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none">
          <div className="absolute -inset-1/2 flex rotate-[-25deg] flex-wrap content-start gap-x-24 gap-y-36 text-sm font-extrabold text-marca-950 opacity-[0.07]">
            {Array.from({ length: 60 }, (_, i) => (
              <span key={i}>{marca}</span>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span>
          {final ? "🔥 " : ""}Questão {posicao} de {total} · {formatarPontos(estado.pontos)} pts
        </span>
        <span className={`tabular-nums ${segundos <= 10 ? "font-bold text-red-600" : ""}`}>
          {questao.relampago ? "⚡" : "⏱️"} {segundos}s
        </span>
      </div>
      {questao.relampago && <FaixaRelampago tempo={questao.tempoLimite} />}
      {aviso && <Aviso>{aviso}</Aviso>}
      {final ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">
          🔥 Rodada final, sem consulta, vale o dobro: sair desta tela, apertar qualquer tecla ou clicar fora das
          alternativas e dos botões faz esta questão valer zero.
        </p>
      ) : (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
          🔎 Com consulta: pode pesquisar, mas o tempo continua correndo. Quanto mais rápido, maior o bônus.
        </p>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-[width] duration-200 ${fracao < 0.25 ? "bg-red-500" : final ? "bg-red-400" : "bg-marca-600"}`}
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
      <p className="text-lg font-medium whitespace-pre-line">{questao.enunciado}</p>

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
      {marca && <p className="text-right text-[11px] text-slate-400">{marca}</p>}
      <p className="text-center text-xs text-slate-400">
        <Link href="/jogar">Sair</Link> · o tempo continua correndo
      </p>
    </div>
  );
}
