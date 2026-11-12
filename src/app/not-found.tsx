import type { Metadata } from "next";
import { Logo } from "@/components/Marca";
import { BotaoLink } from "@/components/ui";

export const metadata: Metadata = { title: "Página não encontrada" };

/** Link quebrado ou item apagado: explica e oferece o caminho de volta. */
export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <Logo largura={220} />
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-marca-900">Página não encontrada</h1>
        <p className="text-slate-600">
          O endereço pode estar errado, ou o que estava aqui foi apagado (um desafio, uma turma ou uma questão).
        </p>
      </div>
      <BotaoLink href="/">Voltar ao início</BotaoLink>
    </main>
  );
}
