import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { Avatar } from "@/components/Avatar";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasDaTurma } from "@/lib/medalhas";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export default async function LayoutAluno({ children }: LayoutProps<"/aluno">) {
  const aluno = await exigirAluno();
  const medalhas = await medalhasDaTurma(criarClienteAdmin(), aluno.turmaId);
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/aluno" className="font-extrabold tracking-tight text-marca-700">
            CaduQuest
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/aluno">Mapa</Link>
            <Link href="/aluno/ranking">Ranking</Link>
            <Link href="/aluno/perfil" title="Meu perfil" aria-label="Meu perfil">
              <Avatar avatar={aluno.avatar} cor={aluno.cor} medalhas={medalhas.get(aluno.id) ?? 0} tamanho={32} />
            </Link>
            <form action={sair}>
              <button className="text-slate-500" title={`${aluno.apelido} · ${aluno.turmaNome}`}>
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
