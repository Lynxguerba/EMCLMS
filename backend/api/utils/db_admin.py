import os
import re
from urllib.parse import urlparse, urlunparse

from django.conf import settings

PG_RESTORE_FATAL_PATTERNS = re.compile(
    r"does not exist|fatal:|could not connect|permission denied",
    re.IGNORECASE,
)


def get_database_url() -> str | None:
    """Return DATABASE_URL from the environment or Django settings."""
    db_url = os.environ.get("DATABASE_URL", "").strip()
    if db_url:
        return db_url

    db_config = settings.DATABASES.get("default")
    if not db_config:
        return None

    user = db_config.get("USER")
    password = db_config.get("PASSWORD")
    host = db_config.get("HOST")
    port = db_config.get("PORT")
    name = db_config.get("NAME")
    if all([user, password, host, name]):
        return f"postgresql://{user}:{password}@{host}:{port or 5432}/{name}"
    return None


def normalize_supabase_direct_url(db_url: str) -> str:
    """
    Normalize a Supabase DATABASE_URL to a direct connection using the real
    postgres role. Pooler usernames like postgres.<project_ref> are auth
    aliases and must not be used for pg_dump/pg_restore or DDL.
    """
    from urllib.parse import urlparse, urlunparse, unquote, quote

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    parsed = urlparse(db_url)
    username = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    host = parsed.hostname or ""
    port = parsed.port or 5432
    dbname = parsed.path.lstrip("/") or "postgres"
    project_ref = None

    if username and "." in username:
        user_part, ref = username.split(".", 1)
        if user_part == "postgres":
            project_ref = ref
            username = "postgres"

    if "pooler.supabase.com" in host:
        if project_ref:
            host = f"db.{project_ref}.supabase.co"
            port = 5432
    elif host.startswith("db.") and host.endswith(".supabase.co"):
        if not project_ref:
            project_ref = host[len("db.") : -len(".supabase.co")]
        username = "postgres"

    safe_user = quote(username)
    safe_pass = quote(password)

    if safe_pass:
        netloc = f"{safe_user}:{safe_pass}@{host}:{port}"
    elif safe_user:
        netloc = f"{safe_user}@{host}:{port}"
    else:
        netloc = f"{host}:{port}"

    return urlunparse(("postgresql", netloc, f"/{dbname}", "", "", ""))


def prepare_public_schema_for_restore(db_url: str) -> None:
    """Drop and recreate public schema using a direct postgres connection."""
    import psycopg2

    connect_kwargs = {"dsn": db_url}
    if "supabase" in db_url:
        connect_kwargs["sslmode"] = "require"

    conn = psycopg2.connect(**connect_kwargs)
    try:
        conn.autocommit = True
        with conn.cursor() as cursor:
            # IMPORTANT: When connecting via a Supabase pooler, CURRENT_USER is spoofed to the project ref.
            # This causes event triggers (like pg_graphql's) to fail during DROP SCHEMA.
            # We must explicitly SET ROLE to the real postgres role before executing DDL.
            cursor.execute("SET ROLE postgres;")
            cursor.execute("DROP SCHEMA IF EXISTS public CASCADE;")
            cursor.execute("CREATE SCHEMA public AUTHORIZATION postgres;")
            cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
            cursor.execute("GRANT ALL ON SCHEMA public TO public;")
    finally:
        conn.close()


def is_pg_restore_failure(returncode: int, stderr: str) -> bool:
    """
    pg_restore exit code 1 usually means warnings only; codes >1 are errors.
    Some exit code 1 output still indicates a fatal restore failure.
    """
    if returncode == 0:
        return False
    if returncode > 1:
        return True
    return bool(stderr and PG_RESTORE_FATAL_PATTERNS.search(stderr))
