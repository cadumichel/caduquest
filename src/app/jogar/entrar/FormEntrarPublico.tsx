"use client";
import { useState } from "react";
import { Avatar, CORES_AVATAR } from "@/components/Avatar";
import { BotaoEnviar, PendenteForm } from "@/components/BotaoEnviar";
import { useAcaoSemReset } from "@/components/useAcaoSemReset";
import { Aviso, Campo, Entrada } from "@/components/ui";
import { INICIAIS, PERSONAGENS } from "@/lib/personagens";
import { entrarPublico } from "../actions";

export function FormEntrarPublico({ aviso }: { aviso?: string }) {
  const { estado, onSubmit, pendente } = useAcaoSemReset(entrarPublico);
  const [modo, setModo] = useState<"entrar" | "cadastrar">("cadastrar");
  const [avatar, setAvatar] = useState(INICIAIS[0]);
  const [cor, setCor] = useState(0);
  const cadastro = modo === "cadastrar";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PendenteForm value={pendente}>
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {(["cadastrar", "entrar"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`rounded-lg py-2 ${modo === m ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {m === "cadastrar" ? "Criar conta" : "Já tenho conta"}
            </button>
          ))}
        </div>
        <input type="hidden" name="modo" value={modo} />
        {aviso && <Aviso tipo="info">{aviso}</Aviso>}
        {estado.erro && <Aviso>{estado.erro}</Aviso>}

        <Campo
          rotulo="Apelido"
          dica={cadastro ? "É o nome que aparece no ranking. Não use seu nome completo." : undefined}
        >
          <Entrada name="apelido" required minLength={2} maxLength={20} autoComplete="username" />
        </Campo>
        {cadastro && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-700">Escolha seu personagem</legend>
            <div className="mb-2 flex items-center gap-3">
              <Avatar avatar={avatar} cor={cor} tamanho={56} />
              <span className="text-sm font-semibold">{PERSONAGENS[avatar].nome}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-50 p-1">
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
            <input type="hidden" name="avatar" value={avatar} />
            <input type="hidden" name="cor" value={cor} />
          </fieldset>
        )}
        <Campo
          rotulo={cadastro ? "Crie um PIN de 4 números" : "Seu PIN"}
          dica={cadastro ? "É a sua senha. Anote em lugar seguro: sem e-mail, não dá para recuperar." : undefined}
        >
          <Entrada
            name="pin"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            type="password"
            autoComplete={cadastro ? "new-password" : "current-password"}
            className="text-center font-mono text-lg tracking-[0.5em]"
          />
        </Campo>
        <BotaoEnviar className="w-full py-3 text-base" pendente="Entrando…">
          {cadastro ? "Criar e jogar" : "Entrar"}
        </BotaoEnviar>
      </PendenteForm>
    </form>
  );
}
