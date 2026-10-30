-- Carta coringa com aprovação: o tema do campeão só aparece para todos depois
-- que o professor aprova (podendo editar). Idempotente: pode rodar mais de uma vez.

alter table cartas_coringa add column if not exists status text not null default 'pendente';
alter table cartas_coringa drop constraint if exists cartas_coringa_status_check;
alter table cartas_coringa add constraint cartas_coringa_status_check
  check (status in ('pendente', 'aprovada', 'recusada'));

drop policy if exists professor_edita on cartas_coringa;
create policy professor_edita on cartas_coringa for update to authenticated
  using (exists (select 1 from temporadas t where t.id = temporada_id and t.professor_id = (select auth.uid())))
  with check (exists (select 1 from temporadas t where t.id = temporada_id and t.professor_id = (select auth.uid())));
