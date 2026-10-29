import { HABILIDADES } from "./habilidades";

/**
 * Progresso do aluno (nível, XP, habilidades, histórico e conquistas), calculado
 * só com as respostas que ele já deu. Nada aqui depende do professor.
 */

export const XP_POR_QUESTAO = 5;
export const XP_POR_ACERTO = 10;
export const XP_POR_DESAFIO = 20;
export const XP_POR_REVISAO = 5;

/** XP total para chegar ao nível n: 0, 100, 300, 600, 1000... */
export const xpDoNivel = (n: number) => 50 * n * (n - 1);

export function calcularNivel(xp: number) {
  let nivel = 1;
  while (xpDoNivel(nivel + 1) <= xp) nivel++;
  const base = xpDoNivel(nivel);
  const proximo = xpDoNivel(nivel + 1);
  return { nivel, xp, noNivel: xp - base, paraProximo: proximo - base };
}

const NOMES_NIVEL = ["Aprendiz", "Explorador", "Cronista", "Historiador", "Mestre do tempo", "Lenda da História"];
/** Nome do nível: muda a cada 3 níveis. */
export const nomeDoNivel = (nivel: number) =>
  NOMES_NIVEL[Math.min(Math.floor((nivel - 1) / 3), NOMES_NIVEL.length - 1)];

export type RespostaProgresso = { desafioId: string; questaoId: string; fracao: number };
export type DesafioProgresso = {
  id: string;
  titulo: string;
  tipo?: string;
  abre_em: string;
  /** Total de questões do desafio. */
  questoes: number;
  concluido: boolean;
};
export type QuestaoProgresso = { habilidades: string[]; capitulo: string | null };

export type Desempenho = { nome: string; acerto: number; questoes: number };

/** Média das frações por chave (habilidade ou capítulo). */
function agrupar(respostas: RespostaProgresso[], chaves: (r: RespostaProgresso) => string[]): Map<string, Desempenho> {
  const mapa = new Map<string, { soma: number; n: number }>();
  for (const r of respostas) {
    for (const k of chaves(r)) {
      const e = mapa.get(k) ?? { soma: 0, n: 0 };
      e.soma += r.fracao;
      e.n += 1;
      mapa.set(k, e);
    }
  }
  return new Map([...mapa].map(([nome, e]) => [nome, { nome, acerto: e.soma / e.n, questoes: e.n }]));
}

export const chaveCapitulo = (c: string) => c.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();

export function calcularProgresso({
  respostas,
  desafios,
  questoes,
  revisoesAcertadas,
}: {
  respostas: RespostaProgresso[];
  desafios: DesafioProgresso[];
  questoes: Map<string, QuestaoProgresso>;
  revisoesAcertadas: number;
}) {
  const concluidos = desafios.filter((d) => d.concluido);
  const xp = Math.round(
    respostas.reduce((s, r) => s + XP_POR_QUESTAO + XP_POR_ACERTO * r.fracao, 0) +
      XP_POR_DESAFIO * concluidos.length +
      XP_POR_REVISAO * revisoesAcertadas,
  );

  const porHabilidade = agrupar(respostas, (r) => questoes.get(r.questaoId)?.habilidades ?? []);
  // Todas as habilidades da lista aparecem, mesmo sem questões ainda.
  const habilidades: Desempenho[] = [
    ...HABILIDADES.map((h) => porHabilidade.get(h) ?? { nome: h, acerto: 0, questoes: 0 }),
    ...[...porHabilidade.values()].filter((d) => !(HABILIDADES as readonly string[]).includes(d.nome)),
  ];
  const capitulos = agrupar(respostas, (r) => {
    const c = questoes.get(r.questaoId)?.capitulo;
    return c ? [chaveCapitulo(c)] : [];
  });

  // Histórico: % de acerto de cada desafio concluído, em ordem.
  const somaPorDesafio = new Map<string, number>();
  for (const r of respostas) somaPorDesafio.set(r.desafioId, (somaPorDesafio.get(r.desafioId) ?? 0) + r.fracao);
  const historico = concluidos
    .filter((d) => d.questoes > 0)
    .sort((a, b) => a.abre_em.localeCompare(b.abre_em))
    .map((d) => ({
      id: d.id,
      titulo: d.titulo,
      tipo: d.tipo,
      abre_em: d.abre_em,
      acerto: (somaPorDesafio.get(d.id) ?? 0) / d.questoes,
    }));

  return {
    ...calcularNivel(xp),
    habilidades,
    capitulos,
    historico,
    desafiosConcluidos: concluidos.length,
    caduRushConcluidos: concluidos.filter((d) => d.tipo === "relampago").length,
    questoesRespondidas: respostas.length,
    acertoGeral: respostas.length ? respostas.reduce((s, r) => s + r.fracao, 0) / respostas.length : 0,
    revisoesAcertadas,
  };
}

export type Progresso = ReturnType<typeof calcularProgresso>;

export type Conquista = { id: string; nome: string; descricao: string; icone: string; conquistada: boolean };

/**
 * Galeria de conquistas. Várias premiam quem melhora, não só quem acerta mais:
 * Em ascensão, Superação e Recorde pessoal.
 */
export function calcularConquistas(
  p: Progresso,
  extra: { posicao: number | null; pontos: number; medalhas: number; maiorSequencia: number },
): Conquista[] {
  const h = p.historico.map((d) => d.acerto);
  const ultimo = h.at(-1);
  const anteriores = h.slice(0, -1);
  const mediaAnterior = anteriores.length ? anteriores.reduce((s, x) => s + x, 0) / anteriores.length : 0;
  const pontuou = extra.pontos > 0 && extra.posicao !== null;

  const lista: Omit<Conquista, "conquistada">[] = [];
  const ok: boolean[] = [];
  const add = (c: Omit<Conquista, "conquistada">, cond: boolean) => {
    lista.push(c);
    ok.push(cond);
  };

  add(
    { id: "primeiro", nome: "Primeiro desafio", descricao: "Conclua seu primeiro desafio.", icone: "🎯" },
    p.desafiosConcluidos >= 1,
  );
  add({ id: "cinco", nome: "5 desafios", descricao: "Conclua 5 desafios.", icone: "📜" }, p.desafiosConcluidos >= 5);
  add({ id: "dez", nome: "10 desafios", descricao: "Conclua 10 desafios.", icone: "🏛️" }, p.desafiosConcluidos >= 10);
  add(
    { id: "rush", nome: "Relâmpago", descricao: "Participe de um CaduRush em sala.", icone: "⚡" },
    p.caduRushConcluidos >= 1,
  );
  add(
    { id: "gabaritou", nome: "Gabaritou", descricao: "Acerte 100% de um desafio.", icone: "💯" },
    h.some((x) => x >= 0.999),
  );
  add(
    { id: "top10", nome: "Top 10", descricao: "Fique entre os 10 primeiros da turma.", icone: "🔟" },
    pontuou && extra.posicao! <= 10,
  );
  add(
    { id: "podio", nome: "Pódio", descricao: "Fique entre os 3 primeiros da turma.", icone: "🏆" },
    pontuou && extra.posicao! <= 3,
  );
  add(
    { id: "vitoria", nome: "Vencedor", descricao: "Faça a maior pontuação de um desafio.", icone: "🏅" },
    extra.medalhas >= 1,
  );
  add(
    { id: "ofensiva2", nome: "Ofensiva de 3", descricao: "Conclua 3 desafios seguidos.", icone: "🔥" },
    extra.maiorSequencia >= 3,
  );
  add(
    { id: "ofensiva4", nome: "Ofensiva de 6", descricao: "Conclua 6 desafios seguidos.", icone: "☄️" },
    extra.maiorSequencia >= 6,
  );
  add(
    { id: "revisor", nome: "Revisor", descricao: "Acerte 10 questões na revisão de erros.", icone: "📚" },
    p.revisoesAcertadas >= 10,
  );
  add(
    {
      id: "mestre",
      nome: "Mestre de habilidade",
      descricao: "Tenha 80% de acerto numa habilidade (mín. 5 questões).",
      icone: "🧠",
    },
    p.habilidades.some((d) => d.questoes >= 5 && d.acerto >= 0.8),
  );
  add(
    {
      id: "ascensao",
      nome: "Em ascensão",
      descricao: "Supere em 15 pontos a sua média nos desafios anteriores.",
      icone: "📈",
    },
    ultimo !== undefined && anteriores.length >= 2 && ultimo - mediaAnterior >= 0.15,
  );
  add(
    {
      id: "superacao",
      nome: "Superação",
      descricao: "Faça 70% ou mais logo depois de um desafio abaixo de 50%.",
      icone: "💪",
    },
    h.some((x, i) => i > 0 && h[i - 1] < 0.5 && x >= 0.7),
  );
  add(
    {
      id: "recorde",
      nome: "Recorde pessoal",
      descricao: "Bata o seu melhor resultado depois de 3 desafios.",
      icone: "⭐",
    },
    h.some((x, i) => i >= 3 && x > Math.max(...h.slice(0, i))),
  );
  add({ id: "nivel5", nome: "Nível 5", descricao: "Chegue ao nível 5.", icone: "🎖️" }, p.nivel >= 5);

  return lista.map((c, i) => ({ ...c, conquistada: ok[i] }));
}

/** Situação de um capítulo na trilha: cor conforme o domínio. */
export function dominioCapitulo(d: Desempenho | undefined): "novo" | "comecando" | "avancando" | "dominado" {
  if (!d || d.questoes === 0) return "novo";
  if (d.acerto >= 0.8 && d.questoes >= 3) return "dominado";
  if (d.acerto >= 0.5) return "avancando";
  return "comecando";
}
