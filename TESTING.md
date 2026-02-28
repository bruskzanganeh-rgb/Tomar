# Amida — Teststrategi & Dokumentation

## Översikt

| Kategori              | Antal tester | Verktyg                | Körs i CI      |
| --------------------- | ------------ | ---------------------- | -------------- |
| **Unit tests**        | 1 213        | Vitest + jsdom         | Ja             |
| **Integration tests** | 141          | Vitest + live Supabase | Ja             |
| **E2E tests**         | ~267         | Playwright             | Nej (manuellt) |
| **Totalt**            | **~1 621**   |                        |                |

**Coverage:** 96% statements, 93% branches, 92% functions, 96% lines

---

## 1. Unit Tests (`tests/unit/`)

Körs med `npm run test:unit`. Testar all affärslogik i `lib/` utan nätverksanrop.

| Fil                            | Tester | Vad den testar                                                                                                         |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `schemas.test.ts`              | 182    | Alla Zod-schemas (admin, auth, client, expense, gig, invoice, onboarding, settings, stripe, translate, usage)          |
| `contracts.test.ts`            | 132    | SHA-256 hash, kontraktschemas (create/review/sign), storage (path, upload, signedUrl), audit-loggning, kontraktsnummer |
| `api-and-activity.test.ts`     | 126    | API-response helpers, API-nyckelvalidering, aktivitetsloggning, klientmatchning, filnedladdning, prenumerationsverktyg |
| `document-classifier.test.ts`  | 99     | PDF-klassificering, bildbearbetning, filvalidering                                                                     |
| `extractor-and-logger.test.ts` | 72     | Fakturanummerextraktion, PDF-textextraktion, AI-kostnadsberäkning, AI-loggning                                         |
| `utils.test.ts`                | 62     | Verktygsfunktioner, Tailwind-klassmerging, cn-helper                                                                   |
| `duplicate-checker.test.ts`    | 54     | Utgiftsdeduplicering                                                                                                   |
| `schedule-parser.test.ts`      | 49     | Kalenderparsing, schematext, vision-parsing, PDF-parsing                                                               |
| `pdf-parser.test.ts`           | 49     | PDF-textextraktion, sidparsning                                                                                        |
| `receipt-parser.test.ts`       | 47     | Kvittodataparsning                                                                                                     |
| `country-config.test.ts`       | 46     | Landskonfigurationer, momssatser, valutamappningar                                                                     |
| `file-validation.test.ts`      | 42     | Filtyp- och storleksvalidering                                                                                         |
| `remaining-coverage.test.ts`   | 35     | Stripe (getStripe, getPlanFromPriceId), admin-verifiering, usage tracking                                              |
| `currency-exchange.test.ts`    | 35     | Växelkurskonverteringar                                                                                                |
| `subscription.test.ts`         | 18     | Prenumerationstierlogik                                                                                                |
| `usage.test.ts`                | 11     | Användningsspårningsvalidering                                                                                         |
| `stripe-webhook.test.ts`       | 10     | Stripe webhook-hantering (alla eventtyper, ogiltig signatur)                                                           |

### Mockning

- **Supabase**: Kedjbar mock (`from().select().eq().single()`)
- **Stripe**: Klassbaserad mock (`class MockStripe`)
- **AI (Anthropic)**: `vi.mock()` med `mockCreate`
- **Next.js**: Mockad `NextResponse`, `headers()`, `cookies()`

### Coverage-trösklar (vitest.config.ts)

```
statements: 90%, branches: 80%, functions: 85%, lines: 90%
```

---

## 2. Integration Tests (`tests/integration/`)

Körs med `npm run test:integration`. Kräver:

- Körande Next.js-server (`npm run start` på port 3000)
- Live Supabase-anslutning (env-variabler)

| Fil                         | Tester | Vad den testar                                                                                                                                                           |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rls-verification.test.ts`  | 79     | Verifierar att uautentiserade inte kan läsa/skriva på ALLA skyddade tabeller (31+ tabeller)                                                                              |
| `rls-isolation.test.ts`     | 24     | Cross-tenant RLS: Company A kan inte se Company B:s data (gigs, clients, invoices, gig_types, positions, gig_dates, subscriptions, contacts, INSERT/UPDATE/DELETE-skydd) |
| `contracts-api.test.ts`     | 28     | Kontraktflöde (review→sign, direkt sign), tokensäkerhet (expired, reused, invalid payload), RLS-isolering                                                                |
| `usage-api.test.ts`         | 5      | Usage-limit API (check, increment, storage quota)                                                                                                                        |
| `admin-api.test.ts`         | 3      | Admin-endpoints (stats, users, config)                                                                                                                                   |
| `tiers-api.test.ts`         | 1      | Tier-konfiguration API                                                                                                                                                   |
| `calendar-feed-api.test.ts` | 1      | Kalender iCal-feed                                                                                                                                                       |

### RLS-testning (Row Level Security)

**Tabeller med RLS-isolationstest:**

- `gigs`, `clients`, `invoices`, `expenses`, `gig_types`, `positions`
- `gig_dates`, `subscriptions`, `contacts`, `gig_attachments`

**Verifierade operationer:**

- SELECT: Kan inte läsa annan companys data
- INSERT: Kan inte skapa data i annan company
- UPDATE: Kan inte ändra annan companys rader
- DELETE: Kan inte radera annan companys rader

**Uautentiserad åtkomst blockerad:**
Alla 31+ skyddade tabeller verifieras att blockera både läsning och skrivning utan inloggning.

### Testkonton

- **Owner**: `e2e-owner@amida-test.com` (Supabase auth-konto)
- **Member**: `e2e-member@amida-test.com` (Supabase auth-konto)
- **Test Company**: "E2E Test AB" (id: `11111111-1111-1111-1111-111111111111`)
- **Other Company**: Separat company för RLS-isolationstest

### Test-email

Alla kontraktrelaterade test-emails skickas till `dlshdzangana@gmail.com` för att undvika bounces som skadar Resend-reputation.

---

## 3. E2E Tests (Playwright) (`tests/*.spec.ts`)

Körs med `npx playwright test --reporter=line`. Kräver körande dev/prod-server.

| Fil                              | Tester | Vad den testar                                             |
| -------------------------------- | ------ | ---------------------------------------------------------- |
| `functional.spec.ts`             | 19     | Kärnflöden: gig, faktura, utgift, team                     |
| `team.spec.ts`                   | 12     | Multi-member samarbete                                     |
| `auth-flow.spec.ts`              | 11     | Registrering, inloggning, lösenordsåterställning, inbjudan |
| `subscription-tier.spec.ts`      | 10     | Prenumerationsberoende UI-funktioner                       |
| `ui-audit.spec.ts`               | 10     | UI-konsistens på alla viewports                            |
| `layout-regression.spec.ts`      | 8      | Knappavklippning, breddproblem, elementsynlighet           |
| `gig-crud.spec.ts`               | 8      | Skapa, läsa, uppdatera, radera gigs                        |
| `team-visibility.spec.ts`        | 6      | Gig personlig/delad synlighetsväxling                      |
| `contract-signing.spec.ts`       | 5      | Kontraktskapande och signering                             |
| `invoice-crud.spec.ts`           | 5      | Fakturaskapande, rader, generering                         |
| `locale-sv.spec.ts`              | 5      | Svensk locale, översättning, formatering                   |
| `client-crud.spec.ts`            | 4      | Klientskapande och hantering                               |
| `expense-crud.spec.ts`           | 4      | Utgiftsloggning och spårning                               |
| `config-types.spec.ts`           | 4      | Gig-typkonfiguration                                       |
| `settings-save.spec.ts`          | 4      | Inställningspersistens                                     |
| `onboarding.spec.ts`             | 4      | Första gången-uppsättning                                  |
| `responsive.spec.ts`             | 4      | iPhone/iPad/Desktop rendering                              |
| `form-validation.spec.ts`        | 3      | Klientsidan formulärvalidering                             |
| `dashboard-widgets.spec.ts`      | 3      | Dashboard stats och widgets                                |
| `calendar-nav.spec.ts`           | 3      | Kalendernavigering                                         |
| `config-positions.spec.ts`       | 3      | Position/roll-konfiguration                                |
| `gig-dialog-screenshots.spec.ts` | 1      | Visuell regression                                         |

### Playwright-projekt

Tester organiseras i projekt med beroenden:

- **auth-setup** → körs först (inloggning)
- **responsive** → 4 viewports: iPhone (390x844), iPad (820x1180), iPad landscape, Desktop (1440x900)
- **crud** → gig, client, invoice, expense CRUD
- **team** → kräver member auth setup
- **subscription** → kräver team-visibility

### Testisolering

- Alla destruktiva tester (edit/delete) scopas till `E2E-`-prefixade rader
- `cleanupTestData()` tar bort E2E-data + orphaned drafts
- Aldrig `first()` — alltid explicit selektor

---

## 4. CI/CD Pipeline (`.github/workflows/ci.yml`)

### Jobb 1: Validate

Triggas på push/PR till `main`.

```
1. npm ci
2. npm run lint         → ESLint (0 errors, 0 warnings)
3. npm run typecheck    → TypeScript --noEmit
4. npm run test:unit -- --coverage  → 1213 tester, 90%+ trösklar
5. npm run build        → Next.js produktionsbygg
```

### Jobb 2: Integration Tests

Körs efter Validate passerar. Kräver GitHub Secrets.

```
1. npm ci
2. npm run build
3. npm run start &      → Starta server i bakgrunden
4. curl-loop (30s)      → Vänta på server
5. npm run test:integration → 141 tester mot live Supabase
```

### GitHub Secrets

| Secret                          | Beskrivning               |
| ------------------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key |
| `STRIPE_SECRET_KEY`             | Stripe API key            |
| `E2E_EMAIL`                     | Test owner email          |
| `E2E_PASSWORD`                  | Test owner password       |

---

## 5. Säkerhetstester

### RLS (Row Level Security)

- **24 isolationstester**: Verifierar att data inte läcker mellan företag
- **79 verifieringstester**: Kontrollerar att alla tabeller blockerar uautentiserad åtkomst
- **gig_attachments**: Överdriven anon-policy borttagen (migration 052)

### Kontrakttoken-säkerhet

- Expired tokens → 410 Gone
- Återanvända tokens → 404 Not Found
- Saknade fält → 400 Bad Request
- För kort signatur → 400 Bad Request

### Stripe Webhook

- Alla eventtyper (checkout.session.completed, subscription.updated, subscription.deleted)
- Ogiltig signatur → 400
- Saknad user_id → ignoreras
- Okänt event → ignoreras

### Säkerhetsheaders

- `Content-Security-Policy` med strict directives
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Permissions-Policy`

### SSRF-skydd

- Invoice email bilagor: URL-whitelist (Supabase storage domain)
- Max attachment-storlek: 10 MB

### Env-validering

- Zod-schema validerar alla required env-vars vid serverstart
- Varnar för saknade optional vars (Stripe, Anthropic)

---

## 6. Köra tester lokalt

```bash
# Unit tests
npm run test:unit

# Unit tests med coverage
npm run test:unit -- --coverage

# Integration tests (kräver .env.local + körande server)
npm run build && npm run start &
npm run test:integration

# Playwright E2E (kräver körande server)
npx playwright test --reporter=line

# Specifikt Playwright-projekt
npx playwright test --project=crud --reporter=line

# Alla tester
npm run test:unit && npm run test:integration
```

---

## 7. Lägga till nya tester

### Unit test

1. Skapa fil i `tests/unit/[namn].test.ts`
2. Mocka Supabase/Stripe/externa beroenden
3. Kör `npm run test:unit -- --coverage` för att verifiera coverage

### Integration test

1. Skapa fil i `tests/integration/[namn].test.ts`
2. Använd `helpers.ts` (`authFetch`, `getAdminClient`, etc.)
3. Rensa testdata i `afterAll`
4. Kör mot lokal server

### E2E test

1. Skapa fil i `tests/[namn].spec.ts`
2. Registrera i `playwright.config.ts` under rätt projekt
3. Använd `helpers.ts` (`loadPageBilingual`, `cleanupTestData`)
4. Prefixa testdata med `E2E-`
