"use client";

const OPCOES = [
  {
    bloqueada: false,
    titulo: "🔎 Pesquisa liberada",
    texto: "O aluno pode sair da tela para consultar livro, caderno ou internet. O tempo continua correndo.",
  },
  {
    bloqueada: true,
    titulo: "🚫 Pesquisa bloqueada",
    texto: "Trocar de aba, de app ou de janela durante uma questão faz ela valer zero. O aluno é avisado antes.",
  },
] as const;

/**
 * Escolha entre liberar ou bloquear a pesquisa fora da tela. Com `name`, vai
 * num formulário (valor "bloqueada" ou "liberada"); com `onChange`, é controlada.
 */
export function EscolhaPesquisa({
  bloqueada,
  onChange,
  name,
}: {
  bloqueada: boolean;
  onChange?: (bloqueada: boolean) => void;
  name?: string;
}) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-medium text-slate-700">Pesquisa durante o desafio</legend>
      {OPCOES.map((o) => (
        <label
          key={String(o.bloqueada)}
          className="flex cursor-pointer items-start gap-2 rounded-xl border-2 border-slate-200 p-3 text-sm has-checked:border-marca-600 has-checked:bg-marca-50"
        >
          <input
            type="radio"
            className="mt-1"
            name={name ?? "pesquisa"}
            value={o.bloqueada ? "bloqueada" : "liberada"}
            {...(onChange
              ? { checked: bloqueada === o.bloqueada, onChange: () => onChange(o.bloqueada) }
              : { defaultChecked: bloqueada === o.bloqueada })}
          />
          <span>
            <strong>{o.titulo}</strong>
            <span className="block text-xs text-slate-500">{o.texto}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
