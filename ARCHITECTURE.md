# Amida — Arkitektur & Funktionsbeskrivning

**Domän:** amida.babalisk.com
**Stack:** Next.js 15 (App Router), Supabase (Postgres + Auth + Storage), TypeScript, Tailwind CSS, next-intl

---

## Syfte

Amida hanterar gigs, fakturor och ekonomi för frilansmusiker. En musiker (eller ett team som delar ett AB) kan hantera hela flödet: boka gig, skapa faktura, skanna kvitton, följa ekonomi, synka kalender.

---

## Team / Delat konto

Grundidén: flera musiker delar ett AB (aktiebolag). De delar företagsinfo, klienter, fakturanummerserie, utgifter — men varje musiker skapar sina egna gigs.

### Datamodell

```
auth.users (bruske@, bruska@, ...)
    |
    +-- company_settings (1:1 per användare, PERSONLIGT)
    |     locale, calendar_token, calendar_show_all_members, onboarding_completed
    |
    +-- company_members (koppling user <-> company)
            role: 'owner' | 'member'
               |
               +-- companies (1 st per team, DELAT)
                     company_name, org_number, address, bank, logo
                     next_invoice_number (gemensam räknare)
                     gig_visibility: 'personal' | 'shared'
                          |
                          +-- clients        (DELAT)
                          +-- gig_types      (DELAT)
                          +-- positions       (DELAT)
                          +-- invoices       (DELAT, gemensam nummerserie)
                          +-- expenses       (DELAT)
                          +-- gigs           (user_id = skapare, company_id = företag)
```

### Vad som delas (company-scope)

- Företagsinfo (namn, orgnr, adress, bankuppgifter, logo)
- Klienter/uppdragsgivare
- Fakturor + fakturanummerserie (atomisk `get_next_invoice_number()`)
- Utgifter
- Gig-typer och positioner

### Vad som är personligt (user-scope)

- Gigs har `user_id` — i `personal` mode ser man bara sina egna
- Kalender-token (varje användare har en egen iCal-URL)
- Språk/locale
- `calendar_show_all_members` (personlig pref)

### Gig visibility

Styrs av `companies.gig_visibility`, togglas av owner i Settings > Team:

- **personal** (default): varje medlem ser bara sina egna gigs (RLS-enforced)
- **shared**: alla ser alla gigs, med filter-dropdown per medlem

### Roller

- **Owner**: kan bjuda in/ta bort medlemmar, ändra företagsinfo, toggla visibility, hantera prenumeration
- **Member**: kan använda appen (skapa gigs, fakturor, etc.) men inte ändra team-inställningar

### RLS-princip

Alla tabeller med `company_id` scopas via `get_user_company_id()` (SECURITY DEFINER-funktion som hämtar company_id från company_members). Gigs har extra visibility-check. `company_settings` scopas enbart med `user_id = auth.uid()`.

### Invite-flöde

1. Owner skapar invite i Settings > Team
2. Invite-länk genereras med token
3. Ny användare skapas via Supabase invite-email (token_hash + verifyOtp server-side)
4. Middleware redirectar till `/setup-member` (2 steg: lösenord + namn/telefon)
5. `POST /api/auth/setup-member` markerar `onboarding_completed = true`

---

## Gig-hantering

### Statusflöde

```
tentative --> accepted --> completed --> invoiced --> paid
    |            |
    v            v
 declined     declined
```

- **tentative**: förfrågad men inte beslutad
- **pending**: musikern tänker tacka ja, väntar på bekräftelse
- **accepted**: bekräftad
- **declined**: avböjd
- **completed**: genomfört, redo att fakturera
- **invoiced**: faktura skapad/skickad
- **paid**: betald
- **draft**: temporär status under skapande (raderas vid avbryt)

### Flerdag-gigs

`gig_dates`-tabell: en rad per datum. Varje datum kan ha `schedule_text` (fritext) och `sessions` (JSONB: `[{start, end, label}]`). AI kan parsa schedule_text till sessions.

### Draft-mönstret

Vid "Nytt gig" skapas en draft-rad direkt (`POST /api/gigs/draft`) så att bilagor/kvitton kan laddas upp innan formuläret sparas. Vid avbryt raderas draften.

### Dubblering

"Duplicera gig"-knapp i tabellrad och mobilkort — kopierar all data, öppnar dialog förfylld.

### Multi-valuta

Gigs sparar arvode i originalvaluta (`fee`, `currency`) plus konverterat till basvaluta (`fee_base`, `exchange_rate`). Stödda valutor: SEK, NOK, DKK, EUR, USD, GBP, CHF, CZK, PLN.

---

## Fakturasystem

### Skapande

- Triggas från "Skapa faktura" eller "needs invoicing"-kortet
- Förfyller: gig-typ som radbeskrivning, arvode som enhetspris, resekostnad som separat rad
- Manuell radeditor (lägg till/ta bort/ordna)
- Omvänd moms (reverse charge) för EU-handel
- Kund-moms-nummer vid reverse charge

### Numrering

Gemensam per företag. `companies.next_invoice_number` räknas upp atomiskt via `get_next_invoice_number(company_id)`.

### PDF-generering

`@react-pdf/renderer` server-side. Innehåller: företagsinfo, logo, kundinfo, fakturanr, datum, rader, moms, totalt, bankuppgifter, dröjsmålsränta. Lokaliserad (sv/en baserat på kundens `invoice_language`). Sponsormärke på free-plan.

### E-postutskick

- **Platform (Resend)**: Resend API-nyckel från `platform_config`
- **Custom SMTP**: Företagets egna SMTP-uppgifter (nodemailer)
- PDF genereras vid varje utskick
- Sparas till Supabase Storage (`pdf_url`)
- Status ändras från `draft` → `sent`

### Påminnelser

Loggas i `invoice_reminders` med automatiskt ökande `reminder_number`.

### Import

AI-klassificering av uppladdade PDF/bilder → extraherar fakturafält → fuzzy-matchning mot befintliga kunder → batch-import.

---

## Utgifter

- Kategorier: Resa, Mat, Hotell, Instrument, Noter, Utrustning, Kontorsmaterial, Telefon, Prenumeration, Övrigt
- AI kvitto-scanning via Claude Vision (`/api/expenses/scan`)
- Dubblettdetektering (datum + belopp)
- CSV-export
- Kan kopplas till gig

---

## Kalender

### In-app

- Kalendervy med gigs färgkodade per gig-typ
- Tillgänglighetsvy: vecko-/månadsrutnät (ledig/delvis/upptagen)

### iCal-feed

- URL: `/api/calendar/feed?user={userId}&token={calendarToken}`
- Personlig token per användare (ingen inloggning krävs)
- RFC 5545-kompatibel `.ics` med VTIMEZONE
- Sessions → tidsspecifika events; utan sessions → heldagsevent
- Respekterar `gig_visibility` + `calendar_show_all_members`
- Exkluderar declined och draft

---

## Kontraktsystem

Används av Amida-plattformsadmin för att skicka prenumerationsavtal till organisationskunder. INTE för musikers gig-kontrakt.

### Tvåstegsflöde

1. **Reviewer** (valfritt): Granskar och godkänner → vidarebefordrar till signerare
2. **Signerare**: Ritar handskrift-signatur på canvas → signerad PDF genereras med SHA-256-hash

### Statusflöde

```
draft --> sent_to_reviewer --> reviewed --> sent --> viewed --> signed
                                                          |
                                                      expired / cancelled
```

### Säkerhet

- Tokens: 32 random bytes, 30 dagars utgång
- Rate limiting per endpoint
- SHA-256 dokumenthash vid varje steg
- Full audit trail (IP, user agent, tidsstämpel)

---

## Prenumeration / Stripe

### Planer

- **Free**: Begränsat antal fakturor/månad, begränsade AI-scanningar, begränsad lagring, Amida-märke på PDF
- **Pro**: Obegränsat, e-postutskick, SMTP, ingen märkning
- **Team**: Pro + multi-user (flera medlemmar i samma företag)

### Stripe-integration

- Checkout session → webhook → `subscriptions`-tabell
- Upgrade/downgrade (nedgradering schemaläggs till periodens slut)
- Cancel/reactivate

### Gränser

Konfigureras i `platform_config` (admin-redigerbar): `invoice_limit`, `receipt_scan_limit`, `storage_mb`, priser.

---

## Extern API (`/api/v1/`)

REST API med Bearer-token-autentisering (API-nycklar skapas i Settings > API).

| Endpoint | Scope | Beskrivning |
|----------|-------|-------------|
| `GET /summary` | any | AI-vänlig översikt |
| `GET/POST /gigs` | gigs | Lista/skapa gigs |
| `GET/PATCH/DELETE /gigs/[id]` | gigs | CRUD |
| `GET/POST /clients` | clients | Lista/skapa |
| `GET/PATCH/DELETE /clients/[id]` | clients | CRUD |
| `GET/POST /invoices` | invoices | Lista/skapa med rader |
| `GET/PATCH/DELETE /invoices/[id]` | invoices | CRUD |
| `GET/POST /expenses` | expenses | Lista/skapa |
| `POST /expenses/scan` | expenses | AI kvitto-scan |

Rate limit: 60 req/min per nyckel.

---

## Inställningar

| Flik | Innehåll |
|------|----------|
| **Företag** | Namn, orgnr, adress, bank, logo, valuta, språk, momsreg, dröjsmålsränta |
| **E-post** | Platform (Resend) eller custom SMTP, test-knapp |
| **Kalender** | iCal-URL, kopiera, instruktioner för Google/Apple |
| **Team** | Medlemslista, bjud in, ta bort, visibility-toggle |
| **API** | API-nycklar (skapa/radera/visa scopes) |
| **Prenumeration** | Plan, usage, storage, uppgradera/nedgradera |

---

## Autentisering

### Flöden

- **Registrering**: Email + lösenord → bekräftelsemail → `/api/auth/setup` (skapar company_settings, subscription)
- **Inloggning**: Email + lösenord, eller magic link
- **Invite**: Supabase invite-email → `token_hash` → server-side `verifyOtp` → `/setup-member`
- **Glömt lösenord**: Reset-email → `/reset-password`

### Middleware

Körs på varje request:
- Ej inloggad + skyddad sida → `/login`
- Inloggad + landningssida → `/dashboard`
- Inloggad + onboarding ej klar → `/onboarding` (owner) eller `/setup-member` (member)
- Sätter `NEXT_LOCALE`-cookie

---

## i18n

- **Svenska (sv)** och **Engelska (en)** via `next-intl`
- Locale lagras i `company_settings.locale`, sätts som cookie
- Faktura-PDF respekterar kundens `invoice_language`
- Gig-typer har `name` (sv) + `name_en` (en)

---

## Admin (`/admin`)

Kräver `is_admin()`. Flikar:

| Flik | Funktion |
|------|----------|
| **Organizations** | Alla företag, användare, planer, användningsstatistik |
| **Sponsors** | Sponsorhantering per instrumentkategori |
| **Categories** | Instrumentkategorier |
| **Stats** | MRR, ARR, användarantal |
| **Stripe** | Stripe-dashboard-data |
| **Audit** | Aktivitetslogg |
| **Sessions** | Aktiva sessioner |
| **Invitations** | Inbjudningskoder |
| **Contracts** | Prenumerationskontrakt |
| **Config** | Plangränser, priser, Resend-nyckel |

---

## Viktiga tekniska mönster

### `.single()` på company_members

Alla client-side queries mot `company_members` MÅSTE ha `.limit(1)` före `.single()` (eller `.eq('user_id', ...)`) — annars kraschar det med PGRST116 när företaget har >1 medlem, eftersom RLS-policyn "Members can see co-members" returnerar alla rader.

### `get_user_company_id()` (SECURITY DEFINER)

Central funktion som alla RLS-policies använder. Returnerar `NULL` om användaren inte har membership → all company-data blockeras.

### Draft gig-mönstret

`POST /api/gigs/draft` skapar en rad med `status='draft'` direkt vid dialog-öppning så att bilagor kan kopplas till ett riktigt gig_id. Raderas vid avbryt.

### Fakturanummersekvens

`get_next_invoice_number(company_id)` är atomisk (UPDATE + RETURNING) — race condition-säker.

### Exchange rates

Hämtas vid gig-sparande och lagras som `exchange_rate`. `fee_base`/`total_base` beräknas för konsekvent ekonomisk sammanställning.
