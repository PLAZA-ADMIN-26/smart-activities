# Collegare Supabase — cosa serve e come funzionerà

## Perché non uso subito l'anon key dal browser

Un errore comune (che NON voglio fare) è chiamare Supabase direttamente dal
browser con la chiave "anon" pubblica e regole di sicurezza (RLS) permissive:
in quel caso MIRKO potrebbe aprire gli strumenti sviluppatore e leggere anche
i dati di ADMIN, vanificando la separazione che mi hai chiesto esplicitamente.

L'architettura corretta (quella che implementerò): il browser non parla mai
direttamente con Supabase. Parla con le funzioni serverless del sito
(`/api/...`, le stesse già usate per l'IA), e SOLO quelle funzioni — che
girano sul server, non nel browser — usano la chiave "service role" di
Supabase per leggere/scrivere i dati, dopo aver verificato quale utente ha
effettuato l'accesso. La chiave service role non finisce mai nel codice
visibile al browser.

## Cosa mi serve da te per procedere

1. Crea un account gratuito su https://supabase.com (nessuna carta richiesta).
2. Crea un nuovo progetto (scegli una regione europea se disponibile, per
   maggiore velocità dall'Italia).
3. Nel progetto: apri **SQL Editor** → incolla il contenuto di
   `supabase/schema.sql` (incluso in questo progetto) → Run. Questo crea
   tutte le tabelle necessarie (note, eventi, countdown, cestino, impostazioni).
4. Vai in **Project Settings → API** e copiami questi due valori:
   - **Project URL** (es. `https://xxxxx.supabase.co`)
   - **service_role key** (NON la "anon public" — quella con più permessi,
     visibile solo a te nel pannello Supabase)

Con questi due valori procedo a:
- sostituire `src/utils/storage.js` con chiamate alle funzioni serverless
  invece che a `localStorage`
- creare le funzioni serverless `/api/notes`, `/api/events`,
  `/api/countdowns`, `/api/settings`, `/api/auth` che parlano con Supabase
- mantenere il login con MIRKO/ADMIN così com'è oggi, ma con la password
  verificata sul server e una sessione firmata invece che solo in
  `localStorage`

## Cosa cambia per te dopo il collegamento

- Le stesse note/eventi/countdown saranno visibili da qualunque dispositivo
  con cui accedi con lo stesso utente (telefono, computer, ecc.)
- Chiudere il browser o disinstallare l'app non cancella più nulla
- Il cestino, la cronologia versioni e i backup automatici continueranno a
  funzionare, ma salvati su Supabase invece che solo sul dispositivo

Fammi sapere quando hai i due valori (Project URL + service_role key) e
procedo con la migrazione del codice.
