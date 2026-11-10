"use client";
import { Entrada } from "@/components/ui";
import { VERIFICACOES_MAX, VERIFICACOES_MIN, verificacoesAutomaticas } from "@/lib/questoes/verificacao";
import { TOLERANCIA_MAX, TOLERANCIA_MIN, type RegraCliques } from "@/lib/tela-protegida";

export type Regras = {
  regraCliques: RegraCliques;
  /** Texto do campo: número de cliques tolerados. */
  tolerancia: string;
  /** Texto do campo: vazio = automático. */
  verificacoes: string;
};

const OPCOES_CLIQUES: { regra: RegraCliques; titulo: string; texto: string }[] = [
  {
    regra: "proibido",
    titulo: "Proibido (padrão)",
    texto: "O primeiro clique fora das alternativas e dos botões zera a questão.",
  },
  {
    regra: "tolerancia",
    titulo: "Tolerância com aviso",
    texto: "Os primeiros cliques fora só mostram um aviso ao aluno; depois deles, clicar fora zera a questão.",
  },
  {
    regra: "permitido",
    titulo: "Permitido",
    texto: "Clicar fora não zera nem avisa. Sair da tela, teclado e extensões continuam valendo.",
  },
];

/**
 * Regras do desafio: o que fazer com cliques fora das alternativas (só com a
 * pesquisa bloqueada) e quantas questões teste (verificações de leitura) cada
 * aluno recebe. Campos controlados, usados ao criar e na página do desafio.
 */
export function CamposRegras({
  valor,
  onChange,
  pesquisaBloqueada,
  totalQuestoes,
}: {
  valor: Regras;
  onChange: (v: Regras) => void;
  pesquisaBloqueada: boolean;
  totalQuestoes: number;
}) {
  const automatico = verificacoesAutomaticas(totalQuestoes);
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-700">🖱️ Clique fora das alternativas</legend>
        {!pesquisaBloqueada && (
          <p className="text-xs text-slate-500">
            Só vale com a pesquisa bloqueada. Com a pesquisa liberada, cliques são livres.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {OPCOES_CLIQUES.map((o) => (
            <label
              key={o.regra}
              className="flex cursor-pointer items-start gap-2 rounded-xl border-2 border-slate-200 p-3 text-sm has-checked:border-marca-600 has-checked:bg-marca-50"
            >
              <input
                type="radio"
                className="mt-1"
                name="regra_cliques"
                checked={valor.regraCliques === o.regra}
                onChange={() => onChange({ ...valor, regraCliques: o.regra })}
              />
              <span>
                <strong>{o.titulo}</strong>
                <span className="block text-xs text-slate-500">{o.texto}</span>
              </span>
            </label>
          ))}
        </div>
        {valor.regraCliques === "tolerancia" && (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">Cliques tolerados por aluno no desafio:</span>
            <span className="w-20">
              <Entrada
                type="number"
                min={TOLERANCIA_MIN}
                max={TOLERANCIA_MAX}
                value={valor.tolerancia}
                onChange={(e) => onChange({ ...valor, tolerancia: e.target.value })}
              />
            </span>
          </label>
        )}
      </fieldset>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">📖 Questões teste (verificação de leitura) por aluno</span>
        <span className="block w-32">
          <Entrada
            type="number"
            min={VERIFICACOES_MIN}
            max={VERIFICACOES_MAX}
            placeholder={`${automatico} (automático)`}
            value={valor.verificacoes}
            onChange={(e) => onChange({ ...valor, verificacoes: e.target.value })}
          />
        </span>
        <span className="block text-xs text-slate-500">
          Em branco: 2 a cada 10 questões ({automatico} neste desafio). 0 = sem questões teste. Ficam espalhadas pelo
          desafio, sorteadas para cada aluno; questões relâmpago e sem tema não recebem.
        </span>
      </label>
    </div>
  );
}

/** Converte os campos para o que vai ao servidor. */
export function regrasParaEnvio(v: Regras) {
  return {
    regra_cliques: v.regraCliques,
    tolerancia_cliques: v.regraCliques === "tolerancia" ? Number(v.tolerancia) : null,
    verificacoes: v.verificacoes.trim() === "" ? null : Number(v.verificacoes),
  };
}
