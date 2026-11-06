"use client";
import { useEffect, type RefObject } from "react";
import {
  cliqueFora,
  cliqueSemMovimento,
  elementoEstranho,
  mouseMexeu,
  teclaConta,
  type MotivoZerada,
} from "@/lib/tela-protegida";

/**
 * Vigia a questão em andamento e chama `zerar` quando o jogador sai da tela,
 * aperta uma tecla, clica fora das alternativas, responde sem mexer o mouse ou
 * quando algo de fora do app (extensão ou script) mexe na página ou clica. Usado
 * pela pesquisa bloqueada dos desafios da
 * turma e pela rodada final dos desafios públicos.
 *
 * As saídas são contadas sempre (vão para o relatório); `protegida` diz se
 * elas zeram a questão.
 */
export function useTelaProtegida({
  protegida,
  tecladoBloqueado,
  enviado,
  saidas,
  fora,
  dialogoProprio,
  zerar,
}: {
  protegida: boolean;
  tecladoBloqueado: boolean;
  enviado: RefObject<boolean>;
  saidas: RefObject<number>;
  /** O jogador já está fora: não conta de novo até voltar. */
  fora: RefObject<boolean>;
  /** Um diálogo do próprio app está aberto (tira o foco sem ser saída). */
  dialogoProprio: RefObject<boolean>;
  zerar: (motivo: MotivoZerada) => void;
}) {
  // Troca de aba ou de app, clique em outra janela ou saída da tela cheia.
  useEffect(() => {
    const saiu = () => {
      if (fora.current || dialogoProprio.current || enviado.current) return;
      fora.current = true;
      saidas.current += 1;
      if (protegida) zerar("saida");
    };
    const voltou = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) fora.current = false;
    };
    const aoMudarVisibilidade = () => (document.visibilityState === "hidden" ? saiu() : voltou());
    const aoMudarTelaCheia = () => {
      if (!document.fullscreenElement) saiu();
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    document.addEventListener("fullscreenchange", aoMudarTelaCheia);
    window.addEventListener("blur", saiu);
    window.addEventListener("focus", voltou);
    return () => {
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      document.removeEventListener("fullscreenchange", aoMudarTelaCheia);
      window.removeEventListener("blur", saiu);
      window.removeEventListener("focus", voltou);
    };
  }, [protegida, zerar, enviado, saidas, fora, dialogoProprio]);

  // Qualquer tecla zera. Atalhos do sistema, como Alt+Tab, nem chegam aqui,
  // mas já tiram o jogador da tela.
  const bloquearTeclado = protegida && tecladoBloqueado;
  useEffect(() => {
    if (!bloquearTeclado) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (enviado.current || dialogoProprio.current || !teclaConta(e.key)) return;
      e.preventDefault();
      zerar("teclado");
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [bloquearTeclado, zerar, enviado, dialogoProprio]);

  // Um elemento que aparece na página sem ter sido criado pelo app (botão de IA,
  // marca-texto, barra lateral de extensão) zera a questão. O jogador não é
  // avisado disso, a pedido do professor, para não dar a ideia.
  useEffect(() => {
    if (!protegida) return;
    const observador = new MutationObserver((mudancas) => {
      if (enviado.current) return;
      if (mudancas.some((m) => Array.from(m.addedNodes).some(elementoEstranho))) zerar("tela_alterada");
    });
    observador.observe(document.body, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [protegida, zerar, enviado]);

  // Clique de mouse fora das alternativas e dos botões zera a questão.
  // Clique de mouse sem nenhum movimento desde que a questão apareceu também
  // zera. A questão monta de novo a cada troca, então o movimento começa do
  // zero. Esse teste fica no "click", não no "pointerdown", para não pegar quem
  // começa a arrastar um item (ordenar) com o cursor já em cima dele.
  useEffect(() => {
    if (!protegida) return;
    let mexeu = false;
    const aoMover = (e: PointerEvent) => {
      if (mouseMexeu(e)) mexeu = true;
    };
    const aoApertar = (e: PointerEvent) => {
      if (enviado.current || !cliqueFora(e, document.documentElement.clientWidth)) return;
      zerar("clique_fora");
    };
    const aoClicar = (e: MouseEvent) => {
      if (enviado.current) return;
      // Clique feito por script (extensão que responde sozinha) não vem
      // marcado como do usuário. Zera com o aviso genérico, para não dar a ideia.
      if (!e.isTrusted) zerar("tela_alterada");
      else if (e instanceof PointerEvent && cliqueSemMovimento(e, mexeu)) zerar("sem_mouse");
    };
    document.addEventListener("pointermove", aoMover, true);
    document.addEventListener("pointerdown", aoApertar, true);
    document.addEventListener("click", aoClicar, true);
    return () => {
      document.removeEventListener("pointermove", aoMover, true);
      document.removeEventListener("pointerdown", aoApertar, true);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [protegida, zerar, enviado]);
}
