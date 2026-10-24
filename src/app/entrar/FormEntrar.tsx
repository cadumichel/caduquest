"use client";
import { useState } from "react";
import { BotaoEnviar, PendenteForm } from "@/components/BotaoEnviar";
import { useAcaoSemReset } from "@/components/useAcaoSemReset";
import { Aviso, Campo, Entrada } from "@/components/ui";
import { entrar } from "./actions";

export function FormEntrar({ aviso }: { aviso?: string }) {
  const { estado, onSubmit, pendente } = useAcaoSemReset(entrar);
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PendenteForm value={pendente}>
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {(["entrar", "cadastrar"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`rounded-lg py-2 ${modo === m ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {m === "entrar" ? "Já tenho cadastro" : "Primeiro acesso"}
            </button>
          ))}
        </div>
        <input type="hidden" name="modo" value={modo} />

        {aviso && <Aviso tipo="info">{aviso}</Aviso>}
        {estado.erro && <Aviso>{estado.erro}</Aviso>}

        <Campo rotulo="Código da turma">
          <Entrada
            name="codigo"
            required
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            className="text-center font-mono text-lg tracking-[0.3em] uppercase"
            placeholder="ABC234"
          />
        </Campo>
        <Campo
          rotulo="Apelido"
          dica={modo === "cadastrar" ? "É o nome que a turma vê no ranking. Não use seu nome completo." : undefined}
        >
          <Entrada name="apelido" required minLength={2} maxLength={20} autoComplete="username" />
        </Campo>
        <Campo
          rotulo={modo === "cadastrar" ? "Crie um PIN de 4 números" : "PIN"}
          dica={modo === "cadastrar" ? "Guarde bem: você vai usá-lo sempre para entrar." : undefined}
        >
          <Entrada
            name="pin"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            type="password"
            autoComplete={modo === "cadastrar" ? "new-password" : "current-password"}
            className="text-center font-mono text-lg tracking-[0.5em]"
          />
        </Campo>
        <BotaoEnviar className="w-full py-3 text-base" pendente="Entrando…">
          {modo === "cadastrar" ? "Criar e entrar" : "Entrar"}
        </BotaoEnviar>
      </PendenteForm>
    </form>
  );
}
