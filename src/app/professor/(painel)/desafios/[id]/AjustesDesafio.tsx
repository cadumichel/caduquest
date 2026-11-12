"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { CamposEspecial } from "@/components/CamposEspecial";
import { CamposRegras, regrasParaEnvio, regrasParaForm, type Regras } from "@/components/CamposRegras";
import { EscolhaPesquisa } from "@/components/EscolhaPesquisa";
import { Aviso, Botao, BotaoLink, Entrada, Etiqueta } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { formatarMultiplicador, pontosDoEspecial } from "@/lib/especial";
import type { DadosRegras } from "@/lib/questoes/regras-desafio";
import { RELAMPAGO_MAX_S, RELAMPAGO_MIN_S } from "@/lib/questoes/relampago";
import { tempoEfetivo, VERIFICACAO_MAX_S, VERIFICACAO_MIN_S } from "@/lib/questoes/tempos";
import { TEMPO_MAX_S, TEMPO_MIN_S } from "@/lib/questoes/tipos";
import { VERIFICACAO_TEMPO_S } from "@/lib/questoes/verificacao";
import {
  atualizarJanelaDesafio,
  definirGabaritoManual,
  encerrarDesafioAgora,
  excluirDesafio,
  liberarGabarito,
  salvarEspecial,
  salvarRegrasDesafio,
  salvarTemposDesafio,
  type EstadoForm,
} from "../../actions";

export type QuestaoComTempo = {
  id: string;
  enunciado: string;
  relampago: boolean;
  /** Tempo da própria questão (banco). */
  tempoQuestao: number;
  /** Tempo escrito para ela neste desafio (null = automático). */
  tempoNoDesafio: number | null;
};

type Props = {
  id: string;
  situacao: "agendado" | "aberto" | "encerrado";
  relampago: boolean;
  comecaram: number;
  janela: {
    titulo: string;
    /** datetime-local (Brasília), para os campos. */
    abreEm: string;
    fechaEm: string;
    fechaIso: string;
    pesquisaBloqueada: boolean;
  };
  regras: DadosRegras;
  tempos: { todas: number | null; verificacao: number | null; percentual: number | null; questoes: QuestaoComTempo[] };
  especial: {
    ligado: boolean;
    multiplicador: number | null;
    percentual: number | null;
    pontosBase: number;
    padraoMultiplicador: number;
    padraoPercentual: number;
  };
  gabarito: {
    manual: boolean;
    liberadoEm: string | null;
    visivelEm: string;
    visivel: boolean;
    nunca: boolean;
    /** A temporada segura todos os gabaritos até o encerramento (dd/mm/aaaa), se for o caso. */
    soNoEncerramento: string | null;
    /** Dia em que o gabarito guardado sai sozinho (encerramento da temporada), se a temporada libera. */
    encerramento: string | null;
  };
  /** Valores atuais em frases curtas, para o título de cada seção. */
  resumos: { janela: string; consulta: string; tempo: string; questoes: string; depois: string; especial: string };
};

const texto = (n: number | null) => (n === null ? "" : String(n));
const numero = (t: string) => (t.trim() === "" ? null : Number(t));
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const CAMPOS: Record<"consulta" | "questoes" | "pontos", (keyof Regras)[]> = {
  consulta: ["regraCliques", "toleranciaCliques", "regraSaidas", "toleranciaSaidas", "tecladoBloqueado"],
  questoes: ["verificacoes", "ordemFixa", "embaralharAlternativas", "eliminacoesMax", "dicasMax"],
  pontos: ["bonusRapidez", "gabaritoNunca", "treinoLiberado"],
};

/** Seção recolhível: título, valor atual e um ponto quando há mudança não salva. */
function Secao({
  titulo,
  resumo,
  mudou,
  aberta,
  children,
}: {
  titulo: string;
  resumo: string;
  mudou: boolean;
  aberta?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={aberta} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="text-slate-400 transition group-open:rotate-90">›</span>
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-marca-900">{titulo}</span>
          <span className="block truncate text-sm text-slate-500">{resumo}</span>
        </span>
        {mudou && <Etiqueta cor="ambar">alterado</Etiqueta>}
      </summary>
      <div className="space-y-4 border-t border-slate-100 px-4 py-4">{children}</div>
    </details>
  );
}

/**
 * Todos os ajustes do desafio numa tela, com um único botão de salvar.
 * Só as partes alteradas vão para o servidor, cada uma pela ação que já existia.
 */
export function AjustesDesafio(p: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<EstadoForm>({});

  const janela0 = { titulo: p.janela.titulo, abre: p.janela.abreEm, fecha: p.janela.fechaEm };
  const [janela, setJanela] = useState(janela0);
  const [bloqueada, setBloqueada] = useState(p.janela.pesquisaBloqueada);
  const regras0 = regrasParaForm(p.regras);
  const [regras, setRegras] = useState<Regras>(regras0);
  const tempos0 = {
    todas: texto(p.tempos.todas),
    verificacao: texto(p.tempos.verificacao),
    porQuestao: Object.fromEntries(p.tempos.questoes.map((q) => [q.id, texto(q.tempoNoDesafio)])),
  };
  const [tempos, setTempos] = useState(tempos0);
  const especial0 = {
    ligado: p.especial.ligado,
    mult: p.especial.multiplicador ?? p.especial.padraoMultiplicador,
    pct: p.especial.percentual ?? p.especial.padraoPercentual,
  };
  const [especial, setEspecial] = useState(especial0);
  const [manual, setManual] = useState(p.gabarito.manual);

  const mudou = {
    janela: !igual(janela, janela0) || bloqueada !== p.janela.pesquisaBloqueada,
    consulta: bloqueada !== p.janela.pesquisaBloqueada || CAMPOS.consulta.some((k) => regras[k] !== regras0[k]),
    questoes: CAMPOS.questoes.some((k) => regras[k] !== regras0[k]),
    pontos: CAMPOS.pontos.some((k) => regras[k] !== regras0[k]),
    tempos: !igual(tempos, tempos0),
    especial: !igual(especial, especial0),
    gabarito: manual !== p.gabarito.manual,
  };
  const regrasMudaram = !igual(regras, regras0);
  const quantas = [mudou.janela, regrasMudaram, mudou.tempos, mudou.especial, mudou.gabarito].filter(Boolean).length;
  const travadoEspecial = p.comecaram > 0;

  const salvar = () =>
    iniciar(async () => {
      const erros: string[] = [];
      const rodar = async (r: Promise<EstadoForm>) => {
        const v = await r;
        if (v.erro) erros.push(v.erro);
      };
      if (mudou.janela) {
        const f = new FormData();
        f.set("id", p.id);
        f.set("titulo", janela.titulo);
        f.set("abre_em", janela.abre);
        f.set("fecha_em", janela.fecha);
        f.set("pesquisa", bloqueada ? "bloqueada" : "liberada");
        await rodar(atualizarJanelaDesafio({}, f));
      }
      if (regrasMudaram) await rodar(salvarRegrasDesafio(p.id, regrasParaEnvio(regras)));
      if (mudou.tempos)
        await rodar(
          salvarTemposDesafio(p.id, {
            todas: numero(tempos.todas),
            verificacao: numero(tempos.verificacao),
            questoes: p.tempos.questoes.map((q) => ({
              questao_id: q.id,
              tempo: numero(tempos.porQuestao[q.id] ?? ""),
            })),
          }),
        );
      if (mudou.especial && !travadoEspecial)
        await rodar(
          salvarEspecial(p.id, {
            especial: especial.ligado,
            multiplicador: especial.mult,
            tempo_percentual: especial.pct,
          }),
        );
      if (mudou.gabarito) await rodar(definirGabaritoManual(p.id, manual));
      setMsg(erros.length ? { erro: erros.join(" ") } : { ok: "Alterações salvas." });
      router.refresh();
    });

  const acaoImediata = (pergunta: string, acao: () => Promise<EstadoForm>) =>
    confirm(pergunta) &&
    iniciar(async () => {
      setMsg(await acao());
      router.refresh();
    });

  const fixo = numero(tempos.todas);
  const g = p.gabarito;
  const statusGabarito = g.visivel
    ? { cor: "verde" as const, texto: "Gabarito visível para os alunos" }
    : g.manual && !g.liberadoEm
      ? {
          cor: "ambar" as const,
          texto: g.encerramento
            ? `Gabarito guardado até você liberar ou até o encerramento da temporada (${g.encerramento})`
            : "Gabarito guardado até você liberar",
        }
      : g.soNoEncerramento
        ? { cor: "ambar" as const, texto: `Gabarito sai no encerramento da temporada (${g.soNoEncerramento})` }
        : { cor: "cinza" as const, texto: `Gabarito aparece em ${formatarDataHora(g.visivelEm)}` };

  return (
    <div className="space-y-3 pb-24">
      <Secao titulo="Datas e título" resumo={p.resumos.janela} mudou={!igual(janela, janela0)} aberta>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Título</span>
          <Entrada value={janela.titulo} onChange={(e) => setJanela({ ...janela, titulo: e.target.value })} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Abre em</span>
            <Entrada
              type="datetime-local"
              value={janela.abre}
              onChange={(e) => setJanela({ ...janela, abre: e.target.value })}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Fecha em</span>
            <Entrada
              type="datetime-local"
              value={janela.fecha}
              onChange={(e) => setJanela({ ...janela, fecha: e.target.value })}
            />
          </label>
        </div>
      </Secao>

      <Secao titulo="Consulta e proteção" resumo={p.resumos.consulta} mudou={mudou.consulta}>
        <EscolhaPesquisa bloqueada={bloqueada} onChange={setBloqueada} />
        {bloqueada && (
          <CamposRegras
            valor={regras}
            onChange={setRegras}
            pesquisaBloqueada={bloqueada}
            totalQuestoes={p.tempos.questoes.length}
            partes={["consulta"]}
          />
        )}
      </Secao>

      <Secao titulo="Tempo de resposta" resumo={p.resumos.tempo} mudou={mudou.tempos}>
        <p className="text-sm text-slate-600">
          Em branco vale o automático (em cinza). Mudanças valem na hora, inclusive para quem está jogando.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">Todas as questões (s)</span>
            <Entrada
              type="number"
              min={TEMPO_MIN_S}
              max={TEMPO_MAX_S}
              placeholder="O de cada questão"
              value={tempos.todas}
              onChange={(e) => setTempos({ ...tempos, todas: e.target.value })}
            />
            <span className="block text-xs text-slate-500">O tempo escrito numa questão abaixo vence este.</span>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-700">📖 Questão teste (s)</span>
            <Entrada
              type="number"
              min={VERIFICACAO_MIN_S}
              max={VERIFICACAO_MAX_S}
              placeholder={`${VERIFICACAO_TEMPO_S} (automático)`}
              value={tempos.verificacao}
              onChange={(e) => setTempos({ ...tempos, verificacao: e.target.value })}
            />
            <span className="block text-xs text-slate-500">
              De {VERIFICACAO_MIN_S} a {VERIFICACAO_MAX_S} s.
            </span>
          </label>
        </div>
        <ol className="divide-y divide-slate-100 text-sm">
          {p.tempos.questoes.map((q, i) => {
            const automatico = tempoEfetivo({
              daQuestao: q.tempoQuestao,
              relampago: q.relampago,
              fixoDoDesafio: fixo,
              percentual: p.tempos.percentual,
            });
            return (
              <li key={q.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate" title={q.enunciado}>
                  {i + 1}. {q.relampago && "⚡ "}
                  {q.enunciado}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="w-24">
                    <Entrada
                      type="number"
                      aria-label={`Tempo da questão ${i + 1} (segundos)`}
                      min={q.relampago ? RELAMPAGO_MIN_S : TEMPO_MIN_S}
                      max={q.relampago ? RELAMPAGO_MAX_S : TEMPO_MAX_S}
                      placeholder={String(automatico)}
                      value={tempos.porQuestao[q.id] ?? ""}
                      onChange={(e) =>
                        setTempos({ ...tempos, porQuestao: { ...tempos.porQuestao, [q.id]: e.target.value } })
                      }
                    />
                  </span>
                  <span className="text-slate-500">s</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Secao>

      <Secao titulo="Questões teste, ordem e ajudas" resumo={p.resumos.questoes} mudou={mudou.questoes}>
        <p className="text-sm text-slate-600">
          Questões teste, ordem e alternativas são sorteadas quando o aluno começa
          {p.comecaram > 0 ? `: mudar agora só vale para quem ainda não começou (${p.comecaram} já começaram).` : "."}
        </p>
        <CamposRegras
          valor={regras}
          onChange={setRegras}
          pesquisaBloqueada={bloqueada}
          totalQuestoes={p.tempos.questoes.length}
          partes={["questoes", "ajudas"]}
        />
      </Secao>

      <Secao titulo="Gabarito, treino e pontos" resumo={p.resumos.depois} mudou={mudou.gabarito || mudou.pontos}>
        <Etiqueta cor={statusGabarito.cor}>{statusGabarito.texto}</Etiqueta>
        {!p.gabarito.nunca && (
          <fieldset className="space-y-2 text-sm">
            <legend className="mb-1 font-medium text-slate-700">Quando o aluno vê o gabarito</legend>
            <label className="flex cursor-pointer items-start gap-2">
              <input type="radio" className="mt-1" checked={!manual} onChange={() => setManual(false)} />
              <span>
                Sozinho, quando o prazo acabar
                <span className="block text-xs text-slate-500">
                  Uns 3 minutos depois do fechamento, quando ninguém mais pode estar respondendo.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input type="radio" className="mt-1" checked={manual} onChange={() => setManual(true)} />
              <span>
                Só quando eu liberar
                <span className="block text-xs text-slate-500">
                  Útil para corrigir junto em sala ou guardar as questões para outra turma.
                </span>
              </span>
            </label>
          </fieldset>
        )}
        <CamposRegras
          valor={regras}
          onChange={setRegras}
          pesquisaBloqueada={bloqueada}
          totalQuestoes={p.tempos.questoes.length}
          partes={["pontos"]}
        />
      </Secao>

      <Secao titulo="★ Desafio especial" resumo={p.resumos.especial} mudou={mudou.especial}>
        {travadoEspecial ? (
          <p className="text-sm text-slate-600">
            Como {p.comecaram} aluno(s) já começaram, os pontos e o tempo do especial não mudam mais.
          </p>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={especial.ligado}
                onChange={(e) => setEspecial({ ...especial, ligado: e.target.checked })}
              />
              Marcar como especial (visual dourado para os alunos)
            </label>
            {especial.ligado && (
              <>
                <CamposEspecial
                  multiplicador={especial.mult}
                  percentual={especial.pct}
                  onMultiplicador={(mult) => setEspecial({ ...especial, mult })}
                  onPercentual={(pct) => setEspecial({ ...especial, pct })}
                />
                <p className="text-xs text-slate-600">
                  Cada acerto vale {pontosDoEspecial(p.especial.pontosBase, especial.mult)} pontos (
                  {p.especial.pontosBase} × {formatarMultiplicador(especial.mult)}).
                </p>
              </>
            )}
          </>
        )}
      </Secao>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-4">
        <span className="mr-auto text-sm font-semibold text-slate-600">Ações</span>
        {!p.relampago && p.situacao === "aberto" && (
          <Botao
            variante="perigo"
            disabled={pendente}
            onClick={() =>
              acaoImediata(
                `Encerrar o desafio agora (o prazo era ${formatarDataHora(p.janela.fechaIso)})? Quem estiver numa questão termina só ela; quem não fez perde o desafio.`,
                () => encerrarDesafioAgora(p.id),
              )
            }
          >
            Encerrar agora
          </Botao>
        )}
        {p.gabarito.manual && !p.gabarito.liberadoEm && (
          <Botao
            variante="sucesso"
            disabled={pendente || p.situacao !== "encerrado"}
            title={p.situacao !== "encerrado" ? "Encerre o desafio antes de liberar o gabarito." : undefined}
            onClick={() => acaoImediata("Liberar o gabarito para os alunos agora?", () => liberarGabarito(p.id))}
          >
            Liberar gabarito
          </Botao>
        )}
        {p.gabarito.manual && p.gabarito.liberadoEm && (
          <span className="text-xs text-slate-500">
            Gabarito liberado em {formatarDataHora(p.gabarito.liberadoEm)}.
          </span>
        )}
        <BotaoLink href={`/professor/desafios/${p.id}/csv`} variante="secundario" prefetch={false}>
          Exportar planilha (CSV)
        </BotaoLink>
        <Botao
          variante="perigo"
          disabled={pendente}
          onClick={() =>
            confirm("Apagar este desafio? As tentativas e os pontos dos alunos nele também serão apagados.") &&
            iniciar(() => excluirDesafio(p.id))
          }
        >
          Apagar desafio
        </Botao>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3">
          {msg.erro && <Aviso>{msg.erro}</Aviso>}
          {msg.ok && !quantas && <span className="text-sm font-medium text-emerald-700">✓ {msg.ok}</span>}
          {quantas > 0 && (
            <span className="text-sm text-slate-600">
              {quantas} {quantas === 1 ? "parte alterada" : "partes alteradas"}, ainda não salvas
            </span>
          )}
          <Botao disabled={pendente || !quantas} onClick={salvar}>
            {pendente ? "Salvando…" : "Salvar alterações"}
          </Botao>
        </div>
      </div>
    </div>
  );
}
