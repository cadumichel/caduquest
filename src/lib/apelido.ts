/**
 * Filtro de apelidos impróprios. Normaliza o texto (acentos, números no lugar
 * de letras, letras repetidas, separadores) e procura termos de uma lista.
 * Não é infalível: o professor sempre pode renomear um apelido na turma.
 */

// Termos curtos só contam como palavra inteira, para não barrar nomes comuns
// que os contêm (ex.: "cu" em "Cunha").
const PALAVRAS_INTEIRAS = [
  "cu",
  "ku",
  "pau",
  "pica",
  "rola",
  "puta",
  "pinto",
  "bunda",
  "bct",
  "pqp",
  "vsf",
  "tnc",
  "fdp",
  "krl",
  "crl",
  "dick",
  "shit",
  "cunt",
];

// Termos longos contam em qualquer posição, mesmo grudados a outras letras.
const TRECHOS = [
  "porra",
  "caralh",
  "buceta",
  "boceta",
  "xoxota",
  "xereca",
  "piroca",
  "penis",
  "vagina",
  "foder",
  "fodase",
  "foda",
  "fude",
  "punheta",
  "siririca",
  "merda",
  "bosta",
  "cocozao",
  "putinha",
  "prostitut",
  "vagabund",
  "viado",
  "veado",
  "bicha",
  "sapatao",
  "traveco",
  "macaco",
  "negrinho",
  "crioulo",
  "retardad",
  "otario",
  "babaca",
  "arrombad",
  "corno",
  "chifrud",
  "desgracad",
  "filhodaputa",
  "vaitomar",
  "tomarnocu",
  "nazista",
  "hitler",
  "estupr",
  "pedofil",
  "sexo",
  "transar",
  "gostosa",
  "gostoso",
  "peitos",
  "fuck",
  "bitch",
  "pussy",
  "nigga",
  "nigger",
  "whore",
];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[0134578@$!]/g, (c) => LEET[c]);
}

const juntarRepetidas = (texto: string) => texto.replace(/(.)\1+/g, "$1");

export function apelidoImproprio(apelido: string): boolean {
  const palavras = normalizar(apelido)
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(juntarRepetidas);
  // "p.o.r.r.a" vira "porra" ao juntar as partes; letras repetidas viram uma só
  // dos dois lados, para "poooorra" e "porra" baterem com o mesmo termo.
  const junto = juntarRepetidas(palavras.join(""));
  if (PALAVRAS_INTEIRAS.some((p) => palavras.includes(juntarRepetidas(p)) || junto === juntarRepetidas(p))) return true;
  return TRECHOS.some((t) => junto.includes(juntarRepetidas(t)));
}
