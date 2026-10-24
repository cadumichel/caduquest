"use client";
import { BotaoEnviar, PendenteForm } from "@/components/BotaoEnviar";
import { useAcaoSemReset } from "@/components/useAcaoSemReset";
import { AreaTexto, Aviso, Campo, Cartao, Entrada, Selecao } from "@/components/ui";
import { HABILIDADES } from "@/lib/habilidades";
import { NOME_TIPO, TIPOS } from "@/lib/questoes/tipos";
import { gerarQuestoes } from "./actions";

export function FormGerar({ capitulos }: { capitulos: string[] }) {
  const { estado, onSubmit, pendente } = useAcaoSemReset(gerarQuestoes);
  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
      <PendenteForm value={pendente}>
        <Cartao className="space-y-4">
          <Campo rotulo="Capítulo ou tema">
            <Entrada name="capitulo" list="caps" required placeholder="Cap. 5 – Revolução Francesa" />
            <datalist id="caps">
              {capitulos.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo rotulo="Série">
              <Entrada name="serie" placeholder="8º ano" />
            </Campo>
            <Campo rotulo="Quantidade">
              <Entrada name="quantidade" type="number" min={1} max={15} defaultValue={10} />
            </Campo>
            <Campo rotulo="Dificuldade">
              <Selecao name="dificuldade" defaultValue="misturada">
                <option value="misturada">Misturada</option>
                <option value="facil">Fácil</option>
                <option value="media">Média</option>
                <option value="dificil">Difícil</option>
              </Selecao>
            </Campo>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-700">Tipos</legend>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {TIPOS.map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input type="checkbox" name="tipos" value={t} defaultChecked /> {NOME_TIPO[t]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-700">Habilidades (nenhuma = todas)</legend>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {HABILIDADES.map((h) => (
                <label key={h} className="flex items-center gap-2">
                  <input type="checkbox" name="habilidades" value={h} /> {h}
                </label>
              ))}
            </div>
          </fieldset>
        </Cartao>
        <Cartao className="space-y-4">
          <Campo rotulo="Texto da apostila (referência)" dica="Cole o trecho do capítulo. Não inclua dados de alunos.">
            <AreaTexto name="referencia" rows={9} />
          </Campo>
          <Campo
            rotulo="Questão de prova como modelo (opcional)"
            dica="Serve para calibrar nível e habilidade. O Claude não a reproduz."
          >
            <AreaTexto name="questaoModelo" rows={4} />
          </Campo>
          {estado.erro && <Aviso>{estado.erro}</Aviso>}
          <BotaoEnviar className="w-full" pendente="Gerando… (pode levar 1 a 2 minutos)">
            ✨ Gerar lote em rascunho
          </BotaoEnviar>
          <p className="text-xs text-slate-500">
            Nada é publicado sem a sua revisão: o lote entra no banco como rascunho.
          </p>
        </Cartao>
      </PendenteForm>
    </form>
  );
}
