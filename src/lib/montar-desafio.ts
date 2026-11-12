/** Ajudas da tela "Montar desafio": capítulos da temporada e escolha automática de questões. */

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** "Cap. 10 – Era Moderna" → "cap 10"; "Módulo 16 - Açúcar" → "modulo 16". */
function numeroDoCapitulo(t: string): string | null {
  const m = normalizar(t).match(/^(cap(?:itulo)?|mod(?:ulo)?|unidade|aula)\.?\s*(\d+)/);
  if (!m) return null;
  const tipo = m[1].startsWith("cap") ? "cap" : m[1].startsWith("mod") ? "mod" : m[1];
  return `${tipo} ${Number(m[2])}`;
}

/**
 * A questão é de um dos capítulos da temporada? Aceita o mesmo texto, um
 * começo do outro ("Cap. 10" e "Cap. 10 – Era Moderna") ou o mesmo número.
 */
export function capituloDaTemporada(capitulo: string | null, daTemporada: string[]): boolean {
  if (!capitulo?.trim()) return false;
  const c = normalizar(capitulo);
  const n = numeroDoCapitulo(capitulo);
  return daTemporada.some((t) => {
    const x = normalizar(t);
    if (!x) return false;
    if (c === x || c.startsWith(x) || x.startsWith(c)) return true;
    return n !== null && n === numeroDoCapitulo(t);
  });
}

export type Candidata = { id: string; tipo: string; temImagem: boolean; usos: number; relampago: boolean };

export const META_IMAGEM = 0.4;

/**
 * Escolhe `quantas` questões: nunca usadas primeiro, formatos variados e,
 * quando houver, 40% com imagem. `sortear` permite testar sem acaso.
 */
export function escolherAutomatico<T extends Candidata>(
  candidatas: T[],
  quantas = 10,
  sortear: (n: number) => number = (n) => Math.floor(Math.random() * n),
): string[] {
  // Embaralha e depois ordena por uso: entre as de mesmo uso, a ordem é sorteada.
  const pool = candidatas.filter((q) => !q.relampago).map((q) => ({ q, r: sortear(1_000_000) }));
  pool.sort((a, b) => a.q.usos - b.q.usos || a.r - b.r);
  const ordenadas = pool.map((p) => p.q);

  const escolhidas: T[] = [];
  const pegarVariado = (lista: T[], limite: number) => {
    // Rodízio de formatos: cada volta pega a primeira de cada formato ainda não usado na volta.
    const restantes = lista.filter((q) => !escolhidas.includes(q));
    while (escolhidas.length < limite && restantes.length) {
      const vistos = new Set<string>();
      for (let i = 0; i < restantes.length && escolhidas.length < limite;) {
        const q = restantes[i];
        if (vistos.has(q.tipo)) {
          i += 1;
          continue;
        }
        vistos.add(q.tipo);
        escolhidas.push(q);
        restantes.splice(i, 1);
      }
    }
  };
  pegarVariado(
    ordenadas.filter((q) => q.temImagem),
    Math.ceil(quantas * META_IMAGEM),
  );
  pegarVariado(ordenadas, quantas);
  return escolhidas.map((q) => q.id);
}
