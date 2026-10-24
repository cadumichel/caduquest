import { BotaoLink } from "@/components/ui";

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div className="space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-marca-600 text-4xl text-white shadow-lg">
          ⚔️
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">CaduQuest</h1>
        <p className="text-slate-600">Revisão de História em temporadas. Cada desafio conta para o ranking da turma.</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <BotaoLink href="/entrar" className="py-4 text-base">
          Sou aluno
        </BotaoLink>
        <BotaoLink href="/professor" variante="secundario">
          Sou professor
        </BotaoLink>
      </div>
    </main>
  );
}
