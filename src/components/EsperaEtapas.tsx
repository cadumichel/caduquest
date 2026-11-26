import type { TipoQuestao } from "@/lib/questoes/tipos";

const TEXTO: Partial<Record<TipoQuestao, string>> = {
  conversa: "Responda cada fala com o botão Enviar. O botão de confirmar aparece quando a conversa terminar.",
  tabuleiro: "Avance casa por casa. O botão de confirmar aparece quando o caminho terminar.",
  conceito_secreto:
    "Descubra a palavra pelas letras da tela. O botão de confirmar aparece quando a palavra sair ou as letras erradas acabarem.",
};

/**
 * Ocupa o lugar do botão "Confirmar resposta" enquanto uma questão em etapas
 * (conversa, tabuleiro, conceito secreto) não terminou.
 */
export function EsperaEtapas({ tipo }: { tipo: TipoQuestao }) {
  return (
    <p className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-600">
      {TEXTO[tipo] ?? "Termine todas as etapas para confirmar a resposta."}
    </p>
  );
}
