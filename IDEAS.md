# Amida — Idéer & Roadmap

## Grund (klart)

- [x] **i18n-infrastruktur** — next-intl, sv.json + en.json, Provider i layout
- [x] **Multi-valuta DB** — currency/fee_base/exchange_rate på gigs+invoices, exchange_rates-tabell, Frankfurter API-tjänst
- [x] **Multi-user DB** — user_id på alla tabeller, RLS-policies, index
- [x] **Auth-flöde** — login/signup/middleware, Supabase Auth
- [x] **Mobil-vy** — /m/ routes med bottom-nav, quick-gig, kvittoscanner, gig-lista
- [x] **Valutakurs-tjänst** — lib/currency/exchange.ts med Frankfurter API + DB-cache

## A — Saknas och märks direkt

- [ ] **1. Sök & filter på Uppdrag-sidan**
  - Fritextsök (projektnamn, klient, plats)
  - Filter: klient, typ, datumintervall, status
  - Spara favoritfilter

- [ ] **2. Tidpunkt på gig (start/sluttid)**
  - DB: `start_time`, `end_time` på `gigs`-tabellen
  - GigDialog: tidväljare
  - Kalender: visa tid i dag-celler
  - Detaljpanel: visa klockslag

- [ ] **3. Kopiera/duplicera gig**
  - Knapp i detaljpanelen och i åtgärder-kolumnen
  - Öppnar GigDialog med alla fält förifyllda (utom datum)
  - Perfekt för orkestrar med återkommande mönster

- [ ] **4. Betalningspåminnelser**
  - Knapp "Skicka påminnelse" på förfallna fakturor
  - E-postmall med fakturainformation
  - Räknare: "X dagar försenad"
  - Eventuellt automatisk påminnelse efter N dagar

- [ ] **5. Klicka tom dag i kalender → skapa gig**
  - Klick på tom dag öppnar GigDialog med datumet förifyllt
  - Naturlig interaktion som alla kalender-appar har

## B — Professionella features

- [ ] **6. Milersättning/reseräknare**
  - Fält för antal km på gig
  - Konfigurerbar km-ersättning (t.ex. 25 kr/km)
  - Automatisk beräkning av reseersättning
  - Sammanställning per månad/år

- [ ] **7. Återkommande gig / mallar**
  - Spara gig som mall (klient, typ, plats, arvode)
  - Skapa gig från mall med ett klick
  - Eventuellt: automatisk upprepning (veckovis, månadsvis)

- [ ] **8. Ångra-funktion**
  - Toast med "Ångra"-knapp vid: radera gig, statusändring, radera faktura
  - 5 sekunders fördröjning innan permanent
  - Förhindrar oavsiktliga destruktiva åtgärder

- [ ] **9. Snabbstatistik per klient**
  - Klicka på klient → se: antal gig, totalt fakturerat, snitt per dag
  - Ranking: vilka klienter betalar bäst per arbetsdag?
  - Betalningshistorik: betalar de i tid?

- [ ] **10. SIE-export**
  - Exportera bokföring i SIE4-format
  - Kompatibel med Fortnox, Visma, Björn Lundén
  - Grundläggande kontoplan för frilansmusiker

## C — Polish & UX

- [ ] **11. Keyboard shortcuts**
  - `Cmd+N` / `Ctrl+N`: Nytt uppdrag
  - `Esc`: Stäng dialog/panel
  - `↑↓`: Navigera i tabeller
  - `Enter`: Öppna vald rad
  - Visa shortcuts med `?`

- [ ] **12. Bättre tomma tillstånd**
  - Uppdrag: illustration + "Skapa ditt första uppdrag"
  - Fakturor: "Inga fakturor ännu — slutför ett uppdrag först"
  - Kalender: "Tom kalender — lägg till uppdrag"
  - Guida användaren till nästa steg

- [ ] **13. Veckovy i kalendern**
  - Visa en vecka i taget med tidslinje
  - Visa gig som block med tidpunkt
  - Drag & drop för att flytta

- [ ] **14. Nästa/föregående i detaljpanelen**
  - Pilar ← → för att bläddra mellan gig i listan
  - Utan att stänga och öppna panelen
  - Keyboard: piltangenter

- [ ] **15. Sök i fakturor**
  - Sök på fakturanummer, kund, belopp
  - Filter: status, datumintervall, belopp-range

## D — Framtida visioner

- [ ] **16. Skatterapportering**
  - Årlig inkomstsammanställning
  - Momsredovisning (kvartalsvis)
  - Avdragsbara kostnader per kategori
  - Exportera till Skatteverket-format

- [ ] **17. Kontrakthantering**
  - Mallar för kontrakt/avtal
  - Statusspårning (skickat, signerat, arkiverat)
  - Utgångsdatum och påminnelser

- [ ] **18. Bankintegration**
  - Automatisk betalningsavstämning
  - Importera transaktioner via Tink/Nordigen
  - Matcha betalningar mot fakturor

- [ ] **19. Bokföringsexport**
  - Verifikationer med konton
  - Resultaträkning
  - Balansräkning (förenklad)

- [ ] **20. Mobiloptimering (PWA)**
  - Installera som app på telefon
  - Push-notiser för deadlines och förfallna fakturor
  - Offline-stöd för grundläggande visning
