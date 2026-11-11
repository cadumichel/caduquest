"use client";
import { useMemo, useState, useTransition } from "react";
import { EscolhaPesquisa } from "@/components/EscolhaPesquisa";
import { CamposRegras, regrasParaEnvio, regrasParaForm, type Regras } from "@/components/CamposRegras";
import { Aviso, Botao, Campo, Cartao, Entrada, Etiqueta, Selecao } from "@/components/ui";
import { CamposEspecial } from "@/components/CamposEspecial";
import { DURACAO_PADRAO_MIN } from "@/lib/cadurush";
import { isoParaDataHoraLocal } from "@/lib/datas";
import { formatarMultiplicador, pontosDoEspecial } from "@/lib/especial";
import type { Padroes } from "@/lib/padroes";
import { NOME_DIFICULDADE, NOME_TIPO, TEMPO_MAX_S, TEMPO_MIN_S, type TipoQuestao } from "@/lib/questoes/tipos";
import { VERIFICACAO_MAX_S, VERIFICACAO_MIN_S } from "@/lib/questoes/tempos";
import { VERIFICACAO_TEMPO_S } from "@/lib/questoes/verificacao";
import { criarDesafio } from "../../actions";

type Opcao = {
  id: string;
  tipo: TipoQuestao;
  enunciado: string;
  capitulo: string | null;
  habilidades: string[];
  dificuldade: number;
  temImagem: boolean;
  relampago: boolean;
  usos: number;
};

/** Fechamento padrão: dias do padrão às 23h59, ou o fim da aula no "só em sala". */
function fechaPara(abre: string, emSala: boolean, dias: number) {
  const inicio = new Date(abre);
  if (Number.isNaN(inicio.getTime())) return abre;
  if (emSala) return isoParaDataHoraLocal(new Date(inicio.getTime() + DURACAO_PADRAO_MIN * 60_000));
  // abre está no horário de Brasília (datetime-local): somar dias na data basta.
  const [ano, mes, dia] = abre.slice(0, 10).split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return `${d.toISOString().slice(0, 10)}T23:59`;
}

export function MontarDesafio({
  temporadaId,
  emSalaInicial,
  padroes,
  questoes,
  capitulosTemporada,
  abrePadrao,
}: {
  temporadaId: string;
  emSalaInicial: boolean;
  padroes: Padroes;
  questoes: Opcao[];
  capitulosTemporada: string[];
  abrePadrao: string;
}) {
  const [titulo, setTitulo] = useState("");
  const [abre, setAbre] = useState(abrePadrao);
  const [emSala, setEmSala] = useState(emSalaInicial);
  const [especial, setEspecial] = useState(emSalaInicial);
  const [multiplicador, setMultiplicador] = useState(padroes.especial_multiplicador);
  const [percentual, setPercentual] = useState(padroes.especial_tempo_percentual);
  const [fecha, setFecha] = useState(() => fechaPara(abrePadrao, emSalaInicial, padroes.dias_aberto));
  const [pontos, setPontos] = useState(padroes.pontos_por_acerto);
  const [tempoFixo, setTempoFixo] = useState("");
  const [tempoVerificacao, setTempoVerificacao] = useState(
    padroes.tempo_verificacao_s === null ? "" : String(padroes.tempo_verificacao_s),
  );
  const [saidaZera, setSaidaZera] = useState(padroes.pesquisa_bloqueada || emSalaInicial);
  const [regras, setRegras] = useState<Regras>(() => regrasParaForm(padroes.regras));
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [filtroCapitulo, setFiltroCapitulo] = useState("");
  const [busca, setBusca] = useState("");
  const [soNovas, setSoNovas] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  const capitulos = useMemo(
    () => [
      ...new Set([...capitulosTemporada, ...questoes.map((q) => q.capitulo).filter((c): c is string => Boolean(c))]),
    ],
    [capitulosTemporada, questoes],
  );
  const visiveis = questoes.filter(
    (q) =>
      (!filtroCapitulo || q.capitulo === filtroCapitulo) &&
      (!busca || q.enunciado.toLowerCase().includes(busca.toLowerCase())) &&
      (!soNovas || q.usos === 0),
  );
  const selecionadas = questoes.filter((q) => escolhidas.includes(q.id));
  const comImagem = selecionadas.filter((q) => q.temImagem).length;
  const pctImagem = selecionadas.length ? Math.round((comImagem / selecionadas.length) * 100) : 0;

  const alternar = (id: string) =>
    setEscolhidas((e) => (e.includes(id) ? e.filter((x) => x !== id) : e.length >= 15 ? e : [...e, id]));

  const salvar = () =>
    iniciar(async () => {
      const r = await criarDesafio({
        temporada_id: temporadaId,
        tipo: emSala ? "relampago" : "semanal",
        especial,
        multiplicador: especial ? multiplicador : null,
        tempo_percentual: especial ? percentual : null,
        titulo,
        abre_em: abre,
        fecha_em: fecha,
        pontos_por_acerto: pontos,
        tempo_por_questao_s: tempoFixo ? Number(tempoFixo) : null,
        tempo_verificacao_s: tempoVerificacao ? Number(tempoVerificacao) : null,
        saida_zera_questao: saidaZera,
        ...regrasParaEnvio(regras),
        questoes: escolhidas,
      });
      if (r?.erro) setErro(r.erro);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Cartao className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Selecao value={filtroCapitulo} onChange={(e) => setFiltroCapitulo(e.target.value)} className="max-w-xs">
            <option value="">Todos os capítulos</option>
            {capitulos.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Selecao>
          <Entrada
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no enunciado"
            className="max-w-xs"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={soNovas} onChange={(e) => setSoNovas(e.target.checked)} /> Só nunca usadas
          </label>
        </div>
        {!questoes.length && (
          <Aviso tipo="info">Não há questões publicadas. Publique questões no banco primeiro.</Aviso>
        )}
        <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {visiveis.map((q) => (
            <li key={q.id}>
              <label className="flex cursor-pointer gap-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={escolhidas.includes(q.id)}
                  onChange={() => alternar(q.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm">
                    {q.temImagem && "🖼️ "}
                    {q.enunciado}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Etiqueta cor="azul">{NOME_TIPO[q.tipo]}</Etiqueta>
                    {q.relampago && <Etiqueta cor="ambar">⚡ relâmpago</Etiqueta>}
                    {q.capitulo && <Etiqueta>{q.capitulo}</Etiqueta>}
                    <Etiqueta>{NOME_DIFICULDADE[q.dificuldade]}</Etiqueta>
                    {q.usos > 0 && <Etiqueta cor="ambar">usada {q.usos}×</Etiqueta>}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Cartao>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Cartao className="space-y-3">
          <Campo rotulo="Título">
            <Entrada
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Semana 1 – Antigo Regime"
            />
          </Campo>
          <Campo rotulo={emSala ? "Início da aula (horário de Brasília)" : "Abre em (horário de Brasília)"}>
            <Entrada
              type="datetime-local"
              value={abre}
              onChange={(e) => {
                setAbre(e.target.value);
                setFecha(fechaPara(e.target.value, emSala, padroes.dias_aberto));
              }}
            />
          </Campo>
          <Campo rotulo={emSala ? "Fim da aula" : "Fecha em"}>
            <Entrada type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Campo>

          <div
            className={`space-y-3 rounded-xl border-2 p-3 ${especial ? "border-ouro bg-amber-50/60" : "border-slate-200"}`}
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={especial} onChange={(e) => setEspecial(e.target.checked)} />★ Desafio
              especial
            </label>
            {especial && (
              <>
                <CamposEspecial
                  multiplicador={multiplicador}
                  percentual={percentual}
                  onMultiplicador={setMultiplicador}
                  onPercentual={setPercentual}
                />
                <p className="text-xs text-slate-600">
                  Cada acerto vale {pontosDoEspecial(pontos, multiplicador)} pontos ({pontos} ×{" "}
                  {formatarMultiplicador(multiplicador)}).
                </p>
              </>
            )}
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={emSala}
                onChange={(e) => {
                  setEmSala(e.target.checked);
                  setFecha(fechaPara(abre, e.target.checked, padroes.dias_aberto));
                  if (e.target.checked) setSaidaZera(true);
                }}
              />
              <span>
                Só em sala, com código do dia
                <span className="block text-xs text-slate-500">
                  Você mostra o código no quadro; sem ele, ninguém começa. Fecha sozinho no fim da aula.
                </span>
              </span>
            </label>
          </div>

          <details className="rounded-xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm">
              <span className="font-semibold">Regras:</span>{" "}
              <span className="text-slate-600">
                {saidaZera ? "sem consulta" : "com consulta"} · {pontos} pts por acerto
                {tempoFixo ? ` · ${tempoFixo} s por questão` : ""}
                {regras.verificacoes === "0"
                  ? " · sem questões teste"
                  : regras.verificacoes
                    ? ` · ${regras.verificacoes} questões teste`
                    : ""}
              </span>{" "}
              <span className="text-marca-700">Alterar só neste desafio</span>
            </summary>
            <div className="mt-3 space-y-3">
              <Campo rotulo="Pontos por acerto" dica={especial ? "Antes do multiplicador do especial." : undefined}>
                <Entrada
                  type="number"
                  min={1}
                  max={100}
                  value={pontos}
                  onChange={(e) => setPontos(Number(e.target.value))}
                />
              </Campo>
              <Campo
                rotulo="Tempo por questão (segundos)"
                dica={`Em branco: o tempo de cada questão. De ${TEMPO_MIN_S} a ${TEMPO_MAX_S} s. As relâmpago nunca passam do tempo delas.`}
              >
                <Entrada
                  type="number"
                  min={TEMPO_MIN_S}
                  max={TEMPO_MAX_S}
                  placeholder="Tempo de cada questão"
                  value={tempoFixo}
                  onChange={(e) => setTempoFixo(e.target.value)}
                />
              </Campo>
              <Campo
                rotulo="Tempo da questão teste (segundos)"
                dica={`Em branco: ${VERIFICACAO_TEMPO_S} s. De ${VERIFICACAO_MIN_S} a ${VERIFICACAO_MAX_S} s.`}
              >
                <Entrada
                  type="number"
                  min={VERIFICACAO_MIN_S}
                  max={VERIFICACAO_MAX_S}
                  placeholder={`${VERIFICACAO_TEMPO_S} (automático)`}
                  value={tempoVerificacao}
                  onChange={(e) => setTempoVerificacao(e.target.value)}
                />
              </Campo>
              <EscolhaPesquisa bloqueada={saidaZera} onChange={setSaidaZera} />
              <CamposRegras
                valor={regras}
                onChange={setRegras}
                pesquisaBloqueada={saidaZera}
                totalQuestoes={escolhidas.length}
              />
            </div>
          </details>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p>
              <strong>{escolhidas.length}</strong> de 5 a 15 questões
            </p>
            <p className={pctImagem >= 40 ? "text-emerald-700" : "text-amber-700"}>
              {pctImagem}% com imagem (meta: 40%)
            </p>
          </div>
          {erro && <Aviso>{erro}</Aviso>}
          <Botao className="w-full" disabled={pendente || escolhidas.length < 5 || !titulo.trim()} onClick={salvar}>
            {pendente ? "Criando…" : especial ? "Criar desafio especial" : "Criar desafio"}
          </Botao>
        </Cartao>
      </div>
    </div>
  );
}
