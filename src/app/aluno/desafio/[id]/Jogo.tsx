"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FaixaRelampago } from "@/components/FaixaRelampago";
import { QuestaoInterativa } from "@/components/QuestaoInterativa";
import { Aviso, Botao, BotaoLink } from "@/components/ui";
import type { Ajudas, EstadoJogo, ResultadoAjuda } from "@/lib/jogo";
import { aplicarAjuda, DICAS_POR_TEMPORADA, ELIMINACOES_POR_TEMPORADA, rotuloEliminacao } from "@/lib/questoes/ajudas";
import { respostaCompleta, respostaInicial } from "@/lib/questoes/apresentacao";
import { ESCOLHA_UNICA } from "@/lib/questoes/tipos";
import type { Resposta } from "@/lib/questoes/tipos";
import { useTelaProtegida } from "@/components/useTelaProtegida";
import { textoMarca, type MotivoZerada } from "@/lib/tela-protegida";
import { carregarJogo, eliminar, enviarResposta, enviarVerificacao, pedirDica } from "../../actions";

type QuestaoEmJogo = Extract<EstadoJogo, { fase: "questao" }>;
type VerificacaoEmJogo = Extract<EstadoJogo, { fase: "verificacao" }>;

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
  identificacao = "",
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
  /** Apelido e turma, para a marca d'água da pesquisa bloqueada. */
  identificacao?: string;
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
              <li className="font-semibold text-red-700">
                🖱️ No computador, clique só nas alternativas e nos botões: clicar em outra parte da tela faz a questão
                valer zero.
              </li>
            </>
          ) : (
            <li className="font-semibold text-emerald-700">
              🔎 Pesquisa liberada: pode sair da tela para consultar, mas o tempo continua correndo.
            </li>
          )}
          <li>↩️ Não dá para voltar à questão anterior.</li>
          <li>
            📖 Verificação de leitura: em algumas questões, logo depois de responder, você marca qual era o tema dela.
            Errou, a questão vale zero.
          </li>
          <li>
            🛟 Ajudas da temporada: {ELIMINACOES_POR_TEMPORADA} eliminações (tiram uma opção errada ou revelam um item
            certo) e {DICAS_POR_TEMPORADA} dicas. Use quando quiser; acabou, só na próxima temporada.
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

  if (estado.fase === "verificacao") {
    return (
      <TelaVerificacao
        key={`v-${estado.verificacao.questaoId}`}
        estado={estado}
        pendente={pendente}
        erroRede={erroRede}
        tecladoLiberado={tecladoLiberado}
        identificacao={identificacao}
        enviar={(escolha, motivo) =>
          executar(() => enviarVerificacao(desafioId, estado.verificacao.questaoId, escolha, motivo))
        }
      />
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
      identificacao={identificacao}
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
  identificacao,
  enviar,
}: {
  desafioId: string;
  estado: QuestaoEmJogo;
  pendente: boolean;
  erroRede: boolean;
  tecladoLiberado: boolean;
  identificacao: string;
  enviar: (resposta: Resposta | null, saidas: number, motivo: MotivoZerada | null) => void;
}) {
  const { questao, posicao, total, aviso } = estado;
  const [resposta, setResposta] = useState<Resposta>(() =>
    aplicarAjuda(questao.vista, respostaInicial(questao.vista), questao.ajuda),
  );
  const [restante, setRestante] = useState(questao.restanteMs);
  const saidas = useRef(0);
  const enviado = useRef(false);
  const [ajuda, setAjuda] = useState(questao.ajuda);
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
        if (r.ajuda) {
          const nova = r.ajuda;
          setAjuda(nova);
          setPodeEliminar(Boolean(r.podeEliminar));
          // Trava os itens revelados e tira da resposta as opções riscadas.
          setResposta((atual) => aplicarAjuda(questao.vista, atual, nova));
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

  // Conta cada vez que o aluno sai; com a pesquisa bloqueada, sair, teclar,
  // clicar fora ou ter a página alterada por extensão zera a questão.
  const fora = useRef(false);
  const dialogoProprio = useRef(false);
  const zerar = useCallback((motivo: MotivoZerada) => confirmar(null, motivo), [confirmar]);
  useTelaProtegida({
    protegida: questao.saidaZera,
    tecladoBloqueado: !tecladoLiberado,
    enviado,
    saidas,
    fora,
    dialogoProprio,
    zerar,
  });

  // Marca d'água com quem está respondendo: uma foto da tela mostra de quem é.
  const [marca] = useState(() => (questao.saidaZera && identificacao ? textoMarca(identificacao) : ""));

  const segundos = Math.ceil(restante / 1000);
  const fracao = restante / (questao.tempoLimite * 1000);
  const completa = respostaCompleta(resposta);

  return (
    <div
      translate={questao.saidaZera ? "no" : undefined}
      className={`sem-selecao relative isolate space-y-4 ${questao.saidaZera ? "notranslate" : ""} ${
        questao.relampago ? "rounded-2xl p-3 ring-4 ring-amber-300" : ""
      }`}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
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
          Questão {posicao} de {total}
        </span>
        <span
          className={`tabular-nums ${questao.relampago ? "text-base font-black" : ""} ${
            segundos <= (questao.relampago ? 5 : 10)
              ? "font-bold text-red-600"
              : questao.relampago
                ? "text-amber-600"
                : ""
          }`}
        >
          {questao.relampago ? "⚡" : "⏱️"} {segundos}s
        </span>
      </div>
      {questao.relampago && <FaixaRelampago tempo={questao.tempoLimite} />}
      {aviso && <Aviso>{aviso}</Aviso>}
      {questao.saidaZera ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700">
          🚫 Pesquisa bloqueada: sair desta tela{tecladoLiberado ? "" : ", apertar qualquer tecla"} ou clicar fora das
          alternativas e dos botões faz esta questão valer zero.
        </p>
      ) : (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
          🔎 Pesquisa liberada: pode consultar, o tempo continua correndo.
        </p>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-[width] duration-200 ${fracao < 0.25 ? "bg-red-500" : questao.relampago ? "bg-amber-400" : "bg-marca-600"}`}
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
        ajuda={ajuda}
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
                ✂️ {rotuloEliminacao(questao.vista.tipo)} · {ajudas.eliminacoes}/{ELIMINACOES_POR_TEMPORADA}
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
      {marca && <p className="text-right text-[11px] text-slate-400">{marca}</p>}
      <p className="text-center text-xs text-slate-400">
        <Link href="/aluno">Sair</Link> · o tempo continua correndo
      </p>
    </div>
  );
}

/** Verificação de leitura: qual era o tema da questão que o aluno acabou de responder. */
function TelaVerificacao({
  estado,
  pendente,
  erroRede,
  tecladoLiberado,
  identificacao,
  enviar,
}: {
  estado: VerificacaoEmJogo;
  pendente: boolean;
  erroRede: boolean;
  tecladoLiberado: boolean;
  identificacao: string;
  enviar: (escolha: number | null, motivo: MotivoZerada | null) => void;
}) {
  const { verificacao, posicao, total, aviso } = estado;
  const [restante, setRestante] = useState(verificacao.restanteMs);
  const enviado = useRef(false);
  const saidas = useRef(0);
  const fora = useRef(false);
  const dialogoProprio = useRef(false);

  const confirmar = useCallback(
    (escolha: number | null, motivo: MotivoZerada | null = null) => {
      if (enviado.current) return;
      enviado.current = true;
      enviar(escolha, motivo);
    },
    [enviar],
  );

  useEffect(() => {
    if (erroRede) enviado.current = false;
  }, [erroRede]);

  useEffect(() => {
    const fim = Date.now() + verificacao.restanteMs;
    const timer = setInterval(() => {
      const r = Math.max(0, fim - Date.now());
      setRestante(r);
      if (r === 0) {
        clearInterval(timer);
        confirmar(null);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [verificacao.restanteMs, confirmar]);

  const zerar = useCallback((motivo: MotivoZerada) => confirmar(null, motivo), [confirmar]);
  useTelaProtegida({
    protegida: verificacao.saidaZera,
    tecladoBloqueado: !tecladoLiberado,
    enviado,
    saidas,
    fora,
    dialogoProprio,
    zerar,
  });
  const [marca] = useState(() => (verificacao.saidaZera && identificacao ? textoMarca(identificacao) : ""));

  const segundos = Math.ceil(restante / 1000);
  const fracao = restante / (verificacao.tempoLimite * 1000);

  return (
    <div
      translate={verificacao.saidaZera ? "no" : undefined}
      className={`sem-selecao relative isolate space-y-4 ${verificacao.saidaZera ? "notranslate" : ""}`}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between text-sm font-medium text-slate-600">
        <span>
          Questão {posicao} de {total} · verificação
        </span>
        <span className={`tabular-nums ${segundos <= 5 ? "font-bold text-red-600" : ""}`}>⏱️ {segundos}s</span>
      </div>
      {aviso && <Aviso>{aviso}</Aviso>}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-[width] duration-200 ${fracao < 0.3 ? "bg-red-500" : "bg-sky-500"}`}
          style={{ width: `${Math.max(0, Math.min(1, fracao)) * 100}%` }}
        />
      </div>
      <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-bold tracking-widest text-sky-700 uppercase">📖 Verificação de leitura</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{verificacao.pergunta}</p>
        <p className="mt-1 text-xs text-slate-600">Se errar, a questão que você acabou de responder vale zero.</p>
      </div>
      <div className="grid gap-2">
        {verificacao.opcoes.map((opcao, i) => (
          <button
            key={i}
            type="button"
            disabled={pendente}
            onClick={() => confirmar(i)}
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left font-medium transition hover:border-sky-400 hover:bg-sky-50 disabled:opacity-50"
          >
            {opcao}
          </button>
        ))}
      </div>
      {pendente && <p className="text-center text-sm text-slate-500">Enviando…</p>}
      {erroRede && <Aviso>Falha de conexão. Toque na alternativa de novo.</Aviso>}
      {marca && <p className="text-right text-[11px] text-slate-400">{marca}</p>}
    </div>
  );
}
