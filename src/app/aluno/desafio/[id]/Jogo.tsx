"use client";
import { formatarMultiplicador } from "@/lib/especial";
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
import {
  avisoCliqueTolerado,
  avisoSaidaTolerada,
  textoMarca,
  type MotivoZerada,
  type RegraCliques,
} from "@/lib/tela-protegida";
import { avisoTolerado, carregarJogo, eliminar, enviarResposta, enviarVerificacao, pedirDica } from "../../actions";

type QuestaoEmJogo = Extract<EstadoJogo, { fase: "questao" }>;
type VerificacaoEmJogo = Extract<EstadoJogo, { fase: "verificacao" }>;

/** Tela cheia ajuda a manter o foco quando a pesquisa é bloqueada; o navegador pode recusar (iPhone, por exemplo). */
function entrarEmTelaCheia() {
  document.documentElement.requestFullscreen?.().catch(() => {});
}

function sairDaTelaCheia() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

/**
 * Tolerância do desafio para cliques fora ou saídas da tela, na questão ou
 * verificação em tela. `inicial` vem do servidor: 0 = o próximo zera (proibido
 * ou avisos esgotados); null = liberado. Na tolerância, cada ocorrência mostra
 * um aviso e é contada no servidor.
 */
function useTolerancia(
  desafioId: string,
  tipo: "clique" | "saida",
  inicial: number | null,
  zerar: (motivo: MotivoZerada) => void,
) {
  const restantes = useRef(inicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const motivo: MotivoZerada = tipo === "clique" ? "clique_fora" : "saida";
  const avisar = useCallback(() => {
    const atual = restantes.current;
    if (atual === null) return;
    if (atual <= 0) return zerar(motivo);
    restantes.current = atual - 1;
    setAviso(tipo === "clique" ? avisoCliqueTolerado(atual - 1) : avisoSaidaTolerada(atual - 1));
    avisoTolerado(desafioId, tipo)
      .then((r) => {
        if (r.zerar) zerar(motivo);
        else if (r.restantes !== null) restantes.current = Math.min(restantes.current ?? r.restantes, r.restantes);
      })
      .catch(() => {});
  }, [desafioId, tipo, motivo, zerar]);
  // Proibido: o caminho de sempre (zera na primeira vez).
  return { avisar: inicial === 0 ? undefined : avisar, aviso };
}

/** Faixa da questão com a pesquisa bloqueada: o que faz a questão valer zero. */
function textoFaixaBloqueada(itens: (string | null)[]) {
  const lista = itens.filter((i): i is string => Boolean(i));
  const juntos = lista.length > 1 ? `${lista.slice(0, -1).join(", ")} ou ${lista.at(-1)}` : lista[0];
  return `🚫 Pesquisa bloqueada: ${juntos} faz esta questão valer zero.`;
}

/** Linha das orientações sobre as ajudas, com o teto do desafio se houver. */
function textoAjudas(eliminacoesMax: number | null, dicasMax: number | null) {
  if (eliminacoesMax === 0 && dicasMax === 0) return "🧰 Este desafio não tem ajudas (eliminações e dicas).";
  const base = `🧰 Ajudas da temporada: ${ELIMINACOES_POR_TEMPORADA} eliminações (tiram uma opção errada ou revelam um item certo) e ${DICAS_POR_TEMPORADA} dicas. Use quando quiser; acabou, só na próxima temporada.`;
  if (eliminacoesMax === null && dicasMax === null) return base;
  const parte = (n: number | null, um: string, varios: string) =>
    n === null ? null : n === 0 ? `nenhuma ${um}` : `até ${n} ${n === 1 ? um : varios}`;
  const limites = [parte(eliminacoesMax, "eliminação", "eliminações"), parte(dicasMax, "dica", "dicas")]
    .filter(Boolean)
    .join(" e ");
  return `${base} Neste desafio: ${limites}.`;
}

/** Linha das orientações sobre cliques fora, conforme a regra do desafio. */
function textoRegraCliques(regra: RegraCliques, tolerancia: number) {
  if (regra === "permitido") return null;
  if (regra === "tolerancia")
    return `🖱️ No computador, clique só nas alternativas e nos botões. Clicar em outra parte da tela gera um aviso: você tem ${tolerancia} ${tolerancia === 1 ? "aviso" : "avisos"} neste desafio; depois deles, clicar fora faz a questão valer zero.`;
  return "🖱️ No computador, clique só nas alternativas e nos botões: clicar em outra parte da tela faz a questão valer zero.";
}

export function Jogo({
  desafioId,
  titulo,
  totalQuestoes,
  jaComecou,
  tempoFixo,
  especial = false,
  multiplicador = null,
  tempoReduzido = false,
  saidaZera,
  tecladoLiberado = false,
  identificacao = "",
  relampago = false,
  pontosPorAcerto,
  regraCliques = "proibido",
  toleranciaCliques = 0,
  temVerificacao = true,
  toleranciaSaidas = null,
  eliminacoesMax = null,
  dicasMax = null,
  bonusRapidez = false,
  mostraGabarito = true,
  temTreino = true,
}: {
  desafioId: string;
  titulo: string;
  totalQuestoes: number;
  jaComecou: boolean;
  tempoFixo: number | null;
  especial?: boolean;
  multiplicador?: number | null;
  tempoReduzido?: boolean;
  saidaZera: boolean;
  tecladoLiberado?: boolean;
  /** Apelido e turma, para a marca d'água da pesquisa bloqueada. */
  identificacao?: string;
  relampago?: boolean;
  pontosPorAcerto: number;
  /** Clique fora das alternativas no sem consulta: proibido, tolerância ou permitido. */
  regraCliques?: RegraCliques;
  toleranciaCliques?: number;
  /** O desafio tem verificação de leitura (o professor pode pedir 0). */
  temVerificacao?: boolean;
  /** Saídas da tela toleradas com aviso (null = a primeira zera). */
  toleranciaSaidas?: number | null;
  /** Teto de ajudas neste desafio (null = só a cota da temporada; 0 = sem). */
  eliminacoesMax?: number | null;
  dicasMax?: number | null;
  bonusRapidez?: boolean;
  mostraGabarito?: boolean;
  temTreino?: boolean;
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
        {especial || relampago ? (
          <div className="rounded-3xl bg-gradient-to-br from-ouro-claro via-ouro to-ouro-escuro p-5 text-marca-950 shadow-lg ring-2 ring-ouro-claro/60">
            <p className="text-xs font-bold tracking-widest uppercase">★ Desafio especial{relampago && " · em sala"}</p>
            <h1 className="mt-1 text-2xl font-extrabold">{titulo}</h1>
            <p className="mt-1 text-sm text-marca-900/90">
              {multiplicador ? `Pontos ${formatarMultiplicador(multiplicador)}: ` : ""}cada acerto vale{" "}
              {pontosPorAcerto} pontos.{tempoReduzido && " O tempo de cada questão é menor que o normal."}
            </p>
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
                {toleranciaSaidas
                  ? `🚫 Pesquisa bloqueada: não saia desta tela nem troque de aba ou de app. Cada saída gera um aviso: você tem ${toleranciaSaidas} ${toleranciaSaidas === 1 ? "aviso" : "avisos"} neste desafio; depois deles, sair faz a questão valer zero.`
                  : "🚫 Pesquisa bloqueada: não saia desta tela nem troque de aba ou de app. Se sair, a questão vale zero."}
              </li>
              {tecladoLiberado ? (
                <li>⌨️ O teclado está liberado para você neste desafio.</li>
              ) : (
                <li className="font-semibold text-red-700">
                  ⌨️ Não use o teclado: apertar qualquer tecla durante uma questão, mesmo sem querer, faz ela valer
                  zero. Responda só com o mouse ou tocando na tela.
                </li>
              )}
              {textoRegraCliques(regraCliques, toleranciaCliques) && (
                <li className="font-semibold text-red-700">{textoRegraCliques(regraCliques, toleranciaCliques)}</li>
              )}
            </>
          ) : (
            <li className="font-semibold text-emerald-700">
              🔎 Pesquisa liberada: pode sair da tela para consultar, mas o tempo continua correndo.
            </li>
          )}
          <li>↩️ Não dá para voltar à questão anterior.</li>
          {temVerificacao && (
            <li>
              📖 Verificação de leitura: em algumas questões, logo depois de responder, você marca qual era o tema dela.
              Errou, a questão vale zero.
            </li>
          )}
          <li>{textoAjudas(eliminacoesMax, dicasMax)}</li>
          {bonusRapidez && (
            <li>⚡ Bônus por rapidez: quanto mais rápido você acerta, mais vale a questão (até 50% a mais).</li>
          )}
          <li>
            🎯 Só a primeira tentativa vale para o ranking e o XP.
            {mostraGabarito
              ? temTreino
                ? " Quando o desafio fechar, saem o gabarito e a opção de refazer como treino."
                : " Quando o desafio fechar, sai o gabarito."
              : ""}
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
        desafioId={desafioId}
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
      cliquesLiberados={regraCliques === "permitido"}
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
  cliquesLiberados,
  enviar,
}: {
  desafioId: string;
  estado: QuestaoEmJogo;
  pendente: boolean;
  erroRede: boolean;
  tecladoLiberado: boolean;
  identificacao: string;
  cliquesLiberados: boolean;
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
  const clique = useTolerancia(desafioId, "clique", questao.cliquesRestantes, zerar);
  const saida = useTolerancia(desafioId, "saida", questao.saidasRestantes, zerar);
  useTelaProtegida({
    protegida: questao.saidaZera,
    tecladoBloqueado: !tecladoLiberado,
    enviado,
    saidas,
    fora,
    dialogoProprio,
    zerar,
    aoClicarFora: clique.avisar,
    aoSair: saida.avisar,
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
          {textoFaixaBloqueada([
            questao.saidasRestantes > 0 ? "sair desta tela (depois dos avisos)" : "sair desta tela",
            tecladoLiberado ? null : "apertar qualquer tecla",
            cliquesLiberados
              ? null
              : questao.cliquesRestantes
                ? "clicar fora das alternativas e dos botões (depois dos avisos)"
                : "clicar fora das alternativas e dos botões",
          ])}
        </p>
      ) : (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
          🔎 Pesquisa liberada: pode consultar, o tempo continua correndo.
        </p>
      )}
      {[saida.aviso, clique.aviso].filter(Boolean).map((a) => (
        <p
          key={a}
          role="alert"
          className="rounded-lg bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-900"
        >
          {a}
        </p>
      ))}
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
  desafioId,
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
  desafioId: string;
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
  const clique = useTolerancia(desafioId, "clique", verificacao.cliquesRestantes, zerar);
  const saida = useTolerancia(desafioId, "saida", verificacao.saidasRestantes, zerar);
  useTelaProtegida({
    protegida: verificacao.saidaZera,
    tecladoBloqueado: !tecladoLiberado,
    enviado,
    saidas,
    fora,
    dialogoProprio,
    zerar,
    aoClicarFora: clique.avisar,
    aoSair: saida.avisar,
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
      {[saida.aviso, clique.aviso].filter(Boolean).map((a) => (
        <p
          key={a}
          role="alert"
          className="rounded-lg bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-900"
        >
          {a}
        </p>
      ))}
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
