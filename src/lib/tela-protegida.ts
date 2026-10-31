/** Por que uma questão de pesquisa bloqueada foi zerada. */
export const MOTIVOS_ZERADA = ["saida", "teclado", "tela_alterada", "clique_fora"] as const;
export type MotivoZerada = (typeof MOTIVOS_ZERADA)[number];

export const ehMotivoZerada = (v: unknown): v is MotivoZerada =>
  typeof v === "string" && (MOTIVOS_ZERADA as readonly string[]).includes(v);

export const AVISO_ZERADA: Record<MotivoZerada, string> = {
  saida: "Você saiu da tela durante a questão anterior, então ela valeu zero.",
  teclado: "Você apertou uma tecla durante a questão anterior, então ela valeu zero.",
  // Genérico de propósito: o aluno não deve saber que extensões são detectadas.
  tela_alterada: "A questão anterior valeu zero porque as regras da pesquisa bloqueada não foram seguidas.",
  clique_fora: "Você clicou fora das alternativas e dos botões durante a questão anterior, então ela valeu zero.",
};

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
