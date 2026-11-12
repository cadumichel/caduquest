"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/professor", rotulo: "Início", ativo: (p: string) => p === "/professor" },
  {
    href: "/professor/turmas",
    rotulo: "Turmas",
    ativo: (p: string) => /^\/professor\/(turmas|temporadas|desafios|alunos)/.test(p),
  },
  { href: "/professor/questoes", rotulo: "Questões", ativo: (p: string) => /^\/professor\/(questoes|gerar)/.test(p) },
  { href: "/professor/configuracoes", rotulo: "Configurações", ativo: (p: string) => p === "/professor/configuracoes" },
];

/** `pedidos`: alunos esperando aprovação, mostrados como contador em Turmas. */
export function MenuPainel({ pedidos = 0 }: { pedidos?: number }) {
  const caminho = usePathname();
  return (
    <nav className="flex flex-1 flex-wrap gap-1 text-sm font-semibold">
      {LINKS.map((l) => {
        const ativo = l.ativo(caminho);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={ativo ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 ${ativo ? "bg-white/15 text-ouro-claro" : "text-marca-100 hover:text-ouro-claro"}`}
          >
            {l.rotulo}
            {l.rotulo === "Turmas" && pedidos > 0 && (
              <span
                className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-xs text-marca-950"
                title={`${pedidos} ${pedidos === 1 ? "pedido de entrada" : "pedidos de entrada"} esperando aprovação`}
              >
                {pedidos}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
