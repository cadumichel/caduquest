import { createHash, timingSafeEqual } from "node:crypto";
import { createMcpHandler } from "mcp-handler";
import { registrarFerramentas } from "@/lib/conector/ferramentas";

export const maxDuration = 60;

const resumo = (texto: string) => createHash("sha256").update(texto).digest();

/**
 * Conector do CaduQuest para o Claude (servidor MCP). A chave secreta vai no
 * próprio endereço do conector: /api/mcp/<MCP_CHAVE>.
 */
async function tratar(request: Request, { params }: RouteContext<"/api/mcp/[chave]">) {
  const { chave } = await params;
  const esperada = process.env.MCP_CHAVE;
  if (!esperada || !timingSafeEqual(resumo(chave), resumo(esperada))) {
    return new Response("Não autorizado", { status: 401 });
  }
  const origem = new URL(request.url).origin;
  const handler = createMcpHandler((server) => registrarFerramentas(server, origem), {
    serverInfo: { name: "CaduQuest", version: "1.0.0" },
    instructions:
      "Banco de questões e desafios do CaduQuest, app de revisão gamificada de História do professor Cadu. Responda em português. Questões novas entram como rascunho; o professor revisa e publica no app. Desafios só são criados depois da confirmação explícita do professor.",
  });
  return handler(request);
}

export { tratar as GET, tratar as POST, tratar as DELETE };
