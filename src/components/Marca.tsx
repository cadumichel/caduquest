import Image from "next/image";
import Link from "next/link";
import capacete from "../../public/marca/capacete.png";
import logoClaro from "../../public/marca/logo-claro.png";
import logo from "../../public/marca/logo.png";

/** Logo completo (capacete + CaduQuest + "História em desafios"). `claro` é a versão para fundo escuro. */
export function Logo({
  claro = false,
  largura = 280,
  className = "",
  prioridade = false,
}: {
  claro?: boolean;
  largura?: number;
  className?: string;
  prioridade?: boolean;
}) {
  return (
    <Image
      src={claro ? logoClaro : logo}
      alt="CaduQuest · História em desafios"
      style={{ width: largura, height: "auto" }}
      sizes={`${largura}px`}
      priority={prioridade}
      className={className}
    />
  );
}

/** Capacete + nome em texto, para cabeçalhos. */
export function MarcaCabecalho({ href, claro = false, sufixo }: { href: string; claro?: boolean; sufixo?: string }) {
  return (
    <Link href={href} className="flex items-center gap-1.5" aria-label="CaduQuest">
      <Image src={capacete} alt="" style={{ height: 34, width: "auto" }} sizes="40px" priority />
      <span className="text-xl leading-none font-black tracking-tight">
        <span className={claro ? "text-white" : "text-marca-900"}>Cadu</span>
        <span className="text-ouro">Quest</span>
      </span>
      {sufixo && <span className={`text-sm font-medium ${claro ? "text-marca-200" : "text-slate-400"}`}>{sufixo}</span>}
    </Link>
  );
}
