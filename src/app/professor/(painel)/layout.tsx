import { MarcaCabecalho } from "@/components/Marca";
import { exigirProfessor } from "@/lib/professor";
import { sairProfessor } from "../login/actions";
import { MenuPainel } from "./MenuPainel";

export default async function LayoutProfessor({ children }: { children: React.ReactNode }) {
  const { email, supabase } = await exigirProfessor();
  const { count: pedidos } = await supabase
    .from("alunos")
    .select("id", { count: "exact", head: true })
    .eq("aprovado", false);
  return (
    <div className="flex flex-1 flex-col">
      <header className="print:hidden bg-gradient-to-r from-marca-950 via-marca-900 to-marca-800 text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <MarcaCabecalho href="/professor" claro sufixo="· professor" />
          <MenuPainel pedidos={pedidos ?? 0} />
          <form action={sairProfessor} className="text-sm text-marca-200">
            <span className="mr-3 hidden sm:inline">{email}</span>
            <button className="hover:text-white">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
