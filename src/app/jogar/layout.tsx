import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { MarcaCabecalho } from "@/components/Marca";
import { obterJogador } from "@/lib/publico/sessao";
import { sairPublico } from "./actions";

export const metadata: Metadata = { title: { template: "%s · Desafios de História", default: "Desafios de História" } };

/** Modo público: qualquer pessoa joga, sem turma. */
export default async function LayoutPublico({ children }: LayoutProps<"/jogar">) {
  const jogador = await obterJogador();
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-r from-marca-950 via-marca-900 to-marca-800 text-white shadow-lg shadow-marca-950/20">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
          <MarcaCabecalho href="/jogar" claro />
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link href="/jogar/ranking" className="text-marca-100 hover:text-white">
              🏆 Ranking
            </Link>
            {jogador ? (
              <>
                <span title={jogador.apelido}>
                  <Avatar avatar={jogador.avatar} cor={jogador.cor} tamanho={34} />
                </span>
                <form action={sairPublico}>
                  <button className="text-marca-200 hover:text-white">Sair</button>
                </form>
              </>
            ) : (
              <Link href="/jogar/entrar" className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
