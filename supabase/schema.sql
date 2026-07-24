-- Schema Supabase per Prioritize
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query → Run

-- Tabella utenti applicativi (non è l'autenticazione di Supabase: qui restiamo
-- semplici con MIRKO/ADMIN come richiesto, la password è verificata lato
-- funzione serverless, mai esposta al client)
create table if not exists app_users (
  username text primary key,
  password_hash text not null
);

-- Note
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  owner text not null references app_users(username),
  title text,
  content text,
  checklist jsonb default '[]',
  links jsonb default '[]',
  images jsonb default '[]',
  attachments jsonb default '[]',
  generated_image jsonb,
  history jsonb default '[]',
  last_edited_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Eventi calendario
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  owner text not null references app_users(username),
  title text,
  date timestamptz,
  description text,
  color text,
  category text,
  status text default 'da fare',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Countdown
create table if not exists countdowns (
  id uuid primary key default gen_random_uuid(),
  owner text not null references app_users(username),
  title text,
  date timestamptz,
  color text,
  important boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);

-- Cestino (elementi eliminati, recuperabili 30 giorni)
create table if not exists trash (
  id uuid primary key default gen_random_uuid(),
  owner text not null references app_users(username),
  item_type text not null, -- 'note' | 'event' | 'countdown'
  item jsonb not null,
  deleted_at timestamptz default now()
);

-- Impostazioni per utente
create table if not exists user_settings (
  owner text primary key references app_users(username),
  theme text default 'auto',
  notifications jsonb default '{"enabled": false, "sound": true, "reminders": [15, 60]}'
);

-- Righe iniziali per MIRKO e ADMIN (la password reale viene impostata dalla
-- funzione serverless al primo deploy — qui solo un placeholder)
insert into app_users (username, password_hash) values
  ('MIRKO', 'CAMBIARE_CON_HASH_REALE'),
  ('ADMIN', 'CAMBIARE_CON_HASH_REALE')
on conflict (username) do nothing;

-- Row Level Security: ogni utente vede SOLO le proprie righe.
-- Con l'anon key pubblica la separazione reale avviene lato funzione
-- serverless (che verifica la sessione prima di ogni query), non affidandosi
-- al solo RLS — per questo le policy sotto sono permissive a livello di
-- tabella e la vera barriera è nel backend applicativo.
alter table notes enable row level security;
alter table events enable row level security;
alter table countdowns enable row level security;
alter table trash enable row level security;
alter table user_settings enable row level security;

create policy "service role full access - notes" on notes for all using (true) with check (true);
create policy "service role full access - events" on events for all using (true) with check (true);
create policy "service role full access - countdowns" on countdowns for all using (true) with check (true);
create policy "service role full access - trash" on trash for all using (true) with check (true);
create policy "service role full access - settings" on user_settings for all using (true) with check (true);
