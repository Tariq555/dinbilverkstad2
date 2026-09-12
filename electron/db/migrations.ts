import type { SqliteDatabase } from './engine'

interface Migration {
  version: number
  name: string
  up: string
}

/**
 * Migreringar körs i versionsordning vid varje uppstart.
 * Lägg alltid till nya migreringar sist — ändra aldrig en redan utrullad.
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    up: `
      CREATE TABLE IF NOT EXISTS products (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        sku                 TEXT    NOT NULL UNIQUE,
        brand               TEXT    NOT NULL,
        model               TEXT    NOT NULL DEFAULT '',
        size                TEXT    NOT NULL DEFAULT '',
        width               INTEGER,
        profile             INTEGER,
        rim                 INTEGER,
        season              TEXT    NOT NULL DEFAULT 'sommar',
        tire_type           TEXT    NOT NULL DEFAULT 'sommardack',
        studded             INTEGER NOT NULL DEFAULT 0,
        condition           TEXT    NOT NULL DEFAULT 'ny',
        quantity            INTEGER NOT NULL DEFAULT 0,
        purchase_price      REAL    NOT NULL DEFAULT 0,
        selling_price       REAL    NOT NULL DEFAULT 0,
        location            TEXT    NOT NULL DEFAULT '',
        notes               TEXT    NOT NULL DEFAULT '',
        low_stock_threshold INTEGER NOT NULL DEFAULT 4,
        created_at          TEXT    NOT NULL,
        updated_at          TEXT    NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_brand   ON products(brand);
      CREATE INDEX IF NOT EXISTS idx_products_size    ON products(size);
      CREATE INDEX IF NOT EXISTS idx_products_season  ON products(season);

      CREATE TABLE IF NOT EXISTS sales (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id          INTEGER REFERENCES products(id) ON DELETE SET NULL,
        sku                 TEXT    NOT NULL DEFAULT '',
        brand               TEXT    NOT NULL DEFAULT '',
        model               TEXT    NOT NULL DEFAULT '',
        size                TEXT    NOT NULL DEFAULT '',
        season              TEXT    NOT NULL DEFAULT 'sommar',
        quantity            INTEGER NOT NULL,
        unit_price          REAL    NOT NULL,
        unit_purchase_price REAL    NOT NULL DEFAULT 0,
        total               REAL    NOT NULL,
        profit              REAL    NOT NULL DEFAULT 0,
        sold_at             TEXT    NOT NULL,
        note                TEXT    NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'forenklade-dacktyper',
    up: `
      -- Förenklar däcktyperna till de fem kategorier en vanlig bilverkstad
      -- behöver. Äldre lager mappas om så att ingenting tappas bort.
      UPDATE products SET tire_type = 'friktionsdack'
        WHERE tire_type IN ('friktion', 'nordisk-friktion', 'europeisk-friktion');

      UPDATE products SET tire_type = 'ms-dack'
        WHERE tire_type = 'helarsdack';

      -- Fordonsspecifika typer (lastbil, transport, SUV, MC) blir vanliga
      -- personbilskategorier utifrån den säsong de redan har.
      UPDATE products SET tire_type = 'sommardack'
        WHERE tire_type IN ('lastbil', 'transportdack', 'suv', 'mc') AND season = 'sommar';

      UPDATE products SET tire_type = 'dubbdack'
        WHERE tire_type IN ('lastbil', 'transportdack', 'suv', 'mc')
          AND season = 'vinter' AND studded = 1;

      UPDATE products SET tire_type = 'friktionsdack'
        WHERE tire_type IN ('lastbil', 'transportdack', 'suv', 'mc')
          AND season = 'vinter' AND studded = 0;

      UPDATE products SET tire_type = 'ms-dack'
        WHERE tire_type IN ('lastbil', 'transportdack', 'suv', 'mc') AND season = 'helar';

      -- Okända kvarvarande typer landar på säsongens standardkategori.
      UPDATE products SET tire_type = CASE
          WHEN season = 'sommar' THEN 'sommardack'
          WHEN season = 'helar'  THEN 'ms-dack'
          WHEN studded = 1       THEN 'dubbdack'
          ELSE 'vinterdack'
        END
        WHERE tire_type NOT IN ('sommardack', 'vinterdack', 'dubbdack', 'friktionsdack', 'ms-dack');

      -- Säsong och dubbning ska alltid stämma med kategorin.
      UPDATE products SET season = 'sommar', studded = 0 WHERE tire_type = 'sommardack';
      UPDATE products SET season = 'vinter', studded = 0 WHERE tire_type IN ('vinterdack', 'friktionsdack');
      UPDATE products SET season = 'vinter', studded = 1 WHERE tire_type = 'dubbdack';
      UPDATE products SET season = 'helar',  studded = 0 WHERE tire_type = 'ms-dack';
    `,
  },
]

export function runMigrations(db: SqliteDatabase): number {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)

  const applied = new Set(
    db.all<{ version: number }>('SELECT version FROM schema_migrations').map((row) => row.version)
  )

  const pending = MIGRATIONS.filter((migration) => !applied.has(migration.version))
  if (pending.length === 0) return 0

  for (const migration of pending) {
    db.exec(migration.up)
    db.run('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
      migration.version,
      migration.name,
      new Date().toISOString(),
    ])
  }
  db.persist()
  return pending.length
}

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version
