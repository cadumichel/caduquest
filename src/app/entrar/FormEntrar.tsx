"use client";
import { useState } from "react";
import { Avatar, CORES_AVATAR } from "@/components/Avatar";
import { BotaoEnviar, PendenteForm } from "@/components/BotaoEnviar";
import { useAcaoSemReset } from "@/components/useAcaoSemReset";
import { Aviso, Campo, Entrada } from "@/components/ui";
import { INICIAIS, PERSONAGENS } from "@/lib/personagens";
import { entrar, trocarConta } from "./actions";

type Lembrado = { codigo: string; apelido: string; avatar: number; cor: number };

export function FormEntrar({ aviso, lembrado }: { aviso?: string; lembrado: Lembrado | null }) {
  const { estado, onSubmit, pendente } = useAcaoSemReset(entrar);
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [avatar, setAvatar] = useState(INICIAIS[0]);
  const [cor, setCor] = useState(0);

  const campoPin = (cadastro: boolean) => (
    <Campo
      rotulo={cadastro ? "Crie sua senha (PIN de 4 números)" : "Sua senha (PIN)"}
      dica={
        cadastro
          ? "O PIN é a sua senha: 4 números que só você sabe. Você vai digitá-lo toda vez que entrar. Anote em lugar seguro e não conte para ninguém."
          : "São os 4 números que você criou no primeiro acesso."
      }
    >
      <Entrada
        name="pin"
        required
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        type="password"
        autoFocus={!cadastro && !!lembrado}
        autoComplete={cadastro ? "new-password" : "current-password"}
        className="text-center font-mono text-lg tracking-[0.5em]"
      />
    </Campo>
  );

  // Já entrou neste aparelho: só falta o PIN.
  if (lembrado) {
    return (
      <div className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <PendenteForm value={pendente}>
            <div className="flex flex-col items-center gap-2">
              <Avatar avatar={lembrado.avatar} cor={lembrado.cor} tamanho={88} />
              <p className="text-lg font-bold">Olá, {lembrado.apelido}!</p>
            </div>
            <input type="hidden" name="modo" value="entrar" />
            <input type="hidden" name="codigo" value={lembrado.codigo} />
            <input type="hidden" name="apelido" value={lembrado.apelido} />
            {aviso && <Aviso tipo="info">{aviso}</Aviso>}
            {estado.erro && <Aviso>{estado.erro}</Aviso>}
            {campoPin(false)}
            <BotaoEnviar className="w-full py-3 text-base" pendente="Entrando…">
              Entrar
            </BotaoEnviar>
          </PendenteForm>
        </form>
        <form action={trocarConta}>
          <button type="submit" className="w-full text-center text-sm text-marca-700 underline">
            Não é você? Entrar com outra conta
          </button>
        </form>
      </div>
    );
  }

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
        {modo === "cadastrar" && (
          <>
            <Campo rotulo="Nome completo" dica="Só o professor vê. Ele usa para saber quem é você.">
              <Entrada name="nome_real" required minLength={5} maxLength={80} autoComplete="name" />
            </Campo>
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-700">Escolha seu personagem</legend>
              <div className="mb-2 flex items-center gap-3">
                <Avatar avatar={avatar} cor={cor} tamanho={56} />
                <span className="text-sm font-semibold">{PERSONAGENS[avatar].nome}</span>
              </div>
              <div className="grid max-h-56 grid-cols-5 gap-1 overflow-y-auto rounded-xl bg-slate-50 p-1">
                {INICIAIS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatar(i)}
                    aria-label={PERSONAGENS[i].nome}
                    aria-pressed={avatar === i}
                    className={`flex justify-center rounded-lg p-1 ${avatar === i ? "bg-marca-100 ring-2 ring-marca-600" : ""}`}
                  >
                    <Avatar avatar={i} cor={cor} tamanho={40} />
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CORES_AVATAR.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(i)}
                    aria-label={`Cor ${i + 1}`}
                    aria-pressed={cor === i}
                    className={`size-7 rounded-full ${cor === i ? "ring-2 ring-slate-800 ring-offset-2" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Vença desafios para liberar personagens especiais. Dá para trocar depois no perfil.
              </p>
              <input type="hidden" name="avatar" value={avatar} />
              <input type="hidden" name="cor" value={cor} />
            </fieldset>
          </>
        )}
        {campoPin(modo === "cadastrar")}
        <BotaoEnviar className="w-full py-3 text-base" pendente="Entrando…">
          {modo === "cadastrar" ? "Criar e entrar" : "Entrar"}
        </BotaoEnviar>
      </PendenteForm>
    </form>
  );
}
