import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { Avatar } from "@/components/Avatar";
import { MarcaCabecalho } from "@/components/Marca";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasDaTurma } from "@/lib/medalhas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NavAluno } from "./NavAluno";

export default async function LayoutAluno({ children }: LayoutProps<"/aluno">) {
  const aluno = await exigirAluno();
  const medalhas = await medalhasDaTurma(criarClienteAdmin(), aluno.turmaId);
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-r from-marca-950 via-marca-900 to-marca-800 text-white shadow-lg shadow-marca-950/20">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
          <MarcaCabecalho href="/aluno" claro />
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/aluno/perfil" title="Meu perfil" aria-label="Meu perfil">
              <Avatar avatar={aluno.avatar} cor={aluno.cor} medalhas={medalhas.get(aluno.id) ?? 0} tamanho={36} />
            </Link>
            <form action={sair}>
              <button className="text-marca-200 hover:text-white" title={`${aluno.apelido} · ${aluno.turmaNome}`}>
                Sair
              </button>
            </form>
          </div>
        </div>
        <NavAluno />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
