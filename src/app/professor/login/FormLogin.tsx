"use client";
import { BotaoEnviar, PendenteForm } from "@/components/BotaoEnviar";
import { useAcaoSemReset } from "@/components/useAcaoSemReset";
import { Aviso, Campo, Entrada } from "@/components/ui";
import { entrarComEmail } from "./actions";

export function FormLogin() {
  const { estado, onSubmit, pendente } = useAcaoSemReset(entrarComEmail);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PendenteForm value={pendente}>
        {estado.erro && <Aviso>{estado.erro}</Aviso>}
        <Campo rotulo="E-mail">
          <Entrada name="email" type="email" required autoComplete="email" />
        </Campo>
        <Campo rotulo="Senha">
          <Entrada name="senha" type="password" required autoComplete="current-password" />
        </Campo>
        <BotaoEnviar className="w-full" pendente="Entrando…">
          Entrar
        </BotaoEnviar>
      </PendenteForm>
    </form>
  );
}
