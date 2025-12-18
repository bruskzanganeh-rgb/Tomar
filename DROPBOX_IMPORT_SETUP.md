# Dropbox PDF Import - Setup Guide

## ✅ What's Been Built

### 1. Dependencies Installed
- `dropbox` - Official Dropbox SDK
- `unpdf` - Modern PDF text extraction
- `openai` - GPT-4o mini for parsing
- `fastest-levenshtein` - Fuzzy string matching

### 2. Database Schema
Migration file created: `supabase/migrations/001_add_dropbox_oauth.sql`

**Run this SQL in Supabase SQL Editor:**
```sql
ALTER TABLE company_settings
ADD COLUMN dropbox_access_token TEXT,
ADD COLUMN dropbox_refresh_token TEXT,
ADD COLUMN dropbox_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN dropbox_account_id TEXT,
ADD COLUMN dropbox_connected_at TIMESTAMP WITH TIME ZONE;
```

### 3. Core Libraries Created

#### `/lib/types/import.ts`
- TypeScript types for parsed invoices, client matching, import progress

#### `/lib/dropbox/client.ts`
- `getDropboxClient()` - Get authenticated Dropbox instance
- `storeDropboxTokens()` - Save OAuth tokens to database
- `clearDropboxTokens()` - Disconnect Dropbox

#### `/lib/pdf/extractor.ts`
- `extractTextFromPDF()` - Extract text using unpdf
- `extractInvoiceNumberFromFilename()` - Parse "Faktura-123.pdf"

#### `/lib/pdf/parser.ts`
- `parseInvoiceWithAI()` - Use GPT-4o mini to extract invoice data
- Structured prompts optimized for Swedish invoices
- Zod validation for response

#### `/lib/import/client-matcher.ts`
- `matchClient()` - Multi-level client name matching:
  1. Exact match
  2. Fuzzy match (Levenshtein distance)
  3. Token-based matching
  4. Returns suggestions for manual review

### 4. API Routes Created

#### OAuth Flow
- `/api/dropbox/auth` - Initiate OAuth, returns auth URL
- `/api/dropbox/callback` - Handle OAuth callback, store tokens

#### File Operations
- `/api/dropbox/list-invoices?year=2020` - List PDFs in `/Kundfakturor/{year}/`
- `/api/dropbox/download-pdf` - Download PDF from Dropbox

#### Import
- `/api/import/parse-invoice` - Parse PDF file with OCR + AI

---

## 🔧 Setup Required

### Step 1: Create Dropbox App

1. Go to https://www.dropbox.com/developers/apps/create
2. Choose **Scoped access**
3. Choose **Full Dropbox** access
4. Name your app (e.g., "Babalisk Manager")
5. Click **Create app**

### Step 2: Configure Dropbox App

In your app settings:

1. **OAuth 2** section:
   - Add redirect URI: `http://localhost:3000/api/dropbox/callback`
   - For production: `https://your-domain.com/api/dropbox/callback`

2. **Permissions** tab:
   - Enable: `files.metadata.read`
   - Enable: `files.content.read`
   - Enable: `account_info.read`

3. **Settings** tab:
   - Copy **App key** and **App secret**

### Step 3: Update Environment Variables

Edit `.env.local` and add:

```env
# Dropbox OAuth
DROPBOX_APP_KEY=your-app-key-here
DROPBOX_APP_SECRET=your-app-secret-here

# OpenAI (for PDF parsing)
OPENAI_API_KEY=your-openai-api-key-here

# App URL (keep as is for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Run Database Migration

Go to Supabase SQL Editor:
https://supabase.com/dashboard/project/yemzxdqaextfsqnrtxyw/sql/new

Run the SQL from `supabase/migrations/001_add_dropbox_oauth.sql`

---

## 📊 Cost Estimate

### GPT-4o Mini Pricing:
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

### For Your Invoices:
- **30 missing invoices (#210-#239):** ~$0.02 (2 cents)
- **All 195 invoices (#45-#239):** ~$0.11 (11 cents)

**Extremely cheap!**

---

## 🎯 Next Steps

### Immediate:
1. Create Dropbox app and get API keys
2. Update `.env.local` with keys
3. Run database migration
4. Test OAuth flow

### Then Build:
1. Import wizard UI (`/app/import/page.tsx`)
2. Test with actual PDFs
3. Import missing invoices #210-#239

---

## 📁 Your Dropbox Structure

The system expects PDFs in this structure:
```
/Kundfakturor/
  /2019/
    Faktura-45.pdf
    Faktura-46.pdf
    ...
  /2020/
    Faktura-100.pdf
    ...
  /2024/
    Faktura-230.pdf
    Faktura-239.pdf
```

---

## 🔍 How It Works

1. **User clicks "Connect Dropbox"**
   - → `/api/dropbox/auth` returns OAuth URL
   - → User authorizes on Dropbox.com
   - → Redirects to `/api/dropbox/callback`
   - → Tokens stored in database

2. **User selects year folder (e.g., 2024)**
   - → `/api/dropbox/list-invoices?year=2024`
   - → Returns list of PDF files

3. **System processes each PDF**
   - → Download from Dropbox
   - → Extract text with `unpdf`
   - → Parse with GPT-4o mini
   - → Match client name to database
   - → Show preview for user approval

4. **User confirms import**
   - → Insert into `invoices` and `invoice_lines` tables
   - → Update `next_invoice_number` if needed

---

## 🚨 Important Notes

- **Dropbox tokens expire after 4 hours** - Need to implement refresh logic (TODO)
- **PDF quality matters** - If OCR fails, may need manual entry
- **Client matching is fuzzy** - Always review matches before importing
- **Invoice lines** - Phase 1 imports totals only, line items can be added later

---

## 🐛 Troubleshooting

### "Dropbox not connected"
→ Run OAuth flow to connect your Dropbox account

### "Failed to extract text"
→ PDF might be scanned image, needs actual OCR (Tesseract.js)

### "Client not found"
→ Add the client manually first, or use manual matching in UI

### "Invalid AI response"
→ Check OpenAI API key, or PDF might have unusual format

---

**Ready to test once you've added the API keys!**
