/**
 * Personagens históricos para o avatar do aluno, no estilo "rosto sem feições":
 * cada um é reconhecido pelo cabelo, chapéu e roupa. Desenhos em SVG (viewBox
 * 0 0 100 100) feitos para o CaduQuest; o fundo é a cor escolhida pelo aluno.
 */

const PELE = {
  clara: "#f6d2b0",
  media: "#e3a978",
  morena: "#c68642",
  escura: "#8d5524",
  retinta: "#5c3a1e",
};

const ouro = "#f4b400";
const corpo = (cor: string) => `<path d="M12 100 Q14 77 50 75 Q86 77 88 100 Z" fill="${cor}"/>`;
const pescoco = (pele: string) => `<rect x="43" y="58" width="14" height="20" rx="4" fill="${pele}"/>`;
const cabeca = (pele: string) =>
  `<circle cx="32.5" cy="48" r="4" fill="${pele}"/><circle cx="67.5" cy="48" r="4" fill="${pele}"/>` +
  `<ellipse cx="50" cy="45" rx="17" ry="20" fill="${pele}"/>`;
const labios = (cor = "#c0392b") => `<ellipse cx="50" cy="57" rx="3.6" ry="1.9" fill="${cor}"/>`;
const busto = (pele: string, roupa: string) => corpo(roupa) + pescoco(pele) + cabeca(pele);

export type Personagem = { nome: string; epoca: string; svg: string };

const TODOS: Personagem[] = [
  {
    nome: "Cleópatra",
    epoca: "Egito Antigo",
    svg:
      `<path d="M29 42 Q29 21 50 21 Q71 21 71 42 L73 74 L27 74 Z" fill="#111"/>` +
      busto(PELE.media, "#f8fafc") +
      `<path d="M28 84 Q50 100 72 84 L68 77 Q50 90 32 77 Z" fill="${ouro}"/>` +
      `<path d="M30 81 Q50 94 70 81" stroke="#2563eb" stroke-width="2.5" fill="none"/>` +
      `<path d="M32 41 L32 33 Q35 24 50 24 Q65 24 68 33 L68 41 Z" fill="#111"/>` +
      `<rect x="31" y="30" width="38" height="4" rx="2" fill="${ouro}"/>` +
      `<path d="M50 30 Q46 24 50 20 Q54 21 51 26" stroke="${ouro}" stroke-width="2.5" fill="none"/>` +
      labios(),
  },
  {
    nome: "Júlio César",
    epoca: "Roma Antiga",
    svg:
      busto(PELE.clara, "#f8fafc") +
      `<path d="M28 80 L66 100 L54 100 L24 86 Z" fill="#b91c1c"/>` +
      `<path d="M33 40 Q33 25 50 25 Q67 25 67 40 Q60 31 50 31 Q40 31 33 40 Z" fill="#7a5230"/>` +
      [30, 36, 42, 58, 64, 70]
        .map((x, i) => {
          const y = [40, 32, 27, 27, 32, 40][i];
          const r = [-60, -35, -15, 15, 35, 60][i];
          return `<ellipse cx="${x}" cy="${y}" rx="3" ry="6" transform="rotate(${r} ${x} ${y})" fill="#16a34a"/>`;
        })
        .join(""),
  },
  {
    nome: "Faraó",
    epoca: "Egito Antigo",
    svg:
      busto(PELE.morena, PELE.morena) +
      `<path d="M26 84 Q50 99 74 84 L70 76 Q50 90 30 76 Z" fill="${ouro}"/>` +
      `<path d="M29 84 Q50 96 71 84" stroke="#1d4ed8" stroke-width="2.5" fill="none"/>` +
      `<path d="M30 36 Q50 14 70 36 L77 76 L65 76 L66 42 L34 42 L35 76 L23 76 Z" fill="${ouro}"/>` +
      [27, 33, 39, 45, 51, 57, 63, 69]
        .map((y) => `<path d="M24 ${y + 4} L35 ${y}  M65 ${y} L76 ${y + 4}" stroke="#1d4ed8" stroke-width="2.4"/>`)
        .join("") +
      `<rect x="33" y="38" width="34" height="5" fill="#1d4ed8"/>` +
      `<path d="M50 38 Q47 31 50 27 Q53 29 51 34" stroke="#1d4ed8" stroke-width="2.4" fill="none"/>` +
      `<rect x="47" y="62" width="6" height="11" rx="2" fill="#3b2a1a"/>`,
  },
  {
    nome: "Legionário romano",
    epoca: "Roma Antiga",
    svg:
      busto(PELE.clara, "#94a3b8") +
      `<path d="M14 96 Q16 80 30 77 L30 100 Z M86 96 Q84 80 70 77 L70 100 Z" fill="#b91c1c"/>` +
      [84, 90, 96].map((y) => `<path d="M32 ${y} L68 ${y}" stroke="#64748b" stroke-width="2"/>`).join("") +
      `<path d="M30 44 Q30 23 50 23 Q70 23 70 44 Z" fill="#9ca3af"/>` +
      `<rect x="30" y="42" width="7" height="16" rx="3" fill="#9ca3af"/><rect x="63" y="42" width="7" height="16" rx="3" fill="#9ca3af"/>` +
      `<rect x="30" y="40" width="40" height="4" fill="#6b7280"/>` +
      `<path d="M36 22 Q50 4 64 22 Q50 15 36 22 Z" fill="#dc2626"/>`,
  },
  {
    nome: "Viking",
    epoca: "Escandinávia medieval",
    svg:
      busto(PELE.clara, "#7c4a21") +
      `<path d="M16 96 Q18 80 34 77 Q50 84 66 77 Q82 80 84 96" stroke="#a16207" stroke-width="6" fill="none"/>` +
      `<path d="M33 48 Q33 79 50 84 Q67 79 67 48 Q60 59 50 59 Q40 59 33 48 Z" fill="#d97706"/>` +
      `<path d="M45 76 L44 90 M55 76 L56 90" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M31 42 Q31 22 50 22 Q69 22 69 42 Z" fill="#6b7280"/>` +
      `<rect x="31" y="39" width="38" height="4" fill="#4b5563"/><rect x="48" y="39" width="4" height="15" rx="1.5" fill="#4b5563"/>`,
  },
  {
    nome: "Joana d'Arc",
    epoca: "França medieval",
    svg:
      busto(PELE.clara, "#9ca3af") +
      `<path d="M36 78 L64 78 L62 100 L38 100 Z" fill="#f8fafc"/>` +
      `<path d="M50 82 L50 98 M43 88 L57 88" stroke="#1d4ed8" stroke-width="3"/>` +
      `<path d="M31 50 Q29 24 50 24 Q71 24 69 50 L69 55 L63 55 L63 36 L37 36 L37 55 L31 55 Z" fill="#6b3f1d"/>` +
      `<path d="M33 40 Q50 30 67 40 L67 34 Q50 24 33 34 Z" fill="#6b3f1d"/>` +
      labios("#b45309"),
  },
  {
    nome: "Samurai",
    epoca: "Japão feudal",
    svg:
      busto(PELE.media, "#1f2937") +
      `<path d="M14 98 L18 80 L34 78 L32 98 Z M86 98 L82 80 L66 78 L68 98 Z" fill="#b91c1c"/>` +
      [84, 90]
        .map((y) => `<path d="M17 ${y} L33 ${y - 1} M67 ${y - 1} L83 ${y}" stroke="#111" stroke-width="1.8"/>`)
        .join("") +
      `<path d="M40 78 L50 92 L60 78" stroke="#f8fafc" stroke-width="3" fill="none"/>` +
      `<path d="M33 46 Q32 30 38 30 L38 46 Z M67 46 Q68 30 62 30 L62 46 Z" fill="#111"/>` +
      `<path d="M38 30 Q50 26 62 30 L62 33 Q50 30 38 33 Z" fill="#111"/>` +
      `<rect x="44" y="20" width="12" height="5" rx="2.5" fill="#111"/><rect x="48" y="22" width="4" height="8" fill="#111"/>`,
  },
  {
    nome: "Leonardo da Vinci",
    epoca: "Renascimento",
    svg:
      busto(PELE.clara, "#7f1d1d") +
      `<path d="M30 44 Q28 74 34 80 L40 80 L36 46 Z M70 44 Q72 74 66 80 L60 80 L64 46 Z" fill="#e5e7eb"/>` +
      `<path d="M34 50 Q34 86 50 92 Q66 86 66 50 Q60 60 50 60 Q40 60 34 50 Z" fill="#e5e7eb"/>` +
      `<path d="M30 34 Q30 18 50 18 Q72 18 74 32 Q60 28 50 29 Q38 29 30 34 Z" fill="#7f1d1d"/>`,
  },
  {
    nome: "Napoleão",
    epoca: "França, séc. XIX",
    svg:
      busto(PELE.clara, "#1e3a8a") +
      `<path d="M38 76 L50 94 L62 76 Z" fill="#f8fafc"/>` +
      `<path d="M14 82 Q24 74 34 77 L32 82 Z M86 82 Q76 74 66 77 L68 82 Z" fill="${ouro}"/>` +
      `<path d="M34 38 Q36 28 50 28 Q64 28 66 38 Q56 33 46 36 Q42 41 38 40 Z" fill="#3f2a1d"/>` +
      `<path d="M14 34 Q50 2 86 34 Q50 25 14 34 Z" fill="#111"/>` +
      `<circle cx="60" cy="21" r="4.5" fill="#1d4ed8"/><circle cx="60" cy="21" r="3" fill="#fff"/><circle cx="60" cy="21" r="1.5" fill="#dc2626"/>`,
  },
  {
    nome: "Marie Curie",
    epoca: "Ciência, séc. XX",
    svg:
      busto(PELE.clara, "#1f2937") +
      `<path d="M43 76 L50 82 L57 76" stroke="#f8fafc" stroke-width="2.5" fill="none"/>` +
      `<circle cx="50" cy="22" r="8" fill="#6b5b4b"/>` +
      `<path d="M32 46 Q31 26 50 26 Q69 26 68 46 Q64 33 50 32 Q36 33 32 46 Z" fill="#6b5b4b"/>` +
      `<rect x="72" y="76" width="9" height="20" rx="4" fill="#e0f2fe" stroke="#334155" stroke-width="1.5"/>` +
      `<rect x="73.5" y="86" width="6" height="8.5" rx="3" fill="#4ade80"/>` +
      labios("#b45309"),
  },
  {
    nome: "Albert Einstein",
    epoca: "Ciência, séc. XX",
    svg:
      `<path d="M26 44 L20 34 L30 32 L26 20 L38 25 L40 14 L50 22 L58 12 L62 24 L74 18 L72 31 L82 32 L74 42 L80 50 L68 48 L32 48 L20 52 Z" fill="#e5e7eb"/>` +
      busto(PELE.clara, "#78716c") +
      `<path d="M40 78 L50 90 L60 78" stroke="#f8fafc" stroke-width="3" fill="none"/>` +
      `<path d="M34 36 Q50 26 66 36 Q60 32 50 33 Q40 32 34 36 Z" fill="#e5e7eb"/>` +
      `<path d="M38 54 Q50 47 62 54 Q56 58 50 55 Q44 58 38 54 Z" fill="#d1d5db"/>`,
  },
  {
    nome: "Gandhi",
    epoca: "Índia, séc. XX",
    svg:
      busto(PELE.escura, PELE.escura) +
      `<path d="M12 100 Q14 79 38 76 L70 100 Z" fill="#f5f5f4"/>` +
      `<path d="M62 76 Q84 78 88 100 L78 100 Z" fill="#e7e5e4"/>` +
      `<path d="M33 52 Q31 46 34 42 M67 52 Q69 46 66 42" stroke="#e5e7eb" stroke-width="3" fill="none"/>` +
      `<circle cx="42" cy="44" r="5.5" fill="none" stroke="#1f2937" stroke-width="1.8"/>` +
      `<circle cx="58" cy="44" r="5.5" fill="none" stroke="#1f2937" stroke-width="1.8"/>` +
      `<path d="M47.5 44 L52.5 44" stroke="#1f2937" stroke-width="1.8"/>`,
  },
  {
    nome: "Frida Kahlo",
    epoca: "México, séc. XX",
    svg:
      busto(PELE.media, "#0d9488") +
      `<path d="M30 84 Q50 94 70 84" stroke="#dc2626" stroke-width="3" fill="none" stroke-dasharray="4 3"/>` +
      `<path d="M32 46 Q31 25 50 25 Q69 25 68 46 Q64 31 50 31 Q36 31 32 46 Z" fill="#111"/>` +
      `<path d="M30 30 Q50 16 70 30 Q50 22 30 30 Z" fill="#111"/>` +
      `<circle cx="36" cy="24" r="5" fill="#dc2626"/><circle cx="50" cy="19" r="5.5" fill="#f59e0b"/><circle cx="64" cy="24" r="5" fill="#ec4899"/>` +
      `<path d="M38 39 Q44 36 50 39 Q56 36 62 39" stroke="#111" stroke-width="2.6" fill="none"/>` +
      labios(),
  },
  {
    nome: "Tiradentes",
    epoca: "Brasil, Inconfidência",
    svg:
      `<path d="M30 40 Q30 21 50 21 Q70 21 70 40 L72 78 L28 78 Z" fill="#5b3a1f"/>` +
      busto(PELE.clara, "#f8fafc") +
      `<path d="M38 77 Q50 84 62 77" stroke="#d6d3d1" stroke-width="2.5" fill="none"/>` +
      `<path d="M34 48 Q34 80 50 84 Q66 80 66 48 Q60 58 50 58 Q40 58 34 48 Z" fill="#5b3a1f"/>` +
      `<path d="M33 38 Q50 22 67 38 Q60 30 50 30 Q40 30 33 38 Z" fill="#5b3a1f"/>`,
  },
  {
    nome: "Dom Pedro I",
    epoca: "Brasil Império",
    svg:
      busto(PELE.clara, "#14532d") +
      `<rect x="40" y="72" width="20" height="8" rx="2" fill="#14532d" stroke="${ouro}" stroke-width="1.5"/>` +
      `<path d="M14 84 Q24 75 34 77 L32 84 Z M86 84 Q76 75 66 77 L68 84 Z" fill="${ouro}"/>` +
      [84, 90, 96].map((y) => `<circle cx="50" cy="${y}" r="1.6" fill="${ouro}"/>`).join("") +
      `<path d="M32 46 Q30 24 50 24 Q70 24 68 46 L66 46 Q66 32 50 32 Q36 32 34 46 Z" fill="#2b1a10"/>` +
      `<path d="M32 44 L33 60 Q36 62 38 58 L37 44 Z M68 44 L67 60 Q64 62 62 58 L63 44 Z" fill="#2b1a10"/>` +
      `<path d="M36 29 Q42 22 48 28 Q54 21 60 27 Q65 24 67 32" stroke="#2b1a10" stroke-width="4" fill="none"/>`,
  },
  {
    nome: "Princesa Isabel",
    epoca: "Brasil Império",
    svg:
      busto(PELE.clara, "#fbcfe8") +
      `<path d="M42 74 Q50 80 58 74" stroke="#f9a8d4" stroke-width="3" fill="none"/>` +
      `<path d="M31 50 Q29 25 50 25 Q71 25 69 50 Q66 34 50 33 Q34 34 31 50 Z" fill="#4a2c17"/>` +
      `<circle cx="32" cy="52" r="6" fill="#4a2c17"/><circle cx="68" cy="52" r="6" fill="#4a2c17"/>` +
      `<path d="M37 28 L40 20 L45 26 L50 17 L55 26 L60 20 L63 28 Z" fill="${ouro}"/>` +
      `<circle cx="50" cy="23" r="1.8" fill="#dc2626"/>` +
      labios(),
  },
  {
    nome: "Zumbi dos Palmares",
    epoca: "Brasil Colônia",
    svg:
      busto(PELE.retinta, PELE.retinta) +
      `<path d="M12 100 Q16 80 36 77 L66 100 Z" fill="#a16207"/>` +
      `<path d="M38 77 Q50 88 62 77" stroke="#f8fafc" stroke-width="2.5" fill="none" stroke-dasharray="2 2.5"/>` +
      `<path d="M33 40 Q33 25 50 25 Q67 25 67 40 Q60 32 50 32 Q40 32 33 40 Z" fill="#111"/>` +
      `<path d="M37 54 Q38 66 50 67 Q62 66 63 54 Q58 61 50 61 Q42 61 37 54 Z" fill="#111"/>`,
  },
  {
    nome: "Dandara",
    epoca: "Brasil Colônia",
    svg:
      busto(PELE.retinta, "#ea580c") +
      `<path d="M40 76 Q50 84 60 76" stroke="${ouro}" stroke-width="2.5" fill="none"/>` +
      `<path d="M31 42 Q28 10 50 8 Q74 10 69 42 Q60 30 50 30 Q40 30 31 42 Z" fill="#f59e0b"/>` +
      `<path d="M33 30 Q50 22 67 30 M36 20 Q50 13 64 20" stroke="#b91c1c" stroke-width="3" fill="none"/>` +
      `<circle cx="32" cy="56" r="3.5" fill="none" stroke="${ouro}" stroke-width="2"/>` +
      `<circle cx="68" cy="56" r="3.5" fill="none" stroke="${ouro}" stroke-width="2"/>` +
      labios("#7f1d1d"),
  },
  {
    nome: "Santos Dumont",
    epoca: "Brasil, séc. XX",
    svg:
      busto(PELE.clara, "#334155") +
      `<path d="M40 74 L50 82 L60 74 L60 70 L40 70 Z" fill="#f8fafc"/>` +
      `<path d="M44 80 L50 86 L56 80" stroke="#b91c1c" stroke-width="3" fill="none"/>` +
      `<path d="M41 53 Q50 49 59 53 Q50 52 41 53 Z" stroke="#2b1a10" stroke-width="2.2" fill="#2b1a10"/>` +
      `<path d="M20 34 Q50 26 80 34 Q78 39 72 37 Q50 31 28 37 Q22 39 20 34 Z" fill="#e7d9b5"/>` +
      `<path d="M33 34 Q34 16 50 16 Q66 16 67 34 Z" fill="#e7d9b5"/>` +
      `<rect x="33" y="27" width="34" height="5" fill="#1f2937"/>`,
  },
  {
    nome: "Getúlio Vargas",
    epoca: "Brasil, séc. XX",
    svg:
      busto(PELE.clara, "#1f2937") +
      `<path d="M42 74 L50 84 L58 74 Z" fill="#f8fafc"/>` +
      `<path d="M20 82 L28 78 L76 100 L64 100 Z" fill="#16a34a"/>` +
      `<path d="M24 80 L70 100" stroke="${ouro}" stroke-width="3"/>` +
      `<path d="M32 48 Q31 36 36 32 L37 46 Z M68 48 Q69 36 64 32 L63 46 Z" fill="#9ca3af"/>` +
      `<path d="M37 32 Q50 26 63 32 Q50 30 37 34 Z" fill="#9ca3af"/>`,
  },
  {
    nome: "Caçador pré-histórico",
    epoca: "Pré-História",
    svg:
      busto(PELE.media, "#a16207") +
      `<path d="M12 100 Q14 80 30 77 L56 100 Z" fill="#78350f"/>` +
      [24, 34, 44].map((x) => `<circle cx="${x}" cy="${88 + (x - 24) / 3}" r="2.2" fill="#fef3c7"/>`).join("") +
      `<path d="M29 46 Q24 18 50 18 Q76 18 71 46 Q73 38 66 32 Q60 36 54 31 Q47 36 40 31 Q34 36 29 46 Z" fill="#3f2a1d"/>` +
      `<path d="M36 54 Q37 72 50 74 Q63 72 64 54 Q58 62 50 62 Q42 62 36 54 Z" fill="#3f2a1d"/>` +
      `<path d="M80 100 L76 60" stroke="#78350f" stroke-width="3"/><path d="M76 52 L72 62 L80 61 Z" fill="#9ca3af"/>`,
  },
  {
    nome: "Hoplita grego",
    epoca: "Grécia Antiga",
    svg:
      busto(PELE.media, "#b45309") +
      `<path d="M30 78 Q50 72 70 78 L66 100 L34 100 Z" fill="#d97706"/>` +
      `<path d="M30 52 Q28 22 50 22 Q72 22 70 52 L62 54 L62 44 Q56 46 54 58 L46 58 Q44 46 38 44 L38 54 Z" fill="#ca8a04"/>` +
      `<rect x="48" y="40" width="4" height="16" fill="#ca8a04"/>` +
      `<path d="M30 24 Q50 2 72 20 Q60 14 50 16 Q38 16 30 24 Z" fill="#dc2626"/>`,
  },
  {
    nome: "Cavaleiro medieval",
    epoca: "Idade Média",
    svg:
      busto(PELE.clara, "#9ca3af") +
      `<path d="M34 78 L66 78 L64 100 L36 100 Z" fill="#f8fafc"/>` +
      `<path d="M50 80 L50 98 M42 87 L58 87" stroke="#dc2626" stroke-width="4"/>` +
      `<path d="M30 60 L30 36 Q30 20 50 20 Q70 20 70 36 L70 60 Q60 66 50 66 Q40 66 30 60 Z" fill="#9ca3af"/>` +
      `<rect x="34" y="40" width="32" height="5" rx="2" fill="#1f2937"/><rect x="48" y="45" width="4" height="14" fill="#6b7280"/>` +
      [52, 57].map((y) => `<path d="M38 ${y} L44 ${y} M56 ${y} L62 ${y}" stroke="#1f2937" stroke-width="2"/>`).join(""),
  },
  {
    nome: "Monge copista",
    epoca: "Idade Média",
    svg:
      busto(PELE.clara, "#78350f") +
      `<path d="M24 100 Q24 70 50 68 Q76 70 76 100" stroke="#5b2b0c" stroke-width="5" fill="none"/>` +
      `<path d="M33 46 Q32 34 36 30 L38 44 Z M67 46 Q68 34 64 30 L62 44 Z" fill="#7c5a3a"/>` +
      `<path d="M36 30 Q50 24 64 30 Q50 28 36 32 Z" fill="#7c5a3a"/>` +
      `<path d="M74 70 L84 100 L62 100 Z" fill="#fef3c7"/><path d="M78 64 L70 82" stroke="#111" stroke-width="2"/>`,
  },
  {
    nome: "Navegador português",
    epoca: "Grandes Navegações",
    svg:
      busto(PELE.clara, "#1f2937") +
      `<path d="M38 72 Q50 82 62 72 Q50 76 38 72 Z" fill="#f8fafc" stroke="#e5e7eb" stroke-width="4"/>` +
      `<path d="M38 54 Q39 70 50 72 Q61 70 62 54 Q56 60 50 60 Q44 60 38 54 Z" fill="#4a2c17"/>` +
      `<path d="M31 36 Q31 22 50 22 Q69 22 69 36 L72 38 L28 38 Z" fill="#111"/>` +
      `<path d="M66 26 Q78 14 82 22 Q76 22 70 30 Z" fill="#dc2626"/>`,
  },
  {
    nome: "Pirata",
    epoca: "Séculos XVII–XVIII",
    svg:
      busto(PELE.media, "#f8fafc") +
      [82, 88, 94].map((y) => `<path d="M24 ${y} L76 ${y}" stroke="#dc2626" stroke-width="3"/>`).join("") +
      `<path d="M30 40 Q30 22 50 22 Q70 22 70 40 Z" fill="#dc2626"/>` +
      `<path d="M68 34 L80 42 L76 46 Z" fill="#dc2626"/>` +
      `<path d="M31 41 L69 41 M33 38 L67 50" stroke="#111" stroke-width="2"/>` +
      `<ellipse cx="58" cy="46" rx="5" ry="4" fill="#111"/>` +
      `<circle cx="33" cy="54" r="3" fill="none" stroke="${ouro}" stroke-width="2"/>` +
      `<path d="M38 54 Q40 70 50 72 Q60 70 62 54 Q56 60 50 60 Q44 60 38 54 Z" fill="#111"/>`,
  },
  {
    nome: "Guerreiro tupi",
    epoca: "Brasil, povos originários",
    svg:
      busto(PELE.morena, PELE.morena) +
      `<path d="M30 84 Q50 96 70 84" stroke="#f8fafc" stroke-width="2.5" fill="none" stroke-dasharray="3 3"/>` +
      [28, 34, 40, 46, 54, 60, 66, 72]
        .map(
          (x, i) =>
            `<ellipse cx="${x}" cy="${i < 4 ? 26 - i * 3 : 17 + (i - 4) * 3}" rx="3" ry="9" fill="${["#dc2626", "#f59e0b", "#16a34a", "#2563eb"][i % 4]}" transform="rotate(${(x - 50) * 1.6} ${x} 30)"/>`,
        )
        .join("") +
      `<path d="M32 46 Q31 28 50 28 Q69 28 68 46 Q66 36 50 36 Q34 36 32 46 Z" fill="#111"/>` +
      `<rect x="32" y="33" width="36" height="4" rx="2" fill="#f59e0b"/>` +
      `<path d="M38 50 L44 50 M56 50 L62 50" stroke="#b91c1c" stroke-width="2.5"/>`,
  },
  {
    nome: "Cangaceiro",
    epoca: "Brasil, Nordeste",
    svg:
      busto(PELE.media, "#a16207") +
      `<path d="M22 80 L70 100 M30 78 L76 98" stroke="#78350f" stroke-width="3"/>` +
      `<path d="M38 54 Q39 70 50 72 Q61 70 62 54 Q56 60 50 60 Q44 60 38 54 Z" fill="#2b1a10"/>` +
      `<path d="M16 38 Q50 34 84 38 Q60 24 50 4 Q40 24 16 38 Z" fill="#92400e"/>` +
      `<path d="M50 10 L46 30 L54 30 Z" fill="${ouro}"/>` +
      `<path d="M24 37 Q50 32 76 37" stroke="${ouro}" stroke-width="2" fill="none"/>`,
  },
  {
    nome: "Pracinha da FEB",
    epoca: "Brasil, 2ª Guerra",
    svg:
      busto(PELE.media, "#4d5d3a") +
      `<path d="M40 74 L50 84 L60 74" stroke="#3f4a2f" stroke-width="3" fill="none"/>` +
      `<circle cx="66" cy="86" r="5" fill="#f8fafc"/><path d="M66 82 L67 86 L66 90" stroke="#16a34a" stroke-width="2"/>` +
      `<path d="M28 42 Q28 18 50 18 Q72 18 72 42 L76 44 L24 44 Z" fill="#556b2f"/>` +
      `<path d="M30 30 Q50 26 70 30" stroke="#3f4a2f" stroke-width="2" fill="none"/>`,
  },
  {
    nome: "Astronauta",
    epoca: "Corrida espacial",
    svg:
      corpo("#f1f5f9") +
      `<rect x="40" y="80" width="20" height="12" rx="2" fill="#94a3b8"/><circle cx="45" cy="86" r="2" fill="#dc2626"/><circle cx="55" cy="86" r="2" fill="#2563eb"/>` +
      `<circle cx="50" cy="46" r="27" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>` +
      `<ellipse cx="50" cy="47" rx="19" ry="16" fill="#1e3a8a"/>` +
      `<path d="M38 40 Q44 34 52 35" stroke="#93c5fd" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
];

const porNome = (nomes: string[]) =>
  nomes.map((n) => {
    const p = TODOS.find((t) => t.nome === n);
    if (!p) throw new Error(`Personagem não encontrado: ${n}`);
    return p;
  });

/** Liberados para todos (índices 0–19 de alunos.avatar). */
const BASICOS = porNome([
  "Caçador pré-histórico",
  "Faraó",
  "Hoplita grego",
  "Legionário romano",
  "Viking",
  "Cavaleiro medieval",
  "Monge copista",
  "Samurai",
  "Navegador português",
  "Guerreiro tupi",
  "Pirata",
  "Dandara",
  "Princesa Isabel",
  "Cangaceiro",
  "Santos Dumont",
  "Frida Kahlo",
  "Getúlio Vargas",
  "Gandhi",
  "Pracinha da FEB",
  "Astronauta",
]);

/** Especiais (índices 20–29): o 1º desafio vencido libera o 1º, o 2º libera o 2º, e assim por diante. */
const ESPECIAIS = porNome([
  "Cleópatra",
  "Júlio César",
  "Joana d'Arc",
  "Leonardo da Vinci",
  "Zumbi dos Palmares",
  "Tiradentes",
  "Napoleão",
  "Dom Pedro I",
  "Marie Curie",
  "Albert Einstein",
]);

export const PERSONAGENS = [...BASICOS, ...ESPECIAIS];
export const TOTAL_PERSONAGENS = PERSONAGENS.length;
export const INICIO_ESPECIAIS = BASICOS.length;

export const ehEspecial = (avatar: number) => avatar >= INICIO_ESPECIAIS;

/** Quantas medalhas o aluno precisa para usar este avatar (0 para os básicos). */
export const medalhasNecessarias = (avatar: number) => (ehEspecial(avatar) ? avatar - INICIO_ESPECIAIS + 1 : 0);
