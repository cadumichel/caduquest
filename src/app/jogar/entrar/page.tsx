import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Cartao } from "@/components/ui";
import { obterJogador } from "@/lib/publico/sessao";
import { FormEntrarPublico } from "./FormEntrarPublico";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPublico({ searchParams }: PageProps<"/jogar/entrar">) {
  if (await obterJogador()) redirect("/jogar");
  const { sessao } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-center text-2xl font-extrabold text-marca-900">Entrar para jogar</h1>
      <Cartao>
        <FormEntrarPublico
          aviso={
            sessao === "expirada" ? "Sua sessão terminou ou você entrou em outro aparelho. Entre de novo." : undefined
          }
        />
      </Cartao>
      <p className="text-center text-xs text-slate-500">
        Não pedimos e-mail nem nome: só um apelido, que aparece no ranking, e um PIN de 4 números.
      </p>
    </div>
  );
}
