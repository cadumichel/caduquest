import { EsperaEtapas } from "@/components/EsperaEtapas";
import { Botao } from "@/components/ui";
import { oQueFalta, prontaParaEnviar, respostaCompleta } from "@/lib/questoes/apresentacao";
import { EM_ETAPAS, type Resposta, type Vista } from "@/lib/questoes/tipos";

/**
 * Botão "Confirmar resposta" de todas as telas de questão. Só libera com a
 * questão toda respondida: enviar pela metade fazia o aluno perder a questão
 * sem querer. Nos formatos em etapas, o botão só aparece no fim.
 */
export function ConfirmarResposta({
  vista,
  resposta,
  mexeu,
  pendente,
  rotuloPendente = "Enviando…",
  onConfirmar,
}: {
  vista: Vista;
  resposta: Resposta;
  /** O aluno já mexeu na resposta nesta tela (os formatos de ordenar já começam montados). */
  mexeu: boolean;
  pendente: boolean;
  rotuloPendente?: string;
  onConfirmar: () => void;
}) {
  if (EM_ETAPAS.includes(resposta.tipo) && !respostaCompleta(resposta)) return <EsperaEtapas tipo={resposta.tipo} />;
  const pronta = prontaParaEnviar(vista, resposta, mexeu);
  return (
    <div className="space-y-2">
      <Botao
        variante="sucesso"
        className="w-full py-4 text-base shadow-lg"
        disabled={pendente || !pronta}
        onClick={() => {
          if (pronta) onConfirmar();
        }}
      >
        {pendente ? rotuloPendente : "Confirmar resposta"}
      </Botao>
      {!pronta && <p className="text-center text-xs font-semibold text-slate-500">{oQueFalta(vista)}</p>}
    </div>
  );
}

/** "Pular questão", no topo da tela, ao lado da barra do tempo. */
export function BotaoPular({ disabled, onPular }: { disabled?: boolean; onPular: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPular}
      className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
    >
      Pular questão ⏭
    </button>
  );
}
