"use client";
import { useState, useTransition, type ReactNode } from "react";
import { Botao, Entrada } from "./ui";

/**
 * Exclusão que não tem volta: o professor precisa digitar o nome exato antes de o botão liberar.
 * A server action recebe o nome digitado e confere de novo no servidor.
 */
export function ExcluirComConfirmacao({
  acao,
  nome,
  rotulo,
  children,
}: {
  acao: (nomeDigitado: string) => Promise<{ erro?: string } | void>;
  nome: string;
  rotulo: string;
  children: ReactNode;
}) {
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const confere = digitado.trim() === nome.trim();

  return (
    <details className="rounded-lg border border-red-200 bg-red-50/60 p-3">
      <summary className="cursor-pointer text-sm font-medium text-red-700">{rotulo}</summary>
      <div className="mt-3 space-y-3 text-sm text-red-900">
        {children}
        <p className="font-semibold">Isso não pode ser desfeito.</p>
        <label className="block space-y-1">
          <span>
            Para confirmar, digite <span className="font-mono font-bold">{nome}</span>
          </span>
          <Entrada value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
        </label>
        {erro && <p className="text-red-700">{erro}</p>}
        <Botao
          type="button"
          variante="perigo"
          disabled={!confere || pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await acao(digitado.trim());
              if (r?.erro) setErro(r.erro);
            })
          }
        >
          {pendente ? "Excluindo…" : rotulo}
        </Botao>
      </div>
    </details>
  );
}
