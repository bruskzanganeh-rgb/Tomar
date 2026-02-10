# Tomar - Setup Guide

Följ dessa steg för att få igång Tomar.

## Steg 1: Skapa Supabase-projekt

1. Gå till [supabase.com](https://supabase.com)
2. Klicka på "Start your project"
3. Logga in eller skapa ett konto
4. Klicka på "New project"
5. Fyll i:
   - **Name:** `babalisk-manager` (eller vad du vill)
   - **Database Password:** Välj ett starkt lösenord (spara det säkert!)
   - **Region:** Välj närmaste region (t.ex. `Europe West (London)` eller `Europe North (Frankfurt)`)
   - **Pricing Plan:** Free tier är perfekt för start
6. Klicka "Create new project"
7. Vänta några minuter medan projektet skapas...

## Steg 2: Hämta API credentials

När projektet är klart:

1. Gå till **Project Settings** (kugghjulet längst ner i vänster sidebar)
2. Klicka på **API** i menyn
3. Du ska nu se:
   - **Project URL** (t.ex. `https://abcdefghijk.supabase.co`)
   - **API Keys** - använd **anon/public** key (den längre)

## Steg 3: Uppdatera .env.local

1. Öppna filen `.env.local` i projektet
2. Ersätt placeholder-värdena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Spara filen

## Steg 4: Kör databas-schema

Nu ska vi skapa alla tabeller i databasen:

1. I Supabase-projektet, gå till **SQL Editor** (i vänster sidebar)
2. Klicka "New query"
3. Öppna filen `supabase/schema.sql` i din editor
4. Kopiera **hela** innehållet
5. Klistra in i SQL Editor i Supabase
6. Klicka "Run" (eller tryck Cmd/Ctrl + Enter)
7. Du ska se: ✓ Success. No rows returned

## Steg 5: Verifiera tabeller

1. Gå till **Table Editor** i Supabase
2. Du ska nu se följande tabeller:
   - `clients`
   - `contacts`
   - `gig_types` (ska ha 3 rader: Konsert, Inspelning, Undervisning)
   - `gigs`
   - `invoices`
   - `invoice_lines`
   - `expenses`
   - `company_settings` (ska ha 1 rad med Babalisk AB info)

3. Klicka på `company_settings` och verifiera att din företagsinfo är korrekt
4. Klicka på `gig_types` och se att de 3 standard-typerna finns

## Steg 6: Starta utvecklingsservern

Tillbaka i terminalen:

```bash
cd babalisk-manager
npm run dev
```

## Steg 7: Testa i webbläsaren

1. Öppna [http://localhost:3000](http://localhost:3000)
2. Du ska se Tomar dashboard
3. Navigationen till vänster ska fungera
4. Om allt ser bra ut är du redo att börja använda systemet!

## Nästa steg

Nu när grundsystemet är igång kan du:

1. **Lägg till uppdragsgivare** - Vi bygger detta som nästa feature
2. **Registrera uppdrag** - Kommer snart
3. **Skapa fakturor** - Kommer snart
4. **Importera historiska fakturor** - Kommer när resten är klart

## Felsökning

### "Error connecting to Supabase"

- Kontrollera att `.env.local` har rätt URL och API key
- Starta om dev-servern (`Ctrl+C` och kör `npm run dev` igen)

### "Table does not exist"

- Kör `supabase/schema.sql` igen i SQL Editor
- Kontrollera att queryn kördes utan fel

### Sidan ser trasig ut

- Kontrollera att alla npm packages installerades korrekt
- Kör `npm install` igen om osäker

## Hjälp

Om du fastnar:
1. Kolla browser console (F12) för felmeddelanden
2. Kolla terminal där `npm run dev` körs
3. Verifiera att Supabase-projektet är online (grönt i dashboard)

---

**Lycka till!** När setupen är klar kan vi börja bygga features!
