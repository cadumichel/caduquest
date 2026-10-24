import Link from "next/link";
import { exigirProfessor } from "@/lib/professor";
import { sairProfessor } from "../login/actions";

const LINKS = [
  { href: "/professor", rotulo: "Início" },
  { href: "/professor/questoes", rotulo: "Banco de questões" },
  { href: "/professor/gerar", rotulo: "Gerar com o Claude" },
];

export default async function LayoutProfessor({ children }: { children: React.ReactNode }) {
  const { email } = await exigirProfessor();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/professor" className="font-extrabold tracking-tight text-marca-700">
            CaduQuest <span className="font-medium text-slate-400">· professor</span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-4 text-sm font-medium">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-slate-700 hover:text-marca-700">
                {l.rotulo}
              </Link>
            ))}
          </nav>
          <form action={sairProfessor} className="text-sm text-slate-500">
            <span className="mr-3 hidden sm:inline">{email}</span>
            <button className="hover:text-slate-800">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
