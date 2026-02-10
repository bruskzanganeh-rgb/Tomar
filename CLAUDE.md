# Babalisk Manager - Claude Instructions

## Database Connection

**VIKTIGT**: Kör alltid SQL-migrationer direkt med psql. Säg ALDRIG att du inte kan köra SQL.

### Credentials
Alla credentials finns i `.env.local` (gitignored). Använd följande miljövariabler:
- `SUPABASE_DB_HOST` — Session Pooler host (IPv4-kompatibel)
- `SUPABASE_DB_USER` — Databasanvändare
- `SUPABASE_DB_PASSWORD` — Databaslösenord

**OBS**: Direktanslutning via `db.*.supabase.co` kräver IPv6. Använd alltid Session Pooler-hosten.

### Köra SQL-migrationer
```bash
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "postgresql://$SUPABASE_DB_USER@$SUPABASE_DB_HOST:5432/postgres" -f /path/to/migration.sql
```

### Köra enskilda SQL-kommandon
```bash
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "postgresql://$SUPABASE_DB_USER@$SUPABASE_DB_HOST:5432/postgres" -c "SELECT * FROM table_name;"
```

### Verifiera tabellstruktur
```bash
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "postgresql://$SUPABASE_DB_USER@$SUPABASE_DB_HOST:5432/postgres" -c "\d table_name"
```

## Supabase

- **Project URL**: finns i `.env.local` som `NEXT_PUBLIC_SUPABASE_URL`
- **Anon Key**: finns i `.env.local` som `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key**: finns i `.env.local` som `SUPABASE_SERVICE_ROLE_KEY`

## Projekt

Babalisk Manager är en app för att hantera gigs/uppdrag för frilansmusiker.

### Viktiga tabeller
- `gigs` - uppdrag med datum, arvode, status
- `gig_dates` - flera datum per gig
- `clients` - uppdragsgivare
- `gig_types` - typer av uppdrag (konsert, rep, etc.)
- `positions` - roller (1:a konsertmästare, tutti, etc.)
- `invoices` - fakturor
- `expenses` - utgifter

### Migrationer
Alla migrationer finns i `supabase/migrations/` och ska köras med psql-kommandot ovan.
