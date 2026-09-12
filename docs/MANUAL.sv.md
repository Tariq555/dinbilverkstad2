# Din Bilverkstad — Däcklager

Ett komplett skrivbordsprogram för däckhantering i en svensk däckverkstad.
Programmet är **helt lokalt och fungerar utan internet** — ingen molntjänst,
ingen inloggning, inga abonnemang. All data ligger i en SQLite-databas på
datorn.

---

## Snabbstart (utveckling på macOS)

```bash
npm install
npm run dev
```

Ett skrivbordsfönster öppnas med samma gränssnitt som senare paketeras till
Windows. Ändrar du React-kod uppdateras fönstret direkt tack vare hot reload —
ingen omstart behövs.

Första gången skapas databasen automatiskt — **helt tom**. Verkstaden börjar
alltså direkt med sitt eget lager, utan exempeldata som måste rensas bort.

Under utveckling kan demodata laddas manuellt via **Inställningar → Databas →
Ladda demodata**. Den knappen visas bara när appen körs i utvecklingsläge och
finns inte i den installerade versionen kunden får.

## Bygga Windows-installeraren

```bash
npm run dist
```

Resultat: **`release/TireShop-Setup.exe`**

Installeraren kan byggas direkt från macOS — inga native-moduler behöver
kompileras. Kunden installerar bara `.exe`-filen och kör programmet som vilket
Windows-program som helst. Ingen Node.js, npm, Git, Docker eller Python behövs
på kundens dator.

| Kommando | Gör |
|---|---|
| `npm run dev` | Startar utvecklingsläget med hot reload |
| `npm run build` | Bygger renderare och huvudprocess |
| `npm run dist` | Bygger Windows-installeraren `TireShop-Setup.exe` |
| `npm run dist:mac` | Bygger en macOS-version (osignerad, för test) |
| `npm run typecheck` | Kontrollerar typerna utan att bygga |
| `npm test` | Kör testsviten |
| `npm run test:watch` | Kör testerna om vid varje ändring |
| `npm run test:coverage` | Kör testerna med täckningsrapport |

---

## Funktioner

**Dashboard** — Lager, sålda idag, försäljning idag, lågt lager och lagervärde.
Däcklagret uppdelat på de fem däcktyperna (klicka på en kategori för att öppna
lagret filtrerat), stapeldiagram över de senaste 14 dagarna, säsongsfördelning,
lågt lager-lista och mest sålda artiklar.

**Lager** — Sökbar och sorterbar tabell med filter på däcktyp, märke, dimension,
lagernivå och nytt/begagnat. Redigera, sälj eller ta bort direkt i listan.

**Däck** — Snabbregistrering byggd för att mata in många däck i följd. Däcktypen
väljs med ett klick bland de fem kategorierna.
<kbd>Ctrl</kbd> + <kbd>Enter</kbd> sparar och öppnar direkt nästa tomma
formulär, medan märke, säsong och placering ligger kvar. Dimensioner
normaliseras automatiskt: skriv `2055516` så blir det `205/55R16`.

**Försäljning** — Sök fram däcket, ange antal och pris, granska summering och
bekräfta. Lagret minskas i samma transaktion och det går aldrig att sälja fler
däck än vad som finns.

**Historik** — Alla försäljningar med datumfilter (idag, 7/30 dagar, i år eller
eget intervall), summeringar och möjlighet att ångra en försäljning — däcken
läggs då tillbaka i lagret.

**Inställningar** — Butiksnamn, logotyp, valuta, standardvärden vid ny artikel,
backup samt två databasåtgärder: **Töm databasen** (raderar demodatan så att du
kan börja med ditt eget lager — inställningar och logotyp behålls) och
**Nollställ databasen** (lägger tillbaka demodatan). Båda kräver bekräftelse.

### Tangentbordsgenvägar

| Genväg | Funktion |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>N</kbd> | Lägg till däck |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Sälj däck |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> | Sök i lagret |
| <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | Spara och lägg till nästa däck |

---

## Däcktyper

Systemet är byggt för en vanlig bilverkstad som arbetar med personbilar. Därför
finns bara de fem kategorier som faktiskt används:

| Kategori | Säsong | Dubbat |
|---|---|---|
| Sommardäck | Sommar | Nej |
| Vinterdäck | Vinter | Nej |
| Dubbdäck | Vinter | Ja |
| Friktionsdäck | Vinter | Nej |
| M+S-däck | Helår | Nej |

Dubbdäck och friktionsdäck är båda vinterdäck. M+S är en märkning, inte en egen
säsong.

Personalen väljer **en** kategori när ett däck registreras — säsong och dubbning
sätts automatiskt utifrån valet. Det gör att ett dubbdäck aldrig kan hamna i
lagret som sommardäck, och att inmatningen går snabbare.

I lagerfiltret omfattar valet **Vinterdäck** alla vinterdäck, alltså även dubb-
och friktionsdäck.

Behöver fler kategorier läggas till i framtiden räcker det att komplettera
`TIRE_CATEGORIES` i [`shared/constants.ts`](shared/constants.ts) — formulär,
filter och dashboard uppdateras automatiskt.

---

## Var lagras databasen?

Databasen sparas i operativsystemets katalog för programdata — **aldrig i
installationsmappen**. Därför överlever den både uppdateringar och
ominstallation av programmet.

| System | Sökväg |
|---|---|
| Windows | `%APPDATA%\Din Bilverkstad\data\dinbilverkstad.db` |
| macOS | `~/Library/Application Support/Din Bilverkstad/data/dinbilverkstad.db` |

Den exakta sökvägen visas alltid under **Inställningar → Databas**.

### Backup

**Inställningar → Backup och återställning → Skapa backup** exporterar databasen
till valfri plats (USB-minne, nätverksmapp, molnmapp). Systemets egen
spara-dialog frågar alltid innan en befintlig fil skrivs över.

**Återställ backup** sker i två steg: filen valideras och programmet visar hur
många artiklar och försäljningar den innehåller, och först efter en uttrycklig
bekräftelse skrivs den in. En säkerhetskopia av den nuvarande databasen sparas
alltid först i `safety-backups/` (de tio senaste behålls).

Under **Backupmapp** kan du välja en mapp och slå på automatisk backup varje
gång programmet stängs.

---

## Logotyp

Verkstadens logotyp visas som banderoll högst upp i programmet och i sidomenyn.
Standardlogotypen ligger i `src/assets/dinbilverkstad-logo.png` och visas i sin
ursprungliga form — den skalas efter fönstret men beskärs aldrig och ändras inte.

Vill verkstaden byta bild går det via **Inställningar → Butik → Logotyp**. Den
uppladdade bilden används då både i banderollen och i sidomenyn, sparas i
databasen och följer med i backuper. Ingen kod behöver ändras.

Vill du byta själva standardlogotypen ersätter du filen
`src/assets/dinbilverkstad-logo.png`.
Programikonen för Windows ligger i `build/icon.ico` och kan genereras om med
`node scripts/generate-icon.mjs`. Se [src/assets/README.md](src/assets/README.md).

---

## Arkitektur

```
electron/            Huvudprocessen — allt som rör databas och operativsystem
  main.ts            Fönster, meny, livscykel
  preload.ts         Säker IPC-brygga (contextBridge)
  db/                SQLite-motor, migreringar, demodata
  repositories/      Affärslogik: produkter, försäljning, statistik, inställningar
  services/          Backup och återställning
  ipc/               IPC-hanterare med enhetlig felhantering
shared/              Typer, konstanter och demodata som delas mellan processerna
src/                 React-gränssnittet (renderaren)
  components/        Återanvändbara UI-komponenter, layout och diagram
  features/          Funktionsområden: lager, däck, försäljning
  pages/             En fil per vy i sidomenyn
  services/          API-lager mot preload-bryggan
  hooks/  utils/     Delade hooks och hjälpfunktioner
  styles/  assets/   Designsystem och bilder
```

### Säkerhet

Renderaren körs med `contextIsolation`, `sandbox` påslaget och
`nodeIntegration` avstängt. React har **ingen** tillgång till Node.js,
filsystemet eller databasen — bara till de funktioner som uttryckligen
exponeras i `electron/preload.ts`. All SQL körs i huvudprocessen med
parametriserade frågor, och alla skrivningar sker i transaktioner.

### Varför WebAssembly i stället för en native SQLite-modul?

Databasen använder `sql.js` — officiella SQLite kompilerad till WebAssembly.
Det ger vanliga SQLite-filer och vanlig SQL, men utan native-moduler. Det är
därför Windows-installeraren kan byggas direkt från en Mac, och därför kunden
aldrig behöver byggverktyg. Motorn körs enbart i huvudprocessen och skrivs till
disk atomiskt (temporärfil + `rename`) efter varje transaktion.

### Databasmigreringar

Schemat versionshanteras i `electron/db/migrations.ts` och körs automatiskt vid
start. Lägg alltid till en **ny** migrering sist i listan — ändra aldrig en som
redan är utrullad, då hoppas den över på datorer som redan kört den.

---

## Lägga till fler däcktyper

Komplettera listan i [`shared/constants.ts`](shared/constants.ts):

```ts
{ id: 'mitt-dacktyp', label: 'Min däcktyp', seasons: ['vinter'], studded: false },
```

Formulär och filter uppdateras automatiskt — ingen annan kod behöver ändras.

---

## Tester

```bash
npm test
```

107 tester täcker affärslogiken i huvudprocessen och hjälpfunktionerna i
gränssnittet — bland annat att lagersaldot aldrig kan bli negativt, att det inte
går att sälja fler däck än som finns, att en ångrad försäljning lägger tillbaka
däcken, att nyckeltalen räknas rätt, samt att backup och återställning skyddar
befintlig data.

Testerna kör mot en riktig SQLite-databas i en temporär katalog. Electron
ersätts av en stub (`tests/electronStub.ts`), så inget fönster behöver öppnas.

Testerna täcker bland annat att däckkategorin styr säsong och dubbning, att
äldre lager migreras korrekt till de nya kategorierna, och att en nyskapad
databas är tom.

Täckning: 84 % satser, 86 % rader, 88 % funktioner.

---

## Offlinetest

Efter installation: koppla bort datorn från internet och starta programmet.
Allt fungerar precis som vanligt — lägga till, redigera och sälja däck, sökning,
filter, rapporter, backup och återställning. Programmet gör inga nätverksanrop
över huvud taget.
