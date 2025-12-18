# Babalisk Manager - Claude Instructions

## Database Connection

**VIKTIGT**: Kör alltid SQL-migrationer direkt med psql. Säg ALDRIG att du inte kan köra SQL.

### Credentials
- **Host**: db.yemzxdqaextfsqnrtxyw.supabase.co
- **Database**: postgres
- **User**: postgres
- **Password**: gar1icst1

### Köra SQL-migrationer
```bash
PGPASSWORD='gar1icst1' psql -h db.yemzxdqaextfsqnrtxyw.supabase.co -U postgres -d postgres -f /path/to/migration.sql
```

### Köra enskilda SQL-kommandon
```bash
PGPASSWORD='gar1icst1' psql -h db.yemzxdqaextfsqnrtxyw.supabase.co -U postgres -d postgres -c "SELECT * FROM table_name;"
```

### Verifiera tabellstruktur
```bash
PGPASSWORD='gar1icst1' psql -h db.yemzxdqaextfsqnrtxyw.supabase.co -U postgres -d postgres -c "\d table_name"
```

## Supabase

- **Project URL**: https://yemzxdqaextfsqnrtxyw.supabase.co
- **Anon Key**: finns i .env.local
- **Service Role Key**: finns i .env.local

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
