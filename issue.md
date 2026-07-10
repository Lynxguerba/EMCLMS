DATABASE ADMINSTRATION: System Restoration feature error (
    i have issue now in hosted process of this project. THe issue is on the System Restoration feature on the Database Administration Page where I try to upload the file
      @backup_2026-07-08.dump the alert error pop message "Error during restoration: role "postgres.zvuhyegwvrqqmwbdajon" does not exist" @backend/api/views/admin_db_restore.py . This is
      the cases, we deploy this project once in the old supabase "postgres.vtoqhjtknypvxxxfnvkq" then we backup a file feature @backend/api/views/admin_db_backup.py thats why it generate
      the file @backup_2026-07-08.dump , then I used that file to the new supabase hosted db management "postgres.zvuhyegwvrqqmwbdajon" the problem it is the error alert pop of
      restoration, the old system the backup file is working but on the new system the backup file is error. what best approach to fix this error?
)

1st plan

Fix Supabase Cross-Instance Database Restore                                                                                                                                             │
 │                                                                                                                                                                                          │
 │ Root Cause                                                                                                                                                                               │
 │                                                                                                                                                                                          │
 │ The error role "postgres.zvuhyegwvrqqmwbdajon" does not exist is a Supabase connection-username mismatch, not a problem with your backup file from the old project                       │
 │ (postgres.vtoqhjtknypvxxxfnvkq).                                                                                                                                                         │
 │ On Supabase, the pooler login format postgres.<PROJECT_REF> is an authentication alias. The only real database role is postgres. That alias does not exist in pg_roles.                  │
 │ Your restore flow in backend/api/views/admin_db_restore.py (backend/api/views/admin_db_restore.py) has a split-brain connection setup:                                                   │
 │                                                                                                                                                                                          │
 │ sequenceDiagram                                                                                                                                                                          │
 │     participant UI as Admin UI                                                                                                                                                           │
 │     participant Restore as admin_db_restore                                                                                                                                              │
 │     participant Django as Django connection pooler                                                                                                                                       │
 │     participant PG as Supabase Postgres                                                                                                                                                  │
 │     UI->>Restore: Upload backup_2026-07-08.dump                                                                                                                                          │
 │     Restore->>Django: DROP/CREATE SCHEMA via connection.cursor()                                                                                                                         │
 │     Note over Django: Uses DATABASE_URL pooler user postgres.zvuhyegwvrqqmwbdajon                                                                                                        │
 │     Django->>PG: CREATE SCHEMA public                                                                                                                                                    │
 │     PG-->>Restore: ERROR role postgres.zvuhyegwvrqqmwbdajon does not exist                                                                                                               │
 │     Note over Restore: pg_restore never runs (exception at line 151)                                                                                                                     │
 │ ctrl+o to render diagram                                                                                                                                                                 │
 │                                                                                                                                                                                          │
 │ Why it worked on the old system: the old deployment likely used a compatible DATABASE_URL (direct connection, or pooler behavior that did not surface this during CREATE SCHEMA).        │
 │ Why the backup file is fine: backend/api/views/admin_db_backup.py (backend/api/views/admin_db_backup.py) already dumps with --no-owner and --no-privileges, so cross-project restores    │
 │ should not depend on old role names. The failure happens before pg_restore runs.                                                                                                         │
 │ The code already knows about this class of issue (see comment at lines 98–100) and converts pooler URLs for pg_restore only—but Step 1 still uses Django's pooler connection and         │
 │ CREATE SCHEMA public without an explicit owner:                                                                                                                                          │
 │                                                                                                                                                                                          │
 │  backend/api/views/admin_db_restore.py lines 93-97                                                                                                                                       │
 │                                                                                                                                                                                          │
 │         with connection.cursor() as cursor:                                                                                                                                              │
 │             cursor.execute("DROP SCHEMA IF EXISTS public CASCADE;")                                                                                                                      │
 │             cursor.execute("CREATE SCHEMA public;")                                                                                                                                      │
 │             cursor.execute(f'GRANT ALL ON SCHEMA public TO "{base_user}";')                                                                                                              │
 │             cursor.execute("GRANT ALL ON SCHEMA public TO public;")                                                                                                                      │
 │                                                                                                                                                                                          │
 │ CREATE SCHEMA public defaults to AUTHORIZATION CURRENT_USER. Via the pooler, CURRENT_USER can be the pseudo-role postgres.zvuhyegwvrqqmwbdajon, which triggers the error.                │
 │ ────────────────────────────────────────                                                                                                                                                 │
 │                                                                                                                                                                                          │
 │ Immediate Workaround (restore your data now)                                                                                                                                             │
 │                                                                                                                                                                                          │
 │ Use the manual restore documented in DEPLOYMENT.md (DEPLOYMENT.md) with the new project's direct connection (username must be postgres, not postgres.zvuhyegwvrqqmwbdajon):              │
 │                                                                                                                                                                                          │
 │ pg_restore --no-owner --no-privileges --clean --if-exists --schema=public \                                                                                                              │
 │   -h db.zvuhyegwvrqqmwbdajon.supabase.co \                                                                                                                                               │
 │   -U postgres -d postgres -p 5432 \                                                                                                                                                      │
 │   backup_2026-07-08.dump                                                                                                                                                                 │
 │                                                                                                                                                                                          │
 │ If prompted, use your new Supabase database password. This bypasses the broken in-app schema-prep step.                                                                                  │
 │ ────────────────────────────────────────                                                                                                                                                 │
 │                                                                                                                                                                                          │
 │ Recommended Code Fix                                                                                                                                                                     │
 │                                                                                                                                                                                          │
 │ 1. Add a shared Supabase DB URL helper                                                                                                                                                   │
 │                                                                                                                                                                                          │
 │ Create a small utility (e.g. backend/api/utils/db_admin.py (backend/api/utils/db_admin.py)) used by both backup and restore:                                                             │
 │ • Parse DATABASE_URL                                                                                                                                                                     │
 │ • If username is postgres.<project_ref>, strip to postgres and extract project_ref                                                                                                       │
 │ • If host is *.pooler.supabase.com, rewrite to db.<project_ref>.supabase.co:5432                                                                                                         │
 │ • If host is already db.*.supabase.co but username still has ., normalize username to postgres                                                                                           │
 │ • Return a direct postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres URL                                                                                                │
 │                                                                                                                                                                                          │
 │ This covers all Supabase URL variants (pooler session, pooler transaction, direct-with-pooler-username).                                                                                 │
 │                                                                                                                                                                                          │
 │ 2. Use direct connection for schema prep (not Django pooler)                                                                                                                             │
 │                                                                                                                                                                                          │
 │ In admin_db_restore.py (backend/api/views/admin_db_restore.py), replace connection.cursor() with a short-lived psycopg2 connection using the normalized direct URL (psycopg2 is          │
 │ already available via Django's Postgres backend).                                                                                                                                        │
 │ Run schema prep with explicit role-safe SQL:                                                                                                                                             │
 │                                                                                                                                                                                          │
 │ DROP SCHEMA IF EXISTS public CASCADE;                                                                                                                                                    │
 │ CREATE SCHEMA public AUTHORIZATION postgres;                                                                                                                                             │
 │ GRANT ALL ON SCHEMA public TO postgres;                                                                                                                                                  │
 │ GRANT ALL ON SCHEMA public TO public;                                                                                                                                                    │
 │                                                                                                                                                                                          │
 │ Using AUTHORIZATION postgres is the key fix—it avoids relying on pooler-reported CURRENT_USER.                                                                                           │
 │                                                                                                                                                                                          │
 │ 3. Harden pg_restore invocation                                                                                                                                                          │
 │                                                                                                                                                                                          │
 │ After normalizing db_url, add:                                                                                                                                                           │
 │ • --role=postgres — forces restore operations to run as the real role                                                                                                                    │
 │ • Keep existing flags: --clean, --if-exists, --no-owner, --no-privileges, --schema=public                                                                                                │
 │                                                                                                                                                                                          │
 │ Tighten exit-code handling: treat return code 0 as success; treat 1 as warnings-only if stderr contains only benign messages; treat >1 or role/connection errors as failure.             │
 │                                                                                                                                                                                          │
 │ 4. Align backup with restore (prevent future surprises)                                                                                                                                  │
 │                                                                                                                                                                                          │
 │ In admin_db_backup.py (backend/api/views/admin_db_backup.py), run pg_dump against the same normalized direct URL so dumps are consistently produced from the real postgres role          │
 │ context.                                                                                                                                                                                 │
 │                                                                                                                                                                                          │
 │ 5. Update deployment docs (small addition)                                                                                                                                               │
 │                                                                                                                                                                                          │
 │ Add a note to DEPLOYMENT.md (DEPLOYMENT.md) and documentation/contribution/supabase_migrate_seed.md (documentation/contribution/supabase_migrate_seed.md):                               │
 │ • In-app restore requires direct postgres user semantics                                                                                                                                 │
 │ • Pooler URLs are fine for normal app traffic (DATABASE_URL on Render), but DB admin operations normalize internally                                                                     │
 │ • Cross-Supabase-project restores are supported when backup uses --no-owner --no-privileges                                                                                              │
 │ ────────────────────────────────────────                                                                                                                                                 │
 │                                                                                                                                                                                          │
 │ What We Are NOT Changing                                                                                                                                                                 │
 │                                                                                                                                                                                          │
 │ • No changes to normal app DATABASE_URL / pooler usage in backend/core/settings.py (backend/core/settings.py) — pooler remains correct for API traffic                                   │
 │ • No need to edit or regenerate backup_2026-07-08.dump — the existing file should restore once connection handling is fixed                                                              │
 │ • No frontend changes needed in frontend/src/pages/AdminDatabaseManagement.tsx (frontend/src/pages/AdminDatabaseManagement.tsx)                                                          │
 │ ────────────────────────────────────────                                                                                                                                                 │
 │                                                                                                                                                                                          │
 │ Verification Plan                                                                                                                                                                        │
 │                                                                                                                                                                                          │
 │ 1. Deploy the backend fix to the new hosted environment (Render)                                                                                                                         │
 │ 2. Upload backup_2026-07-08.dump via Database Administration → System Restoration                                                                                                        │
 │ 3. Confirm restore completes without the role error                                                                                                                                      │
 │ 4. Smoke-test: login, verify migrated records exist, run a quick read on a known table                                                                                                   │
 │ 5. Optional regression: run in-app backup on new system, then restore that new dump to confirm round-trip works


=========================================================================
2nd plan:

 ## Goal Description
The goal is to resolve the system restoration error `role "postgres.<project_ref>" does not exist` when restoring a database backup in production on a Supabase hosted environment.

The root cause is that the `normalize_supabase_direct_url` function fails to strip the project reference alias from the connection string username when the username is URL-encoded (e.g., `postgres%2E<project_ref>`). This results in `psycopg2` or `pg_restore` attempting to connect directly to the PostgreSQL backend using the pooler alias role, which does not exist in the backend database. 

By fixing the URL normalization logic to properly decode and re-encode the username and password using `urllib.parse.unquote` and `quote`, we can ensure the pooler alias is consistently stripped across all environments.

## User Review Required
No breaking changes or significant design decisions. The change purely hardens the existing Supabase connection string parser against URL-encoded inputs.

## Open Questions
None.

## Proposed Changes

### backend/api/utils/db_admin.py
Update `normalize_supabase_direct_url` to use `urllib.parse.unquote` and `quote` for robust username parsing and formatting.

#### [MODIFY] db_admin.py
```python
def normalize_supabase_direct_url(db_url: str) -> str:
    \"\"\"
    Normalize a Supabase DATABASE_URL to a direct connection using the real
    postgres role. Pooler usernames like postgres.<project_ref> are auth
    aliases and must not be used for pg_dump/pg_restore or DDL.
    \"\"\"
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
```

## Verification Plan
### Automated Tests
Run the script to verify that a URL-encoded Supabase connection string is correctly normalized to a direct connection string with the `postgres` user.

### Manual Verification
1. Verify that the changes successfully handle encoded characters (like `@` in passwords or `%2E` in usernames).
2. The user will be able to verify this fix in production by attempting a database restoration, which should now successfully bypass the Supabase pooler alias bug.

===============================================================
PLAN AND FIXING 3

## Goal Description
The system restoration feature still fails in production with the error `role "postgres.<project_ref>" does not exist`. 
Our previous URL normalization fixes didn't fully resolve this because when `psycopg2` connects to Supabase via a pooler URL (either because direct connections are blocked by IPv6 restrictions, or a Session Pooler URL is used), Supavisor "spoofs" the `CURRENT_USER` to the pooler alias (e.g. `postgres.zvuhyegwvrqqmwbdajon`). 

While we explicitly added `AUTHORIZATION postgres` to the `CREATE SCHEMA` command, the preceding `DROP SCHEMA IF EXISTS public CASCADE;` command runs under the context of `CURRENT_USER`. When the schema is dropped, Supabase's internal event triggers (like `pg_graphql` schema synchronizers) fire. These event triggers attempt to execute SQL using the spoofed `CURRENT_USER`. Since the spoofed role doesn't actually exist in the database catalog (`pg_authid`), the event trigger aborts the transaction with the `role does not exist` error.

The solution is to execute `SET ROLE postgres;` at the very beginning of the `psycopg2` schema preparation block. This resets the `CURRENT_USER` to the real `postgres` role, allowing all subsequent DDL statements and event triggers to succeed smoothly. (Note: `pg_restore` is already protected from this because we pass it the `--role=postgres` flag).

## User Review Required
None.

## Open Questions
None.

## Proposed Changes

### backend/api/utils/db_admin.py
Update `prepare_public_schema_for_restore` to explicitly execute `SET ROLE postgres;` before running any DDL commands.

#### [MODIFY] db_admin.py
```python
def prepare_public_schema_for_restore(db_url: str) -> None:
    \"\"\"Drop and recreate public schema using a direct postgres connection.\"\"\"
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
```

## Verification Plan
### Automated Tests
Code builds and runs correctly.

### Manual Verification
1. Attempt a database restoration on the production system.
2. The schema preparation should now successfully drop the `public` schema without throwing the event trigger role error.
3. The restore process should complete successfully.



PROOBLEM 2: Error during restoration: connection to server at "db.zvuhyegwvrqqmwbdajon.supabase.co" (2406:da14:1d4f:7400:7ede:6ced:1438:ecc), port 5432 failed: Network is unreachable Is the server running on that host and accepting TCP/IP connections?
PROOBLEM 3: Now there is another issue, In the System, the System Restoring are accepted the file but when I look at the supabase all the data are wiped out.