"use client";
import { useState, useTransition } from "react";
import { CamposEspecial } from "@/components/CamposEspecial";
import { CamposRegras, regrasParaEnvio, regrasParaForm, type Regras } from "@/components/CamposRegras";
import { EscolhaPesquisa } from "@/components/EscolhaPesquisa";
import { Aviso, Botao, Campo, Cartao, Entrada, Subtitulo } from "@/components/ui";
import { DIAS_MAX, DIAS_MIN, type Padroes } from "@/lib/padroes";
import { VERIFICACAO_MAX_S, VERIFICACAO_MIN_S } from "@/lib/questoes/tempos";
import { VERIFICACAO_TEMPO_S } from "@/lib/questoes/verificacao";
import { salvarConfiguracoes, type EstadoForm } from "../actions";

export function FormConfiguracoes({ inicial }: { inicial: Padroes }) {
  const [regras, setRegras] = useState<Regras>(() => regrasParaForm(inicial.regras));
  const [bloqueada, setBloqueada] = useState(inicial.pesquisa_bloqueada);
  const [pontos, setPontos] = useState(String(inicial.pontos_por_acerto));
  const [verificacao, setVerificacao] = useState(
    inicial.tempo_verificacao_s === null ? "" : String(inicial.tempo_verificacao_s),
  );
  const [dias, setDias] = useState(String(inicial.dias_aberto));
  const [multiplicador, setMultiplicador] = useState(inicial.especial_multiplicador);
  const [percentual, setPercentual] = useState(inicial.especial_tempo_percentual);
  const [msg, setMsg] = useState<EstadoForm>({});
  const [pendente, iniciar] = useTransition();

  const salvar = () =>
    iniciar(async () => {
      setMsg(
        await salvarConfiguracoes({
          regras: regrasParaEnvio(regras),
          pesquisa_bloqueada: bloqueada,
          pontos_por_acerto: Number(pontos),
          tempo_verificacao_s: verificacao.trim() === "" ? null : Number(verificacao),
          dias_aberto: Number(dias),
          especial_multiplicador: multiplicador,
          especial_tempo_percentual: percentual,
        }),
      );
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Cartao className="space-y-4">
        <Subtitulo>Regras do desafio</Subtitulo>
        <EscolhaPesquisa bloqueada={bloqueada} onChange={setBloqueada} />
        <CamposRegras valor={regras} onChange={setRegras} pesquisaBloqueada={bloqueada} totalQuestoes={10} />
      </Cartao>

      <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
        <Cartao className="space-y-3">
          <Subtitulo>Pontos e prazos</Subtitulo>
          <Campo rotulo="Pontos por acerto">
            <Entrada type="number" min={1} max={100} value={pontos} onChange={(e) => setPontos(e.target.value)} />
          </Campo>
          <Campo rotulo="Dias que o desafio fica aberto" dica={`De ${DIAS_MIN} a ${DIAS_MAX}. Fecha às 23h59.`}>
            <Entrada
              type="number"
              min={DIAS_MIN}
              max={DIAS_MAX}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
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
              value={verificacao}
              onChange={(e) => setVerificacao(e.target.value)}
            />
          </Campo>
        </Cartao>

        <Cartao className="space-y-3 border-amber-300">
          <Subtitulo>★ Desafio especial</Subtitulo>
          <p className="text-sm text-slate-600">
            O que um desafio ganha quando você o marca como especial. Visual dourado para os alunos.
          </p>
          <CamposEspecial
            multiplicador={multiplicador}
            percentual={percentual}
            onMultiplicador={setMultiplicador}
            onPercentual={setPercentual}
          />
        </Cartao>

        {msg.erro && <Aviso>{msg.erro}</Aviso>}
        {msg.ok && <Aviso tipo="ok">{msg.ok}</Aviso>}
        <Botao className="w-full" disabled={pendente} onClick={salvar}>
          {pendente ? "Salvando…" : "Salvar padrões"}
        </Botao>
      </div>
    </div>
  );
}
