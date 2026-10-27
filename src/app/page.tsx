import { Logo } from "@/components/Marca";
import { BotaoLink } from "@/components/ui";

export default function Inicio() {
  return (
    <main className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-marca-100),transparent_65%)]" />
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <Logo largura={340} prioridade className="max-w-full drop-shadow-sm" />
        <p className="text-marca-900/80">
          Revisão de História em temporadas. Cada desafio conta para o ranking da turma.
        </p>
        <div className="flex w-full flex-col gap-3">
          <BotaoLink href="/entrar" className="py-4 text-base">
            Sou aluno
          </BotaoLink>
          <BotaoLink href="/professor" variante="secundario">
            Sou professor
          </BotaoLink>
        </div>
      </div>
    </main>
  );
}
