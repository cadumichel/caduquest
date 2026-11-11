"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CamposEspecial } from "@/components/CamposEspecial";
import { Aviso, Botao, Subtitulo } from "@/components/ui";
import { formatarMultiplicador, pontosDoEspecial } from "@/lib/especial";
import { salvarEspecial, type EstadoForm } from "../../actions";

/** Liga, desliga ou ajusta o desafio especial (só antes de alguém começar). */
export function EspecialDesafio({
  id,
  especial,
  multiplicador,
  percentual,
  pontosBase,
  jaComecaram,
  padraoMultiplicador,
  padraoPercentual,
}: {
  id: string;
  especial: boolean;
  multiplicador: number | null;
  percentual: number | null;
  pontosBase: number;
  jaComecaram: number;
  padraoMultiplicador: number;
  padraoPercentual: number;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<EstadoForm>({});
  const [ligado, setLigado] = useState(especial);
  const [mult, setMult] = useState(multiplicador ?? padraoMultiplicador);
  const [pct, setPct] = useState(percentual ?? padraoPercentual);
  const travado = jaComecaram > 0;

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarEspecial(id, { especial: ligado, multiplicador: mult, tempo_percentual: pct });
      setMsg(r);
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-3">
      <Subtitulo>★ Desafio especial</Subtitulo>
      {travado ? (
        <p className="text-sm text-slate-600">
          {especial
            ? `Especial: ${formatarMultiplicador(multiplicador)} pontos, ${percentual && percentual < 100 ? `${percentual}% do tempo` : "tempo normal"}.`
            : "Desafio comum."}{" "}
          Como {jaComecaram} aluno(s) já começaram, os pontos e o tempo não mudam mais.
        </p>
      ) : (
        <>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={ligado} onChange={(e) => setLigado(e.target.checked)} /> Marcar como
            especial
          </label>
          {ligado && (
            <>
              <CamposEspecial multiplicador={mult} percentual={pct} onMultiplicador={setMult} onPercentual={setPct} />
              <p className="text-xs text-slate-600">
                Cada acerto vale {pontosDoEspecial(pontosBase, mult)} pontos ({pontosBase} ×{" "}
                {formatarMultiplicador(mult)}).
              </p>
            </>
          )}
          {msg.erro && <Aviso>{msg.erro}</Aviso>}
          {msg.ok && <Aviso tipo="ok">{msg.ok}</Aviso>}
          <Botao variante="secundario" disabled={pendente} onClick={salvar}>
            {pendente ? "Salvando…" : "Salvar"}
          </Botao>
        </>
      )}
    </div>
  );
}
