import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { Avatar } from "@/components/Avatar";
import { MarcaCabecalho } from "@/components/Marca";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasDaTurmaDoAluno } from "@/lib/aluno-dados";
import { alunosDeTeste } from "@/lib/aluno-teste";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NavAluno } from "./NavAluno";

export default async function LayoutAluno({ children }: LayoutProps<"/aluno">) {
  const aluno = await exigirAluno();
  const [medalhas, deTeste] = await Promise.all([
    medalhasDaTurmaDoAluno(aluno.turmaId),
    alunosDeTeste(criarClienteAdmin(), aluno.turmaId),
  ]);
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-r from-marca-950 via-marca-900 to-marca-800 text-white shadow-lg shadow-marca-950/20">
        <div className="palco-aluno mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
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
      {deTeste.has(aluno.id) && (
        <p className="fora-do-foco bg-amber-100 px-4 py-1.5 text-center text-sm text-amber-900">
          Você está vendo como aluno de teste da turma {aluno.turmaNome}: nada aqui entra no ranking nem nas contas.{" "}
          <Link href={`/professor/turmas/${aluno.turmaId}`} className="font-semibold underline">
            Voltar ao painel
          </Link>
        </p>
      )}
      <main className="palco-aluno mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
