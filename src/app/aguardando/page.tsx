import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sair } from "@/app/entrar/actions";
import { Avatar } from "@/components/Avatar";
import { Botao, Cartao } from "@/components/ui";
import { obterAluno } from "@/lib/aluno-sessao";

export const metadata: Metadata = { title: "Aguardando aprovação" };

export default async function Aguardando() {
  const aluno = await obterAluno();
  if (!aluno) redirect("/entrar");
  if (aluno.aprovado) redirect("/aluno");

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
      <Cartao className="space-y-4 text-center">
        <Avatar avatar={aluno.avatar} cor={aluno.cor} tamanho={72} className="mx-auto" />
        <h1 className="text-xl font-bold">Quase lá, {aluno.apelido}!</h1>
        <p className="text-sm text-slate-600">
          Seu cadastro na turma {aluno.turmaNome} está aguardando a aprovação do professor. Assim que ele aprovar, você
          já pode jogar.
        </p>
        {/* GET simples: recarrega a página inteira e relê a aprovação. */}
        <form action="/aguardando" method="get">
          <Botao className="w-full">Verificar de novo</Botao>
        </form>
        <form action={sair}>
          <Botao variante="fantasma" className="w-full">
            Sair
          </Botao>
        </form>
      </Cartao>
    </main>
  );
}
