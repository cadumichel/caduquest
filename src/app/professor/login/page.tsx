import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Botao, Cartao } from "@/components/ui";
import { entrarComGoogle } from "./actions";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Professor" };

const ERROS: Record<string, string> = {
  "nao-autorizado": "Esta conta não está autorizada como professor.",
  google: "Não foi possível entrar com o Google.",
};

export default async function LoginProfessor({ searchParams }: PageProps<"/professor/login">) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-10">
      <Link href="/" className="mb-1 block text-center text-2xl font-extrabold tracking-tight">
        CaduQuest
      </Link>
      <p className="mb-6 text-center text-sm text-slate-500">Área do professor</p>
      <Cartao className="space-y-4">
        {typeof erro === "string" && ERROS[erro] && <Aviso>{ERROS[erro]}</Aviso>}
        <FormLogin />
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> ou <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action={entrarComGoogle}>
          <Botao variante="secundario" className="w-full">
            Entrar com Google
          </Botao>
        </form>
      </Cartao>
    </main>
  );
}
