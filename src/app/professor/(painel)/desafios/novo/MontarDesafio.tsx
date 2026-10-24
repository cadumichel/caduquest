"use client";
import { useMemo, useState, useTransition } from "react";
import { Aviso, Botao, Campo, Cartao, Entrada, Etiqueta, Selecao } from "@/components/ui";
import { NOME_DIFICULDADE, NOME_TIPO, type TipoQuestao } from "@/lib/questoes/tipos";
import { criarDesafio } from "../../actions";

type Opcao = {
  id: string;
  tipo: TipoQuestao;
  enunciado: string;
  capitulo: string | null;
  habilidades: string[];
  dificuldade: number;
  temImagem: boolean;
  usos: number;
};

export function MontarDesafio({
  temporadaId,
  questoes,
  capitulosTemporada,
  abrePadrao,
  fechaPadrao,
}: {
  temporadaId: string;
  questoes: Opcao[];
  capitulosTemporada: string[];
  abrePadrao: string;
  fechaPadrao: string;
}) {
  const [titulo, setTitulo] = useState("");
  const [abre, setAbre] = useState(abrePadrao);
  const [fecha, setFecha] = useState(fechaPadrao);
  const [pontos, setPontos] = useState(10);
  const [tempoFixo, setTempoFixo] = useState("");
  const [saidaZera, setSaidaZera] = useState(false);
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
        titulo,
        abre_em: abre,
        fecha_em: fecha,
        pontos_por_acerto: pontos,
        tempo_por_questao_s: tempoFixo ? Number(tempoFixo) : null,
        saida_zera_questao: saidaZera,
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
          <Campo rotulo="Abre em (horário de Brasília)">
            <Entrada type="datetime-local" value={abre} onChange={(e) => setAbre(e.target.value)} />
          </Campo>
          <Campo rotulo="Fecha em" dica="Desafio semanal: de 5 a 7 dias.">
            <Entrada type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Campo>
          <Campo rotulo="Pontos por acerto">
            <Entrada
              type="number"
              min={1}
              max={100}
              value={pontos}
              onChange={(e) => setPontos(Number(e.target.value))}
            />
          </Campo>
          <Campo rotulo="Tempo por questão">
            <Selecao value={tempoFixo} onChange={(e) => setTempoFixo(e.target.value)}>
              <option value="">O tempo de cada questão</option>
              {[20, 30, 40, 45, 60, 90].map((s) => (
                <option key={s} value={s}>
                  {s} segundos em todas
                </option>
              ))}
            </Selecao>
          </Campo>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={saidaZera}
              onChange={(e) => setSaidaZera(e.target.checked)}
            />
            <span>
              <strong>Sair da tela zera a questão</strong>
              <span className="block text-xs text-slate-500">
                Trocar de aba, de app ou de janela durante uma questão faz ela valer zero. O aluno é avisado antes.
              </span>
            </span>
          </label>
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
            {pendente ? "Criando…" : "Criar desafio"}
          </Botao>
          <p className="text-xs text-slate-500">
            A ordem das questões e das alternativas é embaralhada para cada aluno.
          </p>
        </Cartao>
      </div>
    </div>
  );
}
