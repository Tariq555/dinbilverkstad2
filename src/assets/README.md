# Assets

## Logotyp

`logo.svg` är standardlogotypen som visas i sidomenyn och i webbläsarfliken.

Det finns två sätt att byta logotyp:

1. **Via appen (rekommenderas):** gå till **Inställningar → Butik → Logotyp** och
   välj en bildfil. Bilden sparas i den lokala databasen och följer med i backuper.
   Ingen kod behöver ändras och ingen ombyggnad krävs.

2. **Byt standardlogotypen:** ersätt `logo.svg` med din egen fil. Behåll filnamnet
   `logo.svg` så behöver ingen kod ändras. Kör därefter `npm run dev` eller
   `npm run dist` igen.

Rekommenderat format: kvadratisk SVG eller PNG, minst 128 × 128 px.

## Programikon (Windows)

Ikonen för `.exe`-filen och genvägarna ligger i `build/icon.ico` i projektets rot.
Den kan genereras om med `node scripts/generate-icon.mjs` eller ersättas med en
egen `.ico`-fil (minst 256 × 256 px).
