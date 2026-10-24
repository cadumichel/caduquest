import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cartao } from "@/components/ui";
import { obterAluno } from "@/lib/aluno-sessao";
import { FormEntrar } from "./FormEntrar";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  if (await obterAluno()) redirect("/aluno");
  const { sessao } = await searchParams;
  const aviso =
    sessao === "expirada" ? "Sua sessão terminou ou você entrou em outro aparelho. Entre de novo." : undefined;

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
      <Link href="/" className="mb-6 block text-center text-2xl font-extrabold tracking-tight">
        CaduQuest
      </Link>
      <Cartao>
        <FormEntrar aviso={aviso} />
      </Cartao>
    </main>
  );
}
