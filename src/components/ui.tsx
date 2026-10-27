import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const variantes = {
  primario:
    "bg-gradient-to-b from-marca-500 to-marca-700 text-white shadow-md shadow-marca-700/25 hover:from-marca-600 hover:to-marca-800",
  secundario: "border border-marca-100 bg-marca-50 text-marca-800 hover:bg-marca-100",
  sucesso:
    "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-700/25 hover:from-emerald-600 hover:to-emerald-800",
  ouro: "bg-gradient-to-b from-ouro-claro to-ouro text-marca-950 shadow-md shadow-ouro-escuro/30 hover:to-ouro-escuro",
  perigo: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  fantasma: "text-marca-700 hover:bg-marca-50",
};
type Variante = keyof typeof variantes;

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return <button className={`${base} ${variantes[variante]} ${className}`} {...props} />;
}

export function BotaoLink({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={`${base} ${variantes[variante]} ${className}`} {...props} />;
}

export function Cartao({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`} {...props} />;
}

export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-extrabold tracking-tight text-marca-900">{children}</h1>
      {acao}
    </div>
  );
}

export function Subtitulo({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold">{children}</h2>;
}

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{rotulo}</span>
      {children}
      {dica && <span className="block text-xs text-slate-500">{dica}</span>}
    </label>
  );
}

export const classeInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-100";

export function Entrada(props: ComponentProps<"input">) {
  return <input {...props} className={`${classeInput} ${props.className ?? ""}`} />;
}

export function AreaTexto(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${classeInput} ${props.className ?? ""}`} />;
}

export function Selecao(props: ComponentProps<"select">) {
  return <select {...props} className={`${classeInput} ${props.className ?? ""}`} />;
}

export function Etiqueta({
  children,
  cor = "cinza",
}: {
  children: ReactNode;
  cor?: "cinza" | "verde" | "ambar" | "azul" | "vermelho";
}) {
  const cores = {
    cinza: "bg-slate-100 text-slate-700",
    verde: "bg-emerald-100 text-emerald-800",
    ambar: "bg-amber-100 text-amber-800",
    azul: "bg-marca-100 text-marca-700",
    vermelho: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cores[cor]}`}>
      {children}
    </span>
  );
}

export function Aviso({ children, tipo = "erro" }: { children: ReactNode; tipo?: "erro" | "info" | "ok" }) {
  const cores = {
    erro: "border-red-200 bg-red-50 text-red-800",
    info: "border-marca-100 bg-marca-50 text-marca-900",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return <p className={`rounded-lg border px-3 py-2 text-sm ${cores[tipo]}`}>{children}</p>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}
