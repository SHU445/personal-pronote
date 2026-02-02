"""
Accès Neon (PostgreSQL) pour credentials et cache Pronote.
Remplace credentials.json et data.json.
"""

import os
import json
from datetime import datetime
from typing import Optional

# Connexion lazy pour éviter d'importer psycopg2 si DATABASE_URL absent
_conn = None


def _get_conn():
    global _conn
    if _conn is not None:
        return _conn
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL non défini")
    try:
        import psycopg2
        _conn = psycopg2.connect(url)
        _conn.autocommit = True
        return _conn
    except ImportError:
        raise RuntimeError("psycopg2 requis: pip install psycopg2-binary")


def get_credentials() -> Optional[dict]:
    """Retourne les credentials Pronote ou None si aucun."""
    try:
        conn = _get_conn()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT url, username, password, uuid FROM pronote_credentials WHERE id = 1"
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "url": row[0] or "",
                "username": row[1] or "",
                "password": row[2] or "",
                "uuid": row[3] or "",
            }
    except Exception:
        raise


def set_credentials(url: str, username: str, password: str, uuid: str) -> None:
    """Enregistre ou met à jour les credentials (upsert)."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pronote_credentials (id, url, username, password, uuid, updated_at)
            VALUES (1, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                url = EXCLUDED.url,
                username = EXCLUDED.username,
                password = EXCLUDED.password,
                uuid = EXCLUDED.uuid,
                updated_at = EXCLUDED.updated_at
            """,
            (url, username, password, uuid, datetime.utcnow()),
        )


def delete_credentials() -> None:
    """Supprime les credentials (déconnexion)."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM pronote_credentials WHERE id = 1")


def get_cache() -> Optional[dict]:
    """Retourne le cache Pronote (data) ou None si vide."""
    try:
        conn = _get_conn()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT data, export_date FROM pronote_cache WHERE id = 1"
            )
            row = cur.fetchone()
            if not row or not row[0]:
                return None
            data = row[0]
            if isinstance(data, dict):
                return data
            return json.loads(data) if isinstance(data, str) else data
    except Exception:
        raise


def set_cache(data: dict) -> None:
    """Enregistre le cache (upsert). export_date peut être dans data."""
    conn = _get_conn()
    export_date = data.get("export_date")
    if isinstance(export_date, str):
        try:
            export_date = datetime.fromisoformat(export_date.replace("Z", "+00:00"))
        except Exception:
            export_date = datetime.utcnow()
    elif export_date is None:
        export_date = datetime.utcnow()
    now = datetime.utcnow()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pronote_cache (id, data, export_date, updated_at)
            VALUES (1, %s::jsonb, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                data = EXCLUDED.data,
                export_date = EXCLUDED.export_date,
                updated_at = EXCLUDED.updated_at
            """,
            (json.dumps(data, ensure_ascii=False), export_date, now),
        )


def use_database() -> bool:
    """True si DATABASE_URL est défini (on utilise Neon)."""
    return bool(os.environ.get("DATABASE_URL"))
