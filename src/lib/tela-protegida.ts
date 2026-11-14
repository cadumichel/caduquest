/** Por que uma questão de pesquisa bloqueada foi zerada. */
export const MOTIVOS_ZERADA = ["saida", "teclado", "tela_alterada", "clique_fora", "sem_mouse"] as const;
export type MotivoZerada = (typeof MOTIVOS_ZERADA)[number];

export const ehMotivoZerada = (v: unknown): v is MotivoZerada =>
  typeof v === "string" && (MOTIVOS_ZERADA as readonly string[]).includes(v);

export const AVISO_ZERADA: Record<MotivoZerada, string> = {
  saida: "Você saiu da tela durante a questão anterior, então ela valeu zero.",
  teclado: "Você apertou uma tecla durante a questão anterior, então ela valeu zero.",
  // Genérico de propósito: o aluno não deve saber que extensões são detectadas.
  tela_alterada: "A questão anterior valeu zero porque as regras da pesquisa bloqueada não foram seguidas.",
  clique_fora: "Você clicou fora das alternativas e dos botões durante a questão anterior, então ela valeu zero.",
  // Genérico de propósito: o aluno não deve saber que o movimento do mouse é observado.
  sem_mouse: "A questão anterior valeu zero porque as regras da pesquisa bloqueada não foram seguidas.",
};

/**
 * O que acontece quando o aluno clica fora das alternativas e dos botões num
 * desafio sem consulta. Escolha do professor em cada desafio.
 * - proibido (padrão): o primeiro clique fora zera a questão.
 * - tolerancia: os N primeiros cliques fora do desafio só geram aviso; o
 *   seguinte zera a questão.
 * - permitido: clique fora não zera nem avisa.
 */
export const REGRAS_CLIQUES = ["proibido", "tolerancia", "permitido"] as const;
export type RegraCliques = (typeof REGRAS_CLIQUES)[number];
export const ehRegraCliques = (v: unknown): v is RegraCliques =>
  typeof v === "string" && (REGRAS_CLIQUES as readonly string[]).includes(v);

export const TOLERANCIA_MIN = 1;
export const TOLERANCIA_MAX = 20;
export const TOLERANCIA_PADRAO = 2;

export const problemaTolerancia = (n: number) =>
  !Number.isInteger(n) || n < TOLERANCIA_MIN || n > TOLERANCIA_MAX
    ? `Cliques tolerados: de ${TOLERANCIA_MIN} a ${TOLERANCIA_MAX}.`
    : null;

type ComRegraCliques = { regra_cliques?: string | null; tolerancia_cliques?: number | null };

/** Regra de cliques do desafio. Sem o SQL dela (ou sem escolha), proibido. */
export function regraCliques(d: ComRegraCliques): { regra: RegraCliques; tolerancia: number } {
  const regra = ehRegraCliques(d.regra_cliques) ? d.regra_cliques : "proibido";
  const tolerancia = Math.min(TOLERANCIA_MAX, Math.max(TOLERANCIA_MIN, d.tolerancia_cliques ?? TOLERANCIA_PADRAO));
  return { regra, tolerancia };
}

/**
 * Cliques fora que ainda passam só com aviso neste desafio, depois de `usados`.
 * 0 = o próximo zera a questão; null = cliques fora liberados.
 */
export function cliquesRestantes(d: ComRegraCliques, usados: number): number | null {
  const { regra, tolerancia } = regraCliques(d);
  if (regra === "permitido") return null;
  if (regra === "proibido") return 0;
  return Math.max(0, tolerancia - Math.max(0, usados));
}

/** Aviso ao aluno depois de um clique fora tolerado. Não cita o mouse. */
export function avisoCliqueTolerado(restantes: number) {
  return {
    titulo: "Você clicou fora da questão",
    texto:
      restantes > 0
        ? `Clique só nas alternativas e nos botões. Você ainda tem ${restantes} ${restantes === 1 ? "clique" : "cliques"} fora até a questão ser zerada.`
        : "Último aviso: o próximo clique fora das alternativas e dos botões zera a questão.",
  };
}

/** Resumo da regra para o professor. */
export function descreverRegraCliques(d: ComRegraCliques) {
  const { regra, tolerancia } = regraCliques(d);
  if (regra === "permitido") return "cliques fora liberados";
  if (regra === "proibido") return "clique fora zera";
  return `${tolerancia} ${tolerancia === 1 ? "clique fora tolerado" : "cliques fora tolerados"} (com aviso)`;
}

/**
 * Saída da tela (trocar de aba, de app ou de janela, sair da tela cheia) num
 * desafio sem consulta. proibido (padrão): a primeira saída zera a questão.
 * tolerancia: as N primeiras saídas do desafio só geram aviso.
 */
export const REGRAS_SAIDAS = ["proibido", "tolerancia"] as const;
export type RegraSaidas = (typeof REGRAS_SAIDAS)[number];
export const ehRegraSaidas = (v: unknown): v is RegraSaidas =>
  typeof v === "string" && (REGRAS_SAIDAS as readonly string[]).includes(v);

type ComRegraSaidas = { regra_saidas?: string | null; tolerancia_saidas?: number | null };

export function regraSaidas(d: ComRegraSaidas): { regra: RegraSaidas; tolerancia: number } {
  const regra = ehRegraSaidas(d.regra_saidas) ? d.regra_saidas : "proibido";
  const tolerancia = Math.min(TOLERANCIA_MAX, Math.max(TOLERANCIA_MIN, d.tolerancia_saidas ?? TOLERANCIA_PADRAO));
  return { regra, tolerancia };
}

/** Saídas que ainda passam só com aviso, depois de `usadas`. 0 = a próxima zera. */
export function saidasRestantes(d: ComRegraSaidas, usadas: number): number {
  const { regra, tolerancia } = regraSaidas(d);
  return regra === "proibido" ? 0 : Math.max(0, tolerancia - Math.max(0, usadas));
}

export function avisoSaidaTolerada(restantes: number) {
  return restantes > 0
    ? `⚠️ Você saiu da tela. Mais ${restantes} ${restantes === 1 ? "saída" : "saídas"} e a questão em que você estiver vale zero.`
    : "⚠️ Último aviso: se sair da tela de novo, a questão vale zero.";
}

export function descreverRegraSaidas(d: ComRegraSaidas) {
  const { regra, tolerancia } = regraSaidas(d);
  return regra === "proibido"
    ? "saída da tela zera"
    : `${tolerancia} ${tolerancia === 1 ? "saída tolerada" : "saídas toleradas"} (com aviso)`;
}

/** O que o aluno pode clicar durante a questão: alternativas, botões, links e alças de arrastar. */
const CLICAVEIS = 'button, a, input, label, select, textarea, [role="button"]';

/**
 * Clique de mouse fora de qualquer elemento clicável. Toques (celular) não
 * contam: esbarrões ao rolar a tela são comuns. Clique na barra de rolagem
 * também não conta.
 */
export function cliqueFora(e: Pick<PointerEvent, "pointerType" | "clientX" | "target">, larguraUtil: number) {
  if (e.pointerType !== "mouse" || e.clientX >= larguraUtil) return false;
  const alvo = e.target as Element | null;
  return !alvo?.closest?.(CLICAVEIS);
}

type EventoPonteiro = Pick<PointerEvent, "pointerType" | "isTrusted" | "movementX" | "movementY">;

/**
 * Movimento real do mouse ou do touchpad. O Chrome manda um "movimento" falso,
 * parado, quando a página muda debaixo do cursor: esse não conta.
 */
export const mouseMexeu = (e: EventoPonteiro) =>
  e.pointerType === "mouse" && e.isTrusted && (e.movementX !== 0 || e.movementY !== 0);

/**
 * Quantos movimentos reais o mouse precisa ter feito, desde que a questão
 * apareceu, para o clique valer. Uma mão no mouse ou no touchpad gera dezenas
 * até chegar na alternativa. O Claude no Chrome (testado em 2026-11-06) gera
 * um só: o cursor "salta" para o ponto e clica 1 ms depois.
 */
export const MOVIMENTOS_MIN = 3;

/**
 * Clique de mouse sem caminho de movimento desde que a questão apareceu
 * (nenhum movimento ou um salto só). Toque na tela, caneta e teclado (Enter)
 * não contam.
 */
export const cliqueSemMovimento = (e: Pick<PointerEvent, "pointerType" | "isTrusted">, movimentos: number) =>
  e.pointerType === "mouse" && e.isTrusted && movimentos < MOVIMENTOS_MIN;

/** Texto da marca d'água: quem está respondendo e quando. */
export function textoMarca(identificacao: string, agora = new Date()) {
  const quando = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(agora)
    .replace(",", "");
  return `${identificacao} · ${quando}`;
}

/** Teclas que o celular ou o sistema podem mandar sem o aluno digitar nada. */
const TECLAS_IGNORADAS = new Set(["AudioVolumeUp", "AudioVolumeDown", "AudioVolumeMute"]);
export const teclaConta = (key: string) => !TECLAS_IGNORADAS.has(key);

/** Elementos que o próprio Next.js ou o navegador acrescentam e que não mudam a questão. */
const TAGS_IGNORADAS = new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "NOSCRIPT",
  "TEMPLATE",
  "NEXT-ROUTE-ANNOUNCER",
  "NEXTJS-PORTAL",
]);

/**
 * Um elemento novo na página que não foi criado pelo React veio de fora do app,
 * em geral de uma extensão (botão de "responder com IA", marca-texto, barra
 * lateral). O React marca todo nó que cria com uma chave `__reactFiber$…`.
 */
export function elementoEstranho(no: Node): boolean {
  if (no.nodeType !== 1) return false;
  if (TAGS_IGNORADAS.has((no as Element).tagName.toUpperCase())) return false;
  return !Object.keys(no).some((k) => k.startsWith("__reactFiber$"));
}
