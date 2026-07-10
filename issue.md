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
SOLTION: 
 • Bypassing Foreign Key Wipeouts: The  admin_db_restore.py  view now
  explicitly breaks the restoration process into two parts: creating the tables
  ( --schema-only ) and then inserting the data ( --data-only ).
  • Disabled Triggers: During the data insertion phase, I added the  --disable-
  triggers  flag. This forces PostgreSQL to ignore foreign key constraints
  (like checking if your students exist in  auth.users ) while it populates
  your tables. This means your data will no longer get silently rejected and
  wiped out.
  • Transparent Errors: I adjusted the backend logic so that if any non-fatal
  warnings occur during the restoration, they are sent back as a  400 Bad
  Request  instead of a  200 OK . This guarantees the frontend will explicitly
  display the problem to you instead of blindly claiming success.


PROBLEM 4: Another alert error occur [Completed with warnings: pg_restore: error: could not read from input file: end of file].
SOLTION: 
•  backend/api/views/admin_db_backup.py : Updated the  pg_dump  execution to
  write directly to the temporary file using the  -f  flag, instead of piping
  its output through  stdout . This permanently fixes the binary corruption
  caused by the Windows newline translation bug.
  •  backend/api/views/admin_db_restore.py : Added explicit  .dump  extensions
  to the generated temporary files and added the  -Fc  flag to the  pg_restore
  commands to enforce the custom format reading.


PROBLEB 5: ANOTHER ERROR FROM RESTORATION: 
  Error during restoration: Fatal error: pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28605" is a system trigger Command was: ALTER TABLE public.auth_group DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28605" is a system trigger Command was: ALTER TABLE public.auth_group ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28602" is a system trigger Command was: ALTER TABLE public.auth_group_permissions DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28602" is a system trigger Command was: ALTER TABLE public.auth_group_permissions ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28600" is a system trigger Command was: ALTER TABLE public.auth_permission DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "auth_permission": ERROR: insert or update on table "auth_permission" violates foreign key constraint "auth_permission_content_type_id_2f476e4b_fk_django_co" DETAIL: Key (content_type_id)=(1) is not present in table "django_content_type". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28600" is a system trigger Command was: ALTER TABLE public.auth_permission ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28620" is a system trigger Command was: ALTER TABLE public.auth_user DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28620" is a system trigger Command was: ALTER TABLE public.auth_user ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28617" is a system trigger Command was: ALTER TABLE public.auth_user_groups DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28617" is a system trigger Command was: ALTER TABLE public.auth_user_groups ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28627" is a system trigger Command was: ALTER TABLE public.auth_user_user_permissions DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28627" is a system trigger Command was: ALTER TABLE public.auth_user_user_permissions ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28637" is a system trigger Command was: ALTER TABLE public.book_accesses DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "book_accesses": ERROR: insert or update on table "book_accesses" violates foreign key constraint "book_accesses_book_id_3011c651_fk_books_no" DETAIL: Key (book_id)=(74) is not present in table "books". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28637" is a system trigger Command was: ALTER TABLE public.book_accesses ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28647" is a system trigger Command was: ALTER TABLE public.book_requests DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28647" is a system trigger Command was: ALTER TABLE public.book_requests ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28635" is a system trigger Command was: ALTER TABLE public.books DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "books": ERROR: insert or update on table "books" violates foreign key constraint "books_bookshelf_id_9f4442d3_fk_bookshelves_bookshelf_id" DETAIL: Key (bookshelf_id)=(1) is not present in table "bookshelves". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28635" is a system trigger Command was: ALTER TABLE public.books ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28655" is a system trigger Command was: ALTER TABLE public.bookshelves DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28655" is a system trigger Command was: ALTER TABLE public.bookshelves ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28662" is a system trigger Command was: ALTER TABLE public.borrow_records DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28662" is a system trigger Command was: ALTER TABLE public.borrow_records ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28670" is a system trigger Command was: ALTER TABLE public.content DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "content": ERROR: insert or update on table "content" violates foreign key constraint "content_section_id_28a31429_fk_sections_section_id" DETAIL: Key (section_id)=(27) is not present in table "sections". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28670" is a system trigger Command was: ALTER TABLE public.content ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28672" is a system trigger Command was: ALTER TABLE public.content_files DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "content_files": ERROR: insert or update on table "content_files" violates foreign key constraint "content_files_content_id_5ed58434_fk_content_content_id" DETAIL: Key (content_id)=(32) is not present in table "content". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28672" is a system trigger Command was: ALTER TABLE public.content_files ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28682" is a system trigger Command was: ALTER TABLE public.course_recommended_books DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "course_recommended_books": ERROR: insert or update on table "course_recommended_books" violates foreign key constraint "course_recommended_b_course_id_48117e27_fk_courses_c" DETAIL: Key (course_id)=(43) is not present in table "courses". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28682" is a system trigger Command was: ALTER TABLE public.course_recommended_books ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28692" is a system trigger Command was: ALTER TABLE public.course_schedules DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "course_schedules": ERROR: insert or update on table "course_schedules" violates foreign key constraint "course_schedules_course_id_51b46c6c_fk_courses_course_id" DETAIL: Key (course_id)=(38) is not present in table "courses". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28692" is a system trigger Command was: ALTER TABLE public.course_schedules ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28700" is a system trigger Command was: ALTER TABLE public.course_school_years DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28700" is a system trigger Command was: ALTER TABLE public.course_school_years ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28680" is a system trigger Command was: ALTER TABLE public.courses DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "courses": ERROR: insert or update on table "courses" violates foreign key constraint "courses_instructor_id_f5e3e077_fk" DETAIL: Key (instructor_id)=(2026101) is not present in table "users". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28680" is a system trigger Command was: ALTER TABLE public.courses ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28707" is a system trigger Command was: ALTER TABLE public.django_admin_log DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28707" is a system trigger Command was: ALTER TABLE public.django_admin_log ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28610" is a system trigger Command was: ALTER TABLE public.django_content_type DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28610" is a system trigger Command was: ALTER TABLE public.django_content_type ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28717" is a system trigger Command was: ALTER TABLE public.enrollments DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "enrollments": ERROR: insert or update on table "enrollments" violates foreign key constraint "enrollments_course_id_8964c6c8_fk_courses_course_id" DETAIL: Key (course_id)=(41) is not present in table "courses". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28717" is a system trigger Command was: ALTER TABLE public.enrollments ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28727" is a system trigger Command was: ALTER TABLE public.file_downloads DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "file_downloads": ERROR: insert or update on table "file_downloads" violates foreign key constraint "file_downloads_content_id_edd74cf7_fk_content_content_id" DETAIL: Key (content_id)=(43) is not present in table "content". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28727" is a system trigger Command was: ALTER TABLE public.file_downloads ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28805" is a system trigger Command was: ALTER TABLE public.grades DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28805" is a system trigger Command was: ALTER TABLE public.grades ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28747" is a system trigger Command was: ALTER TABLE public.instructor_logs DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "instructor_logs": ERROR: insert or update on table "instructor_logs" violates foreign key constraint "instructor_logs_instructor_id_0e1b8014_fk_users_user_id" DETAIL: Key (instructor_id)=(2026102) is not present in table "users". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28747" is a system trigger Command was: ALTER TABLE public.instructor_logs ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28752" is a system trigger Command was: ALTER TABLE public.notifications DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "notifications": ERROR: insert or update on table "notifications" violates foreign key constraint "notifications_user_id_468e288d_fk" DETAIL: Key (user_id)=(2026091) is not present in table "users". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28752" is a system trigger Command was: ALTER TABLE public.notifications ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28757" is a system trigger Command was: ALTER TABLE public.password_reset DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "password_reset": ERROR: insert or update on table "password_reset" violates foreign key constraint "password_reset_user_id_d6a4e93d_fk" DETAIL: Key (user_id)=(2026063) is not present in table "users". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28757" is a system trigger Command was: ALTER TABLE public.password_reset ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28675" is a system trigger Command was: ALTER TABLE public.sections DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "sections": ERROR: insert or update on table "sections" violates foreign key constraint "sections_course_id_e9052f71_fk_courses_course_id" DETAIL: Key (course_id)=(39) is not present in table "courses". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28675" is a system trigger Command was: ALTER TABLE public.sections ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28767" is a system trigger Command was: ALTER TABLE public.student_balances DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "student_balances": ERROR: insert or update on table "student_balances" violates foreign key constraint "student_balances_student_id_5c05c2ee_fk_users_user_id" DETAIL: Key (student_id)=(2026104) is not present in table "users". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28767" is a system trigger Command was: ALTER TABLE public.student_balances ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28772" is a system trigger Command was: ALTER TABLE public.student_logs DISABLE TRIGGER ALL; pg_restore: error: COPY failed for table "student_logs": ERROR: insert or update on table "student_logs" violates foreign key constraint "student_logs_student_id_fd9957d9_fk_users_user_id" DETAIL: Key (student_id)=(2026096) is not present in table "users". pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28772" is a system trigger Command was: ALTER TABLE public.student_logs ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28777" is a system trigger Command was: ALTER TABLE public.student_transaction_allocations DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28777" is a system trigger Command was: ALTER TABLE public.student_transaction_allocations ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28775" is a system trigger Command was: ALTER TABLE public.student_transactions DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28775" is a system trigger Command was: ALTER TABLE public.student_transactions ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28807" is a system trigger Command was: ALTER TABLE public.submission_files DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_c_28807" is a system trigger Command was: ALTER TABLE public.submission_files ENABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28640" is a system trigger Command was: ALTER TABLE public.users DISABLE TRIGGER ALL; pg_restore: error: could not execute query: ERROR: permission denied: "RI_ConstraintTrigger_a_28640" is a system trigger Command was: ALTER TABLE public.users ENABLE TRIGGER ALL; pg_restore: warning: errors ignored on restore: 80
  
Solution approach:
  updated code ( backend/api/views/admin_db_restore.py ) to
  merge everything into a single  pg_restore  command, and I completely removed
  the  --disable-triggers  flag.

  By running it as one command,  pg_restore  will naturally:

  1. Create the tables first (Pre-data).
  2. Insert all the data without checking foreign keys yet (Data).
  3. Add the foreign keys and indexes at the very end (Post-data).

  This is the standard, native way PostgreSQL restores data and it will
  completely bypass the permission errors and the foreign key violations.