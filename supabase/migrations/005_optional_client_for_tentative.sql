-- Migration: Gör client_id valfritt för tentative gigs
-- Tillåter att skapa gigs utan uppdragsgivare (för "Ej bekräftat" status)

ALTER TABLE gigs ALTER COLUMN client_id DROP NOT NULL;
