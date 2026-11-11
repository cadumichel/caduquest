import Link from "next/link";

export type Aba = { id: string; rotulo: string; href: string; contagem?: number };

/** Abas por link (o estado fica na URL, ?aba=...), para páginas do servidor. */
export function Abas({ abas, atual }: { abas: Aba[]; atual: string }) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1" aria-label="Seções">
      {abas.map((a) => {
        const ativa = a.id === atual;
        return (
          <Link
            key={a.id}
            href={a.href}
            scroll={false}
            aria-current={ativa ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap ${
              ativa
                ? "border-marca-600 text-marca-800"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {a.rotulo}
            {a.contagem !== undefined && a.contagem > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                {a.contagem}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Lê ?aba= e devolve uma das opções (a primeira, se vier vazio ou desconhecido). */
export function abaAtual<T extends string>(valor: string | string[] | undefined, opcoes: readonly T[]): T {
  return typeof valor === "string" && (opcoes as readonly string[]).includes(valor) ? (valor as T) : opcoes[0];
}

/** Número grande com rótulo, para o topo das páginas de resultado. */
export function Numero({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${destaque ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-2xl font-extrabold text-marca-900 tabular-nums">{valor}</p>
      <p className="text-xs text-slate-500">{rotulo}</p>
    </div>
  );
}
