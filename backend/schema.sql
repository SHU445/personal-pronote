-- Schéma Neon pour Personal Pronote
-- À exécuter une fois dans le SQL Editor du dashboard Neon (https://console.neon.tech)

-- Credentials Pronote (une seule ligne pour l'application mono-utilisateur)
CREATE TABLE IF NOT EXISTS pronote_credentials (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  url TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  uuid TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cache des données Pronote : une ligne par semestre (id 1 = Semestre 1, id 2 = Semestre 2)
CREATE TABLE IF NOT EXISTS pronote_cache (
  id INTEGER PRIMARY KEY CHECK (id IN (1, 2)),
  data JSONB NOT NULL DEFAULT '{}',
  export_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aucune ligne initiale : les credentials sont créés à la première connexion QR,
-- le cache à la première récupération des données.
