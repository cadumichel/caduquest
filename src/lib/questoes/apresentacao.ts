import { imagemDoPersonagem } from "../personagens";
import { ordemDoTurno, padraoDaPalavra } from "./passos";
import { urlImagem } from "../tipos-banco";
import {
  faixasDaRegua,
  formatarAno,
  iniciosPerguntas,
  MARCA_LACUNA,
  ordemDaCasa,
  subPermutacao,
  type Conteudo,
  type Resposta,
  type TipoQuestao,
  type Vista,
} from "./tipos";

/** Peão do tabuleiro: o desenho do app, se houver; senão, o retrato enviado com a questão. */
export function retratoDoTabuleiro(c: { personagem: string; retrato?: string }): string | null {
  return imagemDoPersonagem(c.personagem) ?? urlImagem(c.retrato ?? null) ?? null;
}

/**
 * Tabuleiro com gabarito já público (treino e revisão): posição na tela da opção
 * certa de cada casa, para a casa ficar verde ou vermelha assim que o aluno avança.
 * Nunca mande isto para o desafio aberto.
 */
export function certasDoTabuleiro(c: Conteudo, permutacao: number[]): number[] | undefined {
  if (c.tipo === "conversa") return c.conteudo.turnos.map((_, k) => ordemDoTurno(permutacao, k).indexOf(0));
  if (c.tipo !== "tabuleiro") return undefined;
  return c.conteudo.casas.map((_, k) => ordemDaCasa(permutacao, k).indexOf(0));
}

/**
 * Segredos que a tela só recebe com o gabarito já público (treino, revisão,
 * prévia do professor): as reações do personagem na conversa e a palavra do
 * conceito secreto. No desafio aberto, eles chegam do servidor passo a passo.
 */
export type Segredo = { reacoes?: (string | null)[]; palavra?: string };

export function segredoPublico(c: Conteudo): Segredo | undefined {
  if (c.tipo === "conversa") return { reacoes: c.conteudo.turnos.map((t) => t.reacao?.trim() || null) };
  if (c.tipo === "conceito_secreto") return { palavra: c.conteudo.palavra };
  return undefined;
}

/** Monta a vista do aluno a partir do conteúdo e da permutação sorteada para ele. */
export function montarVista(c: Conteudo, permutacao: number[]): Vista {
  switch (c.tipo) {
    case "multipla_escolha":
      return { tipo: c.tipo, alternativas: permutacao.map((i) => c.conteudo.alternativas[i]) };
    case "vf_bloco":
      return { tipo: c.tipo, afirmativas: permutacao.map((i) => c.conteudo.afirmativas[i].texto) };
    case "linha_do_tempo":
      return { tipo: c.tipo, eventos: permutacao.map((i) => c.conteudo.eventos[i].texto) };
    case "pares":
      return {
        tipo: c.tipo,
        esquerda: c.conteudo.pares.map((p) => p.esquerda),
        direita: permutacao.map((i) => c.conteudo.pares[i].direita),
      };
    case "fonte_primaria": {
      const inicios = iniciosPerguntas(c.conteudo);
      return {
        tipo: c.tipo,
        documento: c.conteudo.documento,
        perguntas: c.conteudo.perguntas.map((p, j) => ({
          pergunta: p.pergunta,
          alternativas: subPermutacao(permutacao, inicios[j], p.alternativas.length).map((i) => p.alternativas[i]),
        })),
      };
    }
    case "causa_consequencia": {
      const { relacoes, extras } = c.conteudo;
      const todas = [...relacoes.map((r) => r.consequencia), ...extras];
      return { tipo: c.tipo, causas: relacoes.map((r) => r.causa), consequencias: permutacao.map((i) => todas[i]) };
    }
    case "encontrar_erro":
      return {
        tipo: c.tipo,
        trechos: c.conteudo.trechos.map((t) => t.texto),
        erros: c.conteudo.trechos.filter((t) => t.errado).length,
      };
    case "completar_lacunas": {
      const banco = [...c.conteudo.lacunas, ...c.conteudo.extras];
      // partes[k] vem antes da lacuna k; a última parte fecha o texto.
      return { tipo: c.tipo, partes: c.conteudo.texto.split(MARCA_LACUNA), banco: permutacao.map((i) => banco[i]) };
    }
    case "ordenar_frases":
      return { tipo: c.tipo, frases: permutacao.map((i) => c.conteudo.frases[i]) };
    case "interpretacao":
      return {
        tipo: c.tipo,
        texto: c.conteudo.texto,
        alternativas: permutacao.map((i) => c.conteudo.alternativas[i]),
      };
    case "quem_disse":
      return { tipo: c.tipo, citacao: c.conteudo.citacao, alternativas: permutacao.map((i) => c.conteudo.autores[i]) };
    case "classificar":
      return { tipo: c.tipo, grupos: c.conteudo.grupos, itens: permutacao.map((i) => c.conteudo.itens[i].texto) };
    case "intruso":
      return { tipo: c.tipo, itens: permutacao.map((i) => c.conteudo.itens[i]) };
    case "ponto_de_vista": {
      const { relatos, extras } = c.conteudo;
      const todas = [...relatos.map((r) => r.perspectiva), ...extras];
      return { tipo: c.tipo, relatos: relatos.map((r) => r.texto), perspectivas: permutacao.map((i) => todas[i]) };
    }
    case "linha_do_tempo_datas":
      return {
        tipo: c.tipo,
        faixas: faixasDaRegua(c.conteudo).map(([a, b]) => `${formatarAno(a)} – ${formatarAno(b)}`),
        eventos: permutacao.map((i) => c.conteudo.eventos[i].texto),
      };
    case "mapa":
      // Os pinos ficam na ordem original (números 1, 2, 3...); os nomes é que são embaralhados.
      return {
        tipo: c.tipo,
        imagem: urlImagem(c.conteudo.imagem) ?? "",
        pinos: c.conteudo.marcadores.map(({ x, y }) => ({ x, y })),
        nomes: permutacao.map((i) => c.conteudo.marcadores[i].nome),
      };
    case "tabuleiro":
      return {
        tipo: c.tipo,
        personagem: c.conteudo.personagem,
        avatar: retratoDoTabuleiro(c.conteudo),
        casas: c.conteudo.casas.map((casa, k) => {
          const opcoes = [casa.certa, casa.errada];
          const [a, b] = ordemDaCasa(permutacao, k);
          return [opcoes[a], opcoes[b]] as [string, string];
        }),
        emojis: c.conteudo.casas.map((casa) => casa.emoji?.trim() || null),
      };
    case "estimativa": {
      const { minimo, maximo, passo, unidade, ano } = c.conteudo;
      return { tipo: c.tipo, minimo, maximo, passo, unidade, ano };
    }
    case "quem_sou_eu":
      return {
        tipo: c.tipo,
        candidatos: permutacao.map((i) => c.conteudo.candidatos[i]),
        pistas: c.conteudo.pistas,
        total: c.conteudo.pistas.length,
      };
    case "monte_resposta": {
      const { espacos, distratores } = c.conteudo;
      const banco = [...espacos.map((e) => e.trecho), ...distratores];
      return { tipo: c.tipo, rotulos: espacos.map((e) => e.rotulo), banco: permutacao.map((i) => banco[i]) };
    }
    case "investigue":
      return { tipo: c.tipo };
    case "conversa":
      return {
        tipo: c.tipo,
        personagem: c.conteudo.personagem,
        avatar: retratoDoTabuleiro(c.conteudo),
        mensagens: c.conteudo.turnos.map((t) => t.mensagem),
        opcoes: c.conteudo.turnos.map((t, k) => {
          const todas = [t.certa, ...t.erradas];
          return ordemDoTurno(permutacao, k).map((i) => todas[i]);
        }),
      };
    case "conceito_secreto":
      return { tipo: c.tipo, definicao: c.conteudo.definicao, padrao: padraoDaPalavra(c.conteudo.palavra) };
    case "detalhe_imagem":
      // Só a imagem: a área certa nunca vai para a tela.
      return { tipo: c.tipo, imagem: urlImagem(c.conteudo.imagem) ?? "" };
    case "enquanto_isso":
      return {
        tipo: c.tipo,
        linhas: c.conteudo.linhas,
        periodos: c.conteudo.periodos,
        eventos: permutacao.map((i) => c.conteudo.eventos[i].texto),
      };
  }
}

export function respostaInicial(vista: Vista): Resposta {
  switch (vista.tipo) {
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse":
    case "intruso":
      return { tipo: vista.tipo, escolha: null };
    case "vf_bloco":
      return { tipo: vista.tipo, valores: vista.afirmativas.map(() => null) };
    case "linha_do_tempo":
      return { tipo: vista.tipo, ordem: vista.eventos.map((_, i) => i) };
    case "pares":
      return { tipo: vista.tipo, ligacoes: vista.esquerda.map(() => null) };
    case "fonte_primaria":
      return { tipo: vista.tipo, escolhas: vista.perguntas.map(() => null) };
    case "causa_consequencia":
      return { tipo: vista.tipo, ligacoes: vista.causas.map(() => null) };
    case "encontrar_erro":
      return { tipo: vista.tipo, marcados: [] };
    case "completar_lacunas":
      return { tipo: vista.tipo, preenchidas: vista.partes.slice(1).map(() => null) };
    case "ordenar_frases":
      return { tipo: vista.tipo, ordem: vista.frases.map((_, i) => i) };
    case "classificar":
      return { tipo: vista.tipo, grupos: vista.itens.map(() => null) };
    case "ponto_de_vista":
      return { tipo: vista.tipo, ligacoes: vista.relatos.map(() => null) };
    case "linha_do_tempo_datas":
      return { tipo: vista.tipo, faixas: vista.eventos.map(() => null) };
    case "mapa":
      return { tipo: vista.tipo, pinos: vista.nomes.map(() => null) };
    case "tabuleiro":
      return { tipo: vista.tipo, escolhas: vista.casas.map(() => null) };
    case "estimativa":
      return { tipo: vista.tipo, valor: null };
    case "quem_sou_eu":
      return { tipo: vista.tipo, escolha: null, pistas: 1 };
    case "monte_resposta":
      return { tipo: vista.tipo, preenchidas: vista.rotulos.map(() => null) };
    case "investigue":
      return { tipo: vista.tipo, texto: "" };
    case "conversa":
      return { tipo: vista.tipo, escolhas: vista.mensagens.map(() => null) };
    case "conceito_secreto":
      return { tipo: vista.tipo, letras: [] };
    case "detalhe_imagem":
      return { tipo: vista.tipo, ponto: null };
    case "enquanto_isso":
      return { tipo: vista.tipo, celulas: vista.eventos.map(() => null) };
  }
}

/** Resposta está completa o bastante para enviar sem aviso? */
export function respostaCompleta(r: Resposta): boolean {
  switch (r.tipo) {
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse":
    case "intruso":
      return r.escolha !== null;
    case "classificar":
      return r.grupos.every((v) => v !== null);
    case "ponto_de_vista":
      return r.ligacoes.every((v) => v !== null);
    case "linha_do_tempo_datas":
      return r.faixas.every((v) => v !== null);
    case "mapa":
      return r.pinos.every((v) => v !== null);
    case "tabuleiro":
      return Boolean(r.fim) || r.escolhas.every((v) => v !== null);
    case "vf_bloco":
      return r.valores.every((v) => v !== null);
    case "linha_do_tempo":
    case "ordenar_frases":
      return true;
    case "completar_lacunas":
      return r.preenchidas.every((v) => v !== null);
    case "pares":
    case "causa_consequencia":
      return r.ligacoes.every((v) => v !== null);
    case "fonte_primaria":
      return r.escolhas.every((v) => v !== null);
    case "encontrar_erro":
      return r.marcados.length > 0;
    case "estimativa":
      return r.valor !== null;
    case "quem_sou_eu":
      return r.escolha !== null;
    case "monte_resposta":
      return r.preenchidas.every((v) => v !== null);
    case "investigue":
      return r.texto.trim().length > 0;
    case "conversa":
    case "conceito_secreto":
      // Acabou quando a tela marca o fim (ou o tempo esgota).
      return Boolean(r.fim);
    case "detalhe_imagem":
      return r.ponto !== null;
    case "enquanto_isso":
      return r.celulas.every((v) => v !== null);
  }
}

/**
 * Formatos que já começam com uma resposta montada (a ordem embaralhada):
 * o botão de confirmar só libera depois que o aluno mexe nos itens.
 */
export const COMECA_MONTADA: readonly TipoQuestao[] = ["linha_do_tempo", "ordenar_frases"];

/**
 * A questão está toda respondida e pode ser enviada? Sem isso o botão
 * "Confirmar resposta" fica desligado (não há envio pela metade).
 * `mexeu`: o aluno já mudou a resposta nesta tela (conta para os formatos de ordenar).
 */
export function prontaParaEnviar(vista: Vista, r: Resposta, mexeu: boolean): boolean {
  if (COMECA_MONTADA.includes(r.tipo)) return mexeu;
  if (r.tipo === "encontrar_erro" && vista.tipo === "encontrar_erro") return r.marcados.length >= vista.erros;
  return respostaCompleta(r);
}

/** O que falta para liberar o botão de confirmar (texto para o aluno). */
export function oQueFalta(vista: Vista): string {
  switch (vista.tipo) {
    case "linha_do_tempo":
    case "ordenar_frases":
      return "Coloque os itens na ordem para liberar o botão de confirmar.";
    case "encontrar_erro":
      return vista.erros > 1
        ? `Marque os ${vista.erros} trechos errados para liberar o botão de confirmar.`
        : "Marque o trecho errado para liberar o botão de confirmar.";
    case "investigue":
      return "Escreva a resposta para liberar o botão de confirmar.";
    case "estimativa":
      return "Escolha um valor na régua para liberar o botão de confirmar.";
    case "detalhe_imagem":
      return "Marque o ponto na imagem para liberar o botão de confirmar.";
    case "multipla_escolha":
    case "interpretacao":
    case "quem_disse":
    case "intruso":
    case "quem_sou_eu":
      return "Escolha uma resposta para liberar o botão de confirmar.";
    default:
      return "Responda todos os itens para liberar o botão de confirmar.";
  }
}
