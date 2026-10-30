"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/aluno", rotulo: "Início", icone: "/ilustracoes/menu-inicio.svg" },
  { href: "/aluno/ranking", rotulo: "Ranking", icone: "/ilustracoes/menu-ranking.svg" },
  { href: "/aluno/perfil", rotulo: "Perfil", icone: "/ilustracoes/menu-perfil.svg" },
];

/** Menu do aluno com os ícones ilustrados do guia visual. */
export function NavAluno() {
  const caminho = usePathname();
  return (
    <nav className="mx-auto grid max-w-2xl grid-cols-3 gap-1 px-2 pb-2">
      {ITENS.map((item) => {
        const ativo =
          item.href === "/aluno"
            ? caminho === "/aluno" || caminho.startsWith("/aluno/desafio") || caminho.startsWith("/aluno/revisao")
            : caminho.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`flex items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold transition ${
              ativo ? "bg-white text-marca-900 shadow" : "text-marca-100 hover:bg-white/10"
            }`}
          >
            <Image src={item.icone} alt="" width={30} height={30} className="size-7 object-contain" />
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
