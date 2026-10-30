import type { Conteudo, Resposta } from "@/lib/questoes/tipos";

/** Relatório de desempenho: resultado de cada aluno em cada questão. */

export type ResultadoQuestao = { fracao: number | null; esgotada: boolean; zerada: boolean };

/** Rótulo para o relatório: acertou, errou, parcial ou sem resposta. */
export function rotuloResultado(r: ResultadoQuestao | undefined): string {
  if (!r || r.fracao === null) return r ? "sem resposta" : "não respondeu";
  if (r.zerada) return "zerada (saiu da tela)";
  if (r.esgotada && r.fracao === 0) return "tempo esgotado";
  if (r.fracao >= 1) return "acertou";
  if (r.fracao <= 0) return "errou";
  return `parcial (${Math.round(r.fracao * 100)}%)`;
}

export type Marca = "certa" | "errada" | "parcial" | "vazia";

/** Para a grade na tela: ✓, ✗, parcial ou nada. */
export function marcaResultado(r: ResultadoQuestao | undefined): Marca {
  if (!r || r.fracao === null) return "vazia";
  if (r.fracao >= 1) return "certa";
  if (r.fracao <= 0) return "errada";
  return "parcial";
}

/** Célula de CSV com ; (Excel em português). */
export const celulaCsv = (v: string | number | null) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Planilha pronta para baixar, com BOM para o Excel reconhecer os acentos. */
export function respostaCsv(linhas: (string | number | null)[][], nomeArquivo: string) {
  const csv = "\uFEFF" + linhas.map((l) => l.map(celulaCsv).join(";")).join("\n");
  const nome = nomeArquivo.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "relatorio";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nome)}.csv"`,
    },
  });
}

const LETRAS = "ABCDEF";

/**
 * Alternativa escolhida e a correta, em texto, nas questões de escolha única
 * (na ordem original, não na embaralhada que o aluno viu). Nos outros formatos,
 * a resposta só aparece na tela do professor.
 */
export function escolhaEmTexto(
  c: Conteudo,
  permutacao: number[] | null | undefined,
  resposta: Resposta | null | undefined,
): { aluno: string; correta: string } | null {
  let opcoes: string[];
  let correta: number;
  switch (c.tipo) {
    case "multipla_escolha":
    case "interpretacao":
      [opcoes, correta] = [c.conteudo.alternativas, c.conteudo.correta];
      break;
    case "quem_disse":
      [opcoes, correta] = [c.conteudo.autores, c.conteudo.correta];
      break;
    case "intruso":
      [opcoes, correta] = [c.conteudo.itens, c.conteudo.intruso];
      break;
    default:
      return null;
  }
  const texto = (i: number) => `${LETRAS[i]}) ${opcoes[i]}`;
  const exibida = resposta && "escolha" in resposta ? resposta.escolha : null;
  const original = exibida === null || exibida === undefined || !permutacao ? -1 : (permutacao[exibida] ?? -1);
  return { aluno: original >= 0 && original < opcoes.length ? texto(original) : "", correta: texto(correta) };
}
