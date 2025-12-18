# Dropbox Import - Status

## ✅ Färdigt (Completed)

### 1. Dependencies
- ✅ `dropbox` - Dropbox SDK installerad
- ✅ `unpdf` - PDF text extraction
- ✅ `@anthropic-ai/sdk` - Claude API för AI-parsing
- ✅ `fastest-levenshtein` - Fuzzy string matching

### 2. Konfiguration
- ✅ `.env.local` uppdaterad med:
  - `DROPBOX_APP_KEY=wc061wat4emlir`
  - `DROPBOX_APP_SECRET=c10crinbh4symk`
  - `ANTHROPIC_API_KEY` (din Claude API-nyckel)
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### 3. Databas Migration
- ✅ Migration-fil skapad: `supabase/migrations/001_add_dropbox_oauth.sql`
- ⚠️  **BEHÖVER KÖRAS MANUELLT** i Supabase SQL Editor

### 4. Kärnbibliotek
- ✅ `/lib/types/import.ts` - TypeScript types
- ✅ `/lib/dropbox/client.ts` - Dropbox client wrapper
- ✅ `/lib/pdf/extractor.ts` - PDF text extraction med unpdf
- ✅ `/lib/pdf/parser.ts` - AI parsing med **Claude 3.5 Sonnet**
- ✅ `/lib/import/client-matcher.ts` - Multi-level client matching

### 5. API Routes
- ✅ `/api/dropbox/auth` - OAuth initiering
- ✅ `/api/dropbox/callback` - OAuth callback handler
- ✅ `/api/dropbox/list-invoices` - Lista PDF-fakturor från mapp
- ✅ `/api/dropbox/download-pdf` - Ladda ner PDF
- ✅ `/api/import/parse-invoice` - Parsa PDF med AI

### 6. UI
- ✅ `/app/import/page.tsx` - Import wizard (steg 1 klar)
- ✅ Sidebar uppdaterad med "Importera" länk

---

## ⚠️  Nästa Steg (Du behöver göra detta)

### Steg 1: Kör Databas Migration
1. Gå till Supabase SQL Editor:
   https://supabase.com/dashboard/project/yemzxdqaextfsqnrtxyw/sql/new

2. Kopiera och kör denna SQL:
```sql
ALTER TABLE company_settings
ADD COLUMN dropbox_access_token TEXT,
ADD COLUMN dropbox_refresh_token TEXT,
ADD COLUMN dropbox_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN dropbox_account_id TEXT,
ADD COLUMN dropbox_connected_at TIMESTAMP WITH TIME ZONE;
```

3. Klicka "Run" för att köra SQL:en

### Steg 2: Sätt Dropbox Permissions
1. Gå till din Dropbox App:
   https://www.dropbox.com/developers/apps

2. Klicka på "Babalisk Manager"

3. Gå till "Permissions" fliken

4. Aktivera dessa permissions:
   - ☑️ `files.metadata.read`
   - ☑️ `files.content.read`
   - ☑️ `account_info.read`

5. Klicka "Submit" längst ner

### Steg 3: Testa Import Flow
1. Starta dev server (om den inte redan kör):
   ```bash
   npm run dev
   ```

2. Gå till http://localhost:3000/import

3. Klicka "Anslut Dropbox"

4. Godkänn åtkomst på Dropbox.com

5. Du kommer tillbaka till import-sidan med "Dropbox ansluten!"

---

## 🎯 Nästa Fas (Vi bygger tillsammans)

När du har kört migrations-SQL:en och testat OAuth-flödet, kan vi bygga:

### Fas 2: Välj Fakturor UI
- [ ] Lista alla PDF-filer från `/Kundfakturor/{år}/`
- [ ] Visa vilka fakturor som redan finns i databasen
- [ ] Checkbox för att välja vilka att importera
- [ ] Filter för att bara visa saknade fakturor (#210-#239)

### Fas 3: Importera & Granska
- [ ] Parsa valda PDF:er med Claude AI
- [ ] Visa parsed data i tabell
- [ ] Markera klienter som behöver manuell matchning
- [ ] Dialog för manuell klientmatchning
- [ ] Progress bar under import

### Fas 4: Spara till Databas
- [ ] Validera parsed data
- [ ] Matcha klienter automatiskt (fuzzy matching)
- [ ] Skapa invoice + invoice_lines i databasen
- [ ] Uppdatera next_invoice_number
- [ ] Visa sammanfattning av import

---

## 📊 Kostnad

### Med Claude 3.5 Sonnet:
- **Input:** ~$3 / 1M tokens
- **Output:** ~$15 / 1M tokens

### För Dina Fakturor:
- **30 saknade fakturor (#210-#239):** ~15 öre
- **Alla 195 fakturor (#45-#239):** ~60 öre

**Fortfarande extremt billigt!** 🎉

---

## 🐛 Troubleshooting

### "Column does not exist"
→ Du har inte kört databas-migrationen ännu. Kör SQL:en i Supabase.

### "Invalid permissions"
→ Gå till Dropbox App settings → Permissions tab → Aktivera de 3 permissions

### "Dropbox not connected"
→ Klicka "Anslut Dropbox" på /import sidan

### "Failed to extract text"
→ PDF:en kanske är skannad bild, behöver OCR (kan lägga till Tesseract.js)

---

## ✨ Sammanfattning

**Vad som är klart:**
- ✅ All backend-infrastruktur (API routes, parsers, matchers)
- ✅ Dropbox OAuth integration
- ✅ Claude AI PDF parsing
- ✅ Fuzzy client name matching
- ✅ Import wizard UI (steg 1)

**Vad du behöver göra:**
1. Kör SQL-migrationen i Supabase
2. Sätt Dropbox permissions
3. Testa OAuth-flödet på http://localhost:3000/import

**Sedan bygger vi tillsammans:**
- Steg 2-3 av import wizard
- Faktisk PDF-import och datavalidering
- Spara till databas

**Beräknad tid för nästa fas:** ~2-3 timmar

---

**Redo att testa?** 🚀
