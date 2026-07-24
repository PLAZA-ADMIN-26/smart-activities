# Prioritize

> Nota: la cartella e i file del progetto mantengono il nome interno "plaza-app" /
> "plaza-organizer" come richiesto (non è necessario rinominare la struttura del
> codice) — il nome pubblico mostrato nell'app, nel titolo del browser e nella
> schermata iniziale è ora **Prioritize**, con il logo caricato.

## Novità di questa versione rispetto alla precedente

- Rebranding completo a "Prioritize" (titolo, manifest PWA, icone, login)
- Dashboard "La tua giornata": saluto dinamico, prossimo impegno con countdown live,
  3 attività più urgenti, countdown in evidenza, note recenti, sezione
  "Continua da dove eri rimasto", pulsante "Cosa devo fare adesso?"
- Notifiche push realmente collegate allo stato del permesso del browser (non più
  solo un interruttore grafico), suono attivabile/disattivabile con beep reale,
  gestione dei browser non compatibili
- IA delle note più strutturata: separa Attività / Scadenze / Idee / Informazioni,
  ripulisce leggermente il testo, mostra "Anteprima modifica IA" con Applica
  modifiche / Annulla, e separa titolo / data / ora / categoria delle attività
  invece di copiare l'intera frase
- Rilevamento progetti separato dalla generazione immagine: compare solo quando la
  nota descrive davvero un'idea progettuale ("Ho rilevato un possibile progetto…"),
  sempre etichettato BETA
- Cronologia versioni delle note (ultime 10), con utente che ha modificato e
  pulsante "Ripristina versione precedente"
- Countdown: possibilità di segnare come importante (compare in homepage),
  ordinamento automatico per scadenza
- Calendario: categoria "Urgente" aggiunta, spostamento eventi via trascinamento
  (drag & drop da desktop/mouse — su mobile si usa la modifica rapida), countdown
  breve per evento
- Design rinnovato: font Inter con gerarchia più marcata, forme più arrotondate,
  animazioni leggere (comparsa graduale di card e sezioni), nessuna emoji colorata
  (sostituite con icone lineari), pulsante flottante per creare rapidamente una
  nuova nota o attività, area di tocco minima 44px ovunque
- Feedback discreti dopo le azioni ("Salvato ✓", "Attività aggiunta al
  calendario ✓", "Nota organizzata correttamente ✓") e messaggi di errore
  comprensibili invece di errori tecnici
- Schermata di login senza suggerimenti automatici di username, schermata di
  benvenuto animata dopo l'accesso ("Bentornato ADMIN/MIRKO")
- Esportazione dati rafforzata: "Esporta tutti i miei dati" (JSON) ed export
  leggibile delle note in PDF

## Limite onesto che resta

Come nella versione precedente, i dati restano su `localStorage` del dispositivo:
non c'è ancora un vero database condiviso, quindi chiudere il browser o cambiare
dispositivo non sincronizza i dati automaticamente (restano però protetti da
cronologia versioni, cestino 30 giorni e backup automatico giornaliero sullo
stesso dispositivo). Per una sincronizzazione reale multi-dispositivo serve
collegare un backend come Supabase — il codice è organizzato per rendere questo
passaggio più semplice in futuro (tutte le letture/scritture passano da
`src/utils/storage.js`).

---

# Prioritize — Il sito per organizzare le tue idee

App di produttività personale (PWA installabile) con login, note intelligenti,
calendario, countdown e impostazioni. Palette calda (beige/terracotta), tema
chiaro/scuro/automatico, dati separati per utente (MIRKO / ADMIN).

## 1. Cosa fare UNA SOLA VOLTA (richiede terminale)

Questa è l'unica parte che richiede un terminale: pubblicare il sito online.
Una volta pubblicato, tu (o chiunque) lo userete SEMPRE aprendo un link,
senza mai più toccare un terminale.

```bash
npm install
npm run build
```

Questo crea la cartella `dist/` con il sito pronto (HTML, CSS, JS, manifest,
service worker, icone).

## 2. Pubblicazione online (permanente, gratuita)

### Opzione A — Vercel (consigliata, più semplice)
1. Crea un account su https://vercel.com (anche con GitHub).
2. Se hai messo il progetto su GitHub: "Add New Project" → seleziona la repo
   → Vercel riconosce automaticamente Vite → Deploy.
3. Se NON usi GitHub: installa la CLI una sola volta con
   `npm install -g vercel`, poi dentro la cartella del progetto digita
   `vercel` e segui le domande (Enter per le impostazioni di default).
4. Otterrai un link tipo `https://plaza-tuonome.vercel.app` — apri quel link
   da telefono o computer, sempre attivo, nessun terminale necessario da quel
   momento in poi.

### Opzione B — Netlify
1. Crea un account su https://app.netlify.com
2. "Add new site" → "Deploy manually" → trascina la cartella `dist/` generata
   al passo 1, oppure collega la repo GitHub (build command: `npm run build`,
   publish directory: `dist`).
3. Ottieni un link permanente tipo `https://plaza-tuonome.netlify.app`.

Dopo la pubblicazione, aprendo il link da smartphone comparirà il prompt
"Aggiungi a schermata Home" (iPhone: tasto Condividi → "Aggiungi a Home";
Android: Chrome mostra un banner "Installa app"). Da quel momento l'app si
apre come un'icona sul telefono, a schermo intero, senza barra del browser.

## 3. Login

Utenti autorizzati (controllo lato frontend):
- **MIRKO** / password: `Plaza2026`
- **ADMIN** / password: `Plaza2026`

Ogni utente vede solo i propri dati (note, eventi, countdown, impostazioni),
salvati con chiavi separate nel browser (es. `notes_MIRKO`, `notes_ADMIN`).

## 4. Cose importanti da sapere

- **Dati salvati nel browser**: attualmente l'app usa `localStorage` del
  browser/dispositivo su cui viene aperta. Questo significa che i dati NON si
  sincronizzano automaticamente tra telefono e computer — restano sul
  dispositivo dove li hai inseriti. Per avere sincronizzazione multi-dispositivo
  reale, il passo successivo è collegare un backend come Supabase (vedi sotto).
- **Backup**: da Impostazioni → Dati puoi scaricare ed importare un backup
  JSON completo in qualsiasi momento. Viene inoltre creato un backup
  automatico giornaliero (ultime 10 copie) salvato localmente.
- **Cestino**: gli elementi eliminati restano recuperabili per 30 giorni
  prima di essere rimossi definitivamente (i dati grezzi sono nel browser,
  chiave `trash_<UTENTE>`).
- **"Sistema le mie idee"**: è un motore euristico reale (riconosce "domani",
  "venerdì", "10 agosto", "alle 15", parole come "chiamare"/"consegna" ecc.)
  che organizza il testo e propone attività da aggiungere al calendario.
  Non è collegato a un vero modello linguistico (per farlo servirebbe una
  chiave API gestita da un backend sicuro).
- **"Genera immagine del progetto (BETA)"**: come richiesto, è simulata con
  un placeholder colorato — non genera immagini reali.
- **Notifiche push**: funzionano solo mentre il sito è aperto in una scheda
  (o, su Android, quando l'app PWA installata gira in background); per
  notifiche push reali anche a browser chiuso servirebbe un servizio push
  con backend dedicato.

## 5. Prossimo passo consigliato: sincronizzazione reale (Supabase)

Se in futuro vuoi che i dati siano identici su telefono e computer, il passo
è collegare Supabase (autenticazione + database Postgres + backup gestiti).
Il codice è organizzato per rendere questo passaggio semplice: tutte le
funzioni di lettura/scrittura passano da `src/utils/storage.js`, che potrà
essere sostituito con chiamate API a Supabase mantenendo invariata il resto
dell'app.

## 6. Sviluppo locale (facoltativo)

Se in futuro vuoi modificare il codice:

```bash
npm install
npm run dev
```

Apre un server locale (utile solo per modificare il sito, non necessario per
l'uso quotidiano una volta pubblicato).
