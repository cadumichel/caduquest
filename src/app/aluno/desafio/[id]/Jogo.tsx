"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import type { Ajudas, EstadoJogo, ResultadoAjuda } from "@/lib/jogo";
import { DICAS_POR_TEMPORADA, ELIMINACOES_POR_TEMPORADA } from "@/lib/questoes/ajudas";
import { respostaCompleta, respostaInicial } from "@/lib/questoes/apresentacao";
import { ESCOLHA_UNICA } from "@/lib/questoes/tipos";
import type { Resposta } from "@/lib/questoes/tipos";
import { elementoEstranho, teclaConta, type MotivoZerada } from "@/lib/tela-protegida";
import { carregarJogo, eliminar, enviarResposta, pedirDica } from "../../actions";

type QuestaoEmJogo = Extract<EstadoJogo, { fase: "questao" }>;

/** Tela cheia ajuda a manter o foco quando a pesquisa é bloqueada; o navegador pode recusar (iPhone, por exemplo). */
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
  tecladoLiberado = false,
  relampago = false,
  pontosPorAcerto,
}: {
  desafioId: string;
  titulo: string;
  totalQuestoes: number;
  jaComecou: boolean;
  tempoFixo: number | null;
  saidaZera: boolean;
  tecladoLiberado?: boolean;
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
          {saidaZera ? (
            <>
              <li className="font-semibold text-red-700">
                🚫 Pesquisa bloqueada: não saia desta tela nem troque de aba ou de app. Se sair, a questão vale zero.
              </li>
              {tecladoLiberado ? (
                <li>⌨️ O professor liberou o teclado para você.</li>
              ) : (
                <li className="font-semibold text-red-700">
                  ⌨️ Não use o teclado: apertar qualquer tecla durante uma questão, mesmo sem querer, faz ela valer
                  zero. Responda só com o mouse ou tocando na tela.
                </li>
              )}
            </>
          ) : (
            <li className="font-semibold text-emerald-700">
              🔎 Pesquisa liberada: pode sair da tela para consultar, mas o tempo continua correndo.
            </li>
          )}
          <li>↩️ Não dá para voltar à questão anterior.</li>
          <li>
            🛟 Ajudas da temporada: {ELIMINACOES_POR_TEMPORADA} eliminações de alternativa errada e{" "}
            {DICAS_POR_TEMPORADA} dicas. Use quando quiser; acabou, só na próxima temporada.
          </li>
          <li>
            🎯 Só a primeira tentativa vale para o ranking e o XP. Quando o desafio fechar, saem o gabarito e a opção de
            refazer como treino.
          </li>
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
            if (saidaZera) entrarEmTelaCheia();
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
      desafioId={desafioId}
      estado={estado}
      pendente={pendente}
      erroRede={erroRede}
      tecladoLiberado={tecladoLiberado}
      enviar={(resposta, saidas, motivo) =>
        executar(() => enviarResposta(desafioId, estado.questao.id, resposta, saidas, motivo))
      }
    />
  );
}

function TelaQuestao({
  desafioId,
  estado,
  pendente,
  erroRede,
  tecladoLiberado,
  enviar,
}: {
  desafioId: string;
  estado: QuestaoEmJogo;
  pendente: boolean;
  erroRede: boolean;
  tecladoLiberado: boolean;
  enviar: (resposta: Resposta | null, saidas: number, motivo: MotivoZerada | null) => void;
}) {
  const { questao, posicao, total, aviso } = estado;
  const [resposta, setResposta] = useState<Resposta>(() => respostaInicial(questao.vista));
  const [restante, setRestante] = useState(questao.restanteMs);
  const saidas = useRef(0);
  const enviado = useRef(false);
  const [eliminadas, setEliminadas] = useState(questao.eliminadas);
  const [podeEliminar, setPodeEliminar] = useState(questao.podeEliminar);
  const [dica, setDica] = useState(questao.dica);
  const [ajudas, setAjudas] = useState<Ajudas>(estado.ajudas);
  const [erroAjuda, setErroAjuda] = useState<string | null>(null);
  const [usandoAjuda, iniciarAjuda] = useTransition();

  const usarAjuda = (acao: () => Promise<ResultadoAjuda>) =>
    iniciarAjuda(async () => {
      setErroAjuda(null);
      try {
        const r = await acao();
        if (r.ajudas !== undefined) setAjudas(r.ajudas);
        if (r.erro) return setErroAjuda(r.erro);
        if (r.dica) setDica(r.dica);
        if (r.eliminadas) {
          const novas = r.eliminadas;
          setEliminadas(novas);
          setPodeEliminar(Boolean(r.podeEliminar));
          // A alternativa marcada pode ter sido eliminada.
          setResposta((atual) =>
            "escolha" in atual && atual.escolha !== null && novas.includes(atual.escolha)
              ? { ...atual, escolha: null }
              : atual,
          );
        }
      } catch {
        setErroAjuda("Falha de conexão. Tente de novo.");
      }
    });

  const confirmar = useCallback(
    (r: Resposta | null, motivo: MotivoZerada | null = null) => {
      if (enviado.current) return;
      enviado.current = true;
      enviar(r, saidas.current, motivo);
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
      if (questao.saidaZera) confirmar(null, "saida");
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

  // Pesquisa bloqueada: qualquer tecla zera a questão (salvo teclado liberado
  // pelo professor). Atalhos do sistema, como Alt+Tab, nem chegam aqui, mas já
  // tiram o aluno da tela.
  const bloquearTeclado = questao.saidaZera && !tecladoLiberado;
  useEffect(() => {
    if (!bloquearTeclado) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (enviado.current || dialogoProprio.current || !teclaConta(e.key)) return;
      e.preventDefault();
      confirmar(null, "teclado");
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [bloquearTeclado, confirmar]);

  // Pesquisa bloqueada: um elemento que aparece na página sem ter sido criado
  // pelo app (botão de IA, marca-texto, barra lateral de extensão) zera a questão.
  // O aluno não é avisado disso, a pedido do professor, para não dar a ideia.
  useEffect(() => {
    if (!questao.saidaZera) return;
    const observador = new MutationObserver((mudancas) => {
      if (enviado.current) return;
      if (mudancas.some((m) => Array.from(m.addedNodes).some(elementoEstranho))) confirmar(null, "tela_alterada");
    });
    observador.observe(document.body, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [questao.saidaZera, confirmar]);

  const segundos = Math.ceil(restante / 1000);
  const fracao = restante / (questao.tempoLimite * 1000);
  const completa = respostaCompleta(resposta);

  return (
    <div
      translate={questao.saidaZera ? "no" : undefined}
      className={`sem-selecao space-y-4 ${questao.saidaZera ? "notranslate" : ""}`}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span>
          Questão {posicao} de {total}
        </span>
        <span className={`tabular-nums ${segundos <= 10 ? "font-bold text-red-600" : ""}`}>⏱️ {segundos}s</span>
      </div>
      {aviso && <Aviso>{aviso}</Aviso>}
      {questao.saidaZera ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">
          🚫 Pesquisa bloqueada: sair desta tela{tecladoLiberado ? "" : " ou apertar qualquer tecla"} faz esta questão
          valer zero.
        </p>
      ) : (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
          🔎 Pesquisa liberada: pode consultar, o tempo continua correndo.
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

      <QuestaoInterativa
        vista={questao.vista}
        resposta={resposta}
        onChange={setResposta}
        desabilitada={pendente}
        eliminadas={eliminadas}
      />

      {ajudas && (questao.podeEliminar || questao.temDica) && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {questao.podeEliminar && (
              <button
                type="button"
                disabled={pendente || usandoAjuda || !podeEliminar || ajudas.eliminacoes <= 0}
                onClick={() => usarAjuda(() => eliminar(desafioId, questao.id))}
                className="flex-1 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-40"
              >
                ✂️ Eliminar uma errada · {ajudas.eliminacoes}/{ELIMINACOES_POR_TEMPORADA}
              </button>
            )}
            {questao.temDica && !dica && (
              <button
                type="button"
                disabled={pendente || usandoAjuda || ajudas.dicas <= 0}
                onClick={() => usarAjuda(() => pedirDica(desafioId, questao.id))}
                className="flex-1 rounded-xl border-2 border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:opacity-40"
              >
                💡 Ver dica · {ajudas.dicas}/{DICAS_POR_TEMPORADA}
              </button>
            )}
          </div>
          {dica && <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm whitespace-pre-line text-sky-900">💡 {dica}</p>}
          {erroAjuda && <Aviso>{erroAjuda}</Aviso>}
        </div>
      )}

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
