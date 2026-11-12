"use client";
import type { ReactNode } from "react";
import { Entrada } from "@/components/ui";
import { DICAS_POR_TEMPORADA, ELIMINACOES_POR_TEMPORADA } from "@/lib/questoes/ajudas";
import { AJUDAS_MAX_DESAFIO, REGRAS_PADRAO, type DadosRegras } from "@/lib/questoes/regras-desafio";
import { VERIFICACOES_MAX, VERIFICACOES_MIN, verificacoesAutomaticas } from "@/lib/questoes/verificacao";
import {
  TOLERANCIA_MAX,
  TOLERANCIA_MIN,
  TOLERANCIA_PADRAO,
  type RegraCliques,
  type RegraSaidas,
} from "@/lib/tela-protegida";

export type ParteRegras = "consulta" | "questoes" | "ajudas" | "pontos";

/** Estado do formulário: números como texto (vazio = automático ou sem teto). */
export type Regras = {
  regraCliques: RegraCliques;
  toleranciaCliques: string;
  regraSaidas: RegraSaidas;
  toleranciaSaidas: string;
  verificacoes: string;
  eliminacoesMax: string;
  dicasMax: string;
  ordemFixa: boolean;
  embaralharAlternativas: boolean;
  tecladoBloqueado: boolean;
  gabaritoNunca: boolean;
  treinoLiberado: boolean;
  bonusRapidez: boolean;
};

const texto = (n: number | null) => (n === null ? "" : String(n));
const numero = (t: string) => (t.trim() === "" ? null : Number(t));

/** Do banco para o formulário. */
export function regrasParaForm(r: DadosRegras = REGRAS_PADRAO): Regras {
  return {
    regraCliques: r.regra_cliques,
    toleranciaCliques: String(r.tolerancia_cliques ?? TOLERANCIA_PADRAO),
    regraSaidas: r.regra_saidas,
    toleranciaSaidas: String(r.tolerancia_saidas ?? TOLERANCIA_PADRAO),
    verificacoes: texto(r.verificacoes),
    eliminacoesMax: texto(r.eliminacoes_max),
    dicasMax: texto(r.dicas_max),
    ordemFixa: r.ordem_fixa,
    embaralharAlternativas: r.embaralhar_alternativas,
    tecladoBloqueado: r.teclado_bloqueado,
    gabaritoNunca: r.gabarito_nunca,
    treinoLiberado: r.treino_liberado,
    bonusRapidez: r.bonus_rapidez,
  };
}

/** Do formulário para o servidor. */
export function regrasParaEnvio(v: Regras) {
  return {
    regra_cliques: v.regraCliques,
    tolerancia_cliques: v.regraCliques === "tolerancia" ? Number(v.toleranciaCliques) : null,
    regra_saidas: v.regraSaidas,
    tolerancia_saidas: v.regraSaidas === "tolerancia" ? Number(v.toleranciaSaidas) : null,
    verificacoes: numero(v.verificacoes),
    eliminacoes_max: numero(v.eliminacoesMax),
    dicas_max: numero(v.dicasMax),
    ordem_fixa: v.ordemFixa,
    embaralhar_alternativas: v.embaralharAlternativas,
    teclado_bloqueado: v.tecladoBloqueado,
    gabarito_nunca: v.gabaritoNunca,
    treino_liberado: v.treinoLiberado,
    bonus_rapidez: v.bonusRapidez,
  };
}

const OPCOES_CLIQUES: { regra: RegraCliques; titulo: string; texto: string }[] = [
  { regra: "proibido", titulo: "Proibido (padrão)", texto: "O primeiro clique fora zera a questão." },
  {
    regra: "tolerancia",
    titulo: "Tolerância com aviso",
    texto: "Os primeiros cliques fora só mostram um aviso; depois deles, zeram.",
  },
  { regra: "permitido", titulo: "Permitido", texto: "Clicar fora não zera nem avisa." },
];

const OPCOES_SAIDAS: { regra: RegraSaidas; titulo: string; texto: string }[] = [
  { regra: "proibido", titulo: "Proibido (padrão)", texto: "A primeira saída da tela zera a questão." },
  {
    regra: "tolerancia",
    titulo: "Tolerância com aviso",
    texto: "As primeiras saídas só mostram um aviso; depois delas, zeram.",
  },
];

function Grupo({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-800">{titulo}</legend>
      {nota && <p className="text-xs text-slate-500">{nota}</p>}
      {children}
    </fieldset>
  );
}

function Opcoes<T extends string>({
  nome,
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  nome: string;
  rotulo: string;
  opcoes: { regra: T; titulo: string; texto: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{rotulo}</p>
      <div className={`grid gap-2 ${opcoes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {opcoes.map((o) => (
          <label
            key={o.regra}
            className="flex cursor-pointer items-start gap-2 rounded-xl border-2 border-slate-200 p-2 text-sm has-checked:border-marca-600 has-checked:bg-marca-50"
          >
            <input
              type="radio"
              className="mt-1"
              name={nome}
              checked={valor === o.regra}
              onChange={() => onChange(o.regra)}
            />
            <span>
              <strong>{o.titulo}</strong>
              <span className="block text-xs text-slate-500">{o.texto}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  onChange,
  min,
  max,
  placeholder,
  dica,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  placeholder?: string;
  dica?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-slate-700">{rotulo}</span>
      <span className="block w-40">
        <Entrada
          type="number"
          min={min}
          max={max}
          placeholder={placeholder}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {dica && <span className="block text-xs text-slate-500">{dica}</span>}
    </label>
  );
}

function Caixa({
  rotulo,
  dica,
  marcado,
  onChange,
  desabilitado,
}: {
  rotulo: string;
  dica?: string;
  marcado: boolean;
  onChange: (v: boolean) => void;
  desabilitado?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2 text-sm ${desabilitado ? "opacity-50" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        className="mt-1"
        checked={marcado}
        disabled={desabilitado}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium text-slate-700">{rotulo}</span>
        {dica && <span className="block text-xs text-slate-500">{dica}</span>}
      </span>
    </label>
  );
}

/**
 * Regras do desafio, usadas ao criar e na página do desafio. Tudo começa no
 * padrão; o professor só mexe no que quiser.
 */
export function CamposRegras({
  valor,
  onChange,
  pesquisaBloqueada,
  totalQuestoes,
  partes,
}: {
  valor: Regras;
  onChange: (v: Regras) => void;
  pesquisaBloqueada: boolean;
  totalQuestoes: number;
  /** Só estes grupos (a página do desafio divide as regras em seções). Sem a lista, todos. */
  partes?: ParteRegras[];
}) {
  const ver = (p: ParteRegras) => !partes || partes.includes(p);
  const mudar = <K extends keyof Regras>(k: K, v: Regras[K]) => onChange({ ...valor, [k]: v });
  const automatico = verificacoesAutomaticas(totalQuestoes);
  return (
    <div className="space-y-4">
      {ver("consulta") && (
        <Grupo
          titulo="🚫 Sem consulta"
          nota={
            pesquisaBloqueada
              ? undefined
              : "Só vale com a pesquisa bloqueada. Com a pesquisa liberada, nada disso zera."
          }
        >
          <Opcoes
            nome="regra_cliques"
            rotulo="Clique fora das alternativas e dos botões"
            opcoes={OPCOES_CLIQUES}
            valor={valor.regraCliques}
            onChange={(v) => mudar("regraCliques", v)}
          />
          {valor.regraCliques === "tolerancia" && (
            <Numero
              rotulo="Cliques tolerados por aluno no desafio"
              valor={valor.toleranciaCliques}
              onChange={(v) => mudar("toleranciaCliques", v)}
              min={TOLERANCIA_MIN}
              max={TOLERANCIA_MAX}
            />
          )}
          <Opcoes
            nome="regra_saidas"
            rotulo="Saída da tela (trocar de aba, de app ou de janela)"
            opcoes={OPCOES_SAIDAS}
            valor={valor.regraSaidas}
            onChange={(v) => mudar("regraSaidas", v)}
          />
          {valor.regraSaidas === "tolerancia" && (
            <Numero
              rotulo="Saídas toleradas por aluno no desafio"
              valor={valor.toleranciaSaidas}
              onChange={(v) => mudar("toleranciaSaidas", v)}
              min={TOLERANCIA_MIN}
              max={TOLERANCIA_MAX}
            />
          )}
          <Caixa
            rotulo="Apertar uma tecla zera a questão"
            dica="Desmarcado, o teclado fica liberado para todos neste desafio. A liberação individual (acessibilidade) continua na página da turma."
            marcado={valor.tecladoBloqueado}
            onChange={(v) => mudar("tecladoBloqueado", v)}
          />
        </Grupo>
      )}

      {ver("questoes") && (
        <Grupo titulo="📝 Questões">
          <Numero
            rotulo="📖 Questões teste (verificação de leitura) por aluno"
            valor={valor.verificacoes}
            onChange={(v) => mudar("verificacoes", v)}
            min={VERIFICACOES_MIN}
            max={VERIFICACOES_MAX}
            placeholder={`${automatico} (automático)`}
            dica={`Em branco: 2 a cada 10 (${automatico} neste desafio). 0 = nenhuma. Espalhadas e sorteadas para cada aluno; relâmpago e questões sem tema não recebem.`}
          />
          <Caixa
            rotulo="Ordem fixa das questões"
            dica="Todos recebem na ordem em que o desafio foi montado. Desmarcado, cada aluno recebe numa ordem diferente."
            marcado={valor.ordemFixa}
            onChange={(v) => mudar("ordemFixa", v)}
          />
          <Caixa
            rotulo="Embaralhar as alternativas"
            dica="Desmarcado, as alternativas aparecem na ordem em que foram escritas (múltipla escolha, interpretação, fonte primária, V/F e intruso). Ordenar, ligar e classificar sempre embaralham."
            marcado={valor.embaralharAlternativas}
            onChange={(v) => mudar("embaralharAlternativas", v)}
          />
        </Grupo>
      )}

      {ver("ajudas") && (
        <Grupo
          titulo="🧰 Ajudas"
          nota={`A cota da temporada (${ELIMINACOES_POR_TEMPORADA} eliminações e ${DICAS_POR_TEMPORADA} dicas) continua valendo. Aqui dá para limitar mais neste desafio. Em branco = sem limite extra; 0 = desligada.`}
        >
          <div className="flex flex-wrap gap-4">
            <Numero
              rotulo="✂️ Eliminações neste desafio"
              valor={valor.eliminacoesMax}
              onChange={(v) => mudar("eliminacoesMax", v)}
              min={0}
              max={AJUDAS_MAX_DESAFIO}
              placeholder="Só a cota"
            />
            <Numero
              rotulo="💡 Dicas neste desafio"
              valor={valor.dicasMax}
              onChange={(v) => mudar("dicasMax", v)}
              min={0}
              max={AJUDAS_MAX_DESAFIO}
              placeholder="Só a cota"
            />
          </div>
        </Grupo>
      )}

      {ver("pontos") && (
        <Grupo titulo="🏁 Pontos e depois do desafio">
          <Caixa
            rotulo="⚡ Bônus por rapidez"
            dica="Acertar logo de cara vale até 50% a mais; o bônus cai até zero no fim do tempo. Erro não ganha bônus."
            marcado={valor.bonusRapidez}
            onChange={(v) => mudar("bonusRapidez", v)}
          />
          <Caixa
            rotulo="Nunca mostrar o gabarito aos alunos"
            dica="Nem depois de fechar. Também desliga o treino e tira estas questões da revisão de erros."
            marcado={valor.gabaritoNunca}
            onChange={(v) => mudar("gabaritoNunca", v)}
          />
          <Caixa
            rotulo="Refazer como treino depois que fechar"
            dica="O treino não vale ranking nem XP."
            marcado={valor.treinoLiberado && !valor.gabaritoNunca}
            desabilitado={valor.gabaritoNunca}
            onChange={(v) => mudar("treinoLiberado", v)}
          />
        </Grupo>
      )}
    </div>
  );
}
