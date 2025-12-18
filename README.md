# Babalisk Manager

Ett komplett gig- och fakturahanteringssystem för musiker, byggt med Next.js och Supabase.

## Funktioner

### ✅ Klar funktionalitet
- Grundläggande projekt-setup
- Databas-schema definierat
- UI-komponenter (shadcn/ui)
- Navigation och layout

### 🚧 Under utveckling
- Uppdragsgivare-register
- Uppdragshantering med email-integration
- PDF-fakturagenerering (Babalisk-design)
- Dropbox-integration för import av historiska fakturor
- Google Calendar-synkronisering
- Statistik och rapporter

## Kom igång

### 1. Installera dependencies

Dependencies är redan installerade. Om du behöver installera om:

```bash
npm install
```

### 2. Konfigurera Supabase

1. Gå till [supabase.com](https://supabase.com) och skapa ett nytt projekt
2. När projektet är skapat, gå till **Project Settings** > **API**
3. Kopiera följande värden:
   - **Project URL** (t.ex. `https://xxxxx.supabase.co`)
   - **anon public** API key

4. Uppdatera `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=din-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-anon-key
```

### 3. Kör databas-schema

1. I ditt Supabase-projekt, gå till **SQL Editor**
2. Skapa en ny query
3. Kopiera hela innehållet från `supabase/schema.sql`
4. Kör queryn
5. Verifiera att alla tabeller skapades under **Table Editor**

Du ska nu se följande tabeller:
- `clients` - Uppdragsgivare
- `contacts` - Kontaktpersoner
- `gig_types` - Uppdragstyper (Konsert, Inspelning, Undervisning)
- `gigs` - Uppdrag
- `invoices` - Fakturor
- `invoice_lines` - Fakturarader
- `expenses` - Utgifter/kvitton
- `company_settings` - Företagsinställningar (Babalisk AB)

### 4. Starta utvecklingsservern

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## Projektstruktur

```
babalisk-manager/
├── app/
│   ├── (dashboard)/          # Dashboard layout med sidebar
│   │   ├── page.tsx          # Hem/Dashboard
│   │   ├── clients/          # Uppdragsgivare (kommer snart)
│   │   ├── gigs/             # Uppdrag (kommer snart)
│   │   ├── invoices/         # Fakturor (kommer snart)
│   │   └── settings/         # Inställningar (kommer snart)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── navigation/
│   │   └── sidebar.tsx       # Huvudnavigation
│   └── ui/                   # shadcn/ui komponenter
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser Supabase client
│   │   └── server.ts         # Server Supabase client
│   ├── types/
│   │   └── database.ts       # TypeScript databas-typer
│   └── utils.ts              # Utility functions
├── supabase/
│   └── schema.sql            # Komplett databas-schema
└── .env.local                # Environment variables
```

## Databas-schema

### Uppdragsgivare (`clients`)
Orkestrar, företag och organisationer som ger dig uppdrag.

### Kontaktpersoner (`contacts`)
Flera kontaktpersoner per uppdragsgivare.

### Uppdragstyper (`gig_types`)
Flexibla typer med olika momssatser:
- Konsert (0% moms)
- Inspelning (6% moms)
- Undervisning (25% moms)
+ Du kan skapa egna typer

### Uppdrag (`gigs`)
Alla dina gigs med status-spårning:
- `pending` - Väntar på svar
- `accepted` - Tackat ja
- `declined` - Tackat nej (sparas för statistik)
- `completed` - Genomfört
- `invoiced` - Fakturerat
- `paid` - Betalt

### Fakturor (`invoices`)
Utgående fakturor med PDF-generering och email-utskick.

### Utgifter (`expenses`)
Kvitton och kostnader, importerade från Dropbox.

## Nästa steg

1. **Uppdragsgivare-CRUD** - Lägg till, redigera, ta bort uppdragsgivare
2. **Uppdragshantering** - Skapa och hantera gigs
3. **Email-integration** - Forward uppdragsmail för automatisk registrering
4. **PDF-fakturering** - Generera fakturor med Babalisk-design
5. **Dropbox-import** - Importera alla fakturor från 2019
6. **Statistik** - Visualisera inkomst över tid

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL)
- **UI:** Tailwind CSS + shadcn/ui
- **TypeScript:** Full type safety
- **PDF:** react-pdf / pdfkit
- **Email:** Resend
- **OCR:** Tesseract + GPT-4o mini
- **Calendar:** Google Calendar API

## Support

Om du stöter på problem:
1. Kontrollera att Supabase-credentials är korrekta i `.env.local`
2. Verifiera att databas-schemat kördes utan fel
3. Kolla browser console för felmeddelanden

---

**Byggd för Babalisk AB av Brusk Zanganeh**
