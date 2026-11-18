"use client";
import { useEffect, useRef } from "react";
import { BotaoEnviar, PendenteForm } from "@/components/BotaoEnviar";
import { useAcaoSemReset } from "@/components/useAcaoSemReset";
import { Aviso, Campo, Entrada } from "@/components/ui";
import { SENHA_MIN } from "@/lib/senha-professor";
import { trocarSenha } from "./senha-actions";

export function FormSenha({ email }: { email: string }) {
  const { estado, onSubmit, pendente } = useAcaoSemReset(trocarSenha);
  const formRef = useRef<HTMLFormElement>(null);

  // Deu certo: limpa os campos. Deu erro: mantém o que foi digitado.
  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <PendenteForm value={pendente}>
        {/* Ajuda o gerenciador de senhas do navegador a salvar a senha nova na conta certa. */}
        <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
        {estado.erro && <Aviso>{estado.erro}</Aviso>}
        {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
        <Campo rotulo="Senha atual">
          <Entrada name="atual" type="password" required autoComplete="current-password" />
        </Campo>
        <Campo rotulo="Nova senha" dica={`Pelo menos ${SENHA_MIN} caracteres.`}>
          <Entrada name="nova" type="password" required minLength={SENHA_MIN} autoComplete="new-password" />
        </Campo>
        <Campo rotulo="Repita a nova senha">
          <Entrada name="confirmacao" type="password" required minLength={SENHA_MIN} autoComplete="new-password" />
        </Campo>
        <BotaoEnviar pendente="Trocando…">Trocar senha</BotaoEnviar>
      </PendenteForm>
    </form>
  );
}
