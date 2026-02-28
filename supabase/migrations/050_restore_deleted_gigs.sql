-- ============================================================================
-- Migration 050: Restore 9 deleted gigs + cleanup test garbage
--
-- E2E tests (gig-crud.spec.ts) deleted real gigs by operating on the first
-- visible gig instead of test-created gigs. All data restored from audit_logs.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Restore 9 deleted gigs (from audit_logs old_data)
-- ============================================================================

-- 1. Martini Duo
INSERT INTO gigs (id, project_name, status, fee, venue, notes, gig_type_id, user_id, company_id, date, start_date, end_date, total_days, currency, fee_base, exchange_rate, created_at, updated_at)
VALUES (
  'e24bd043-77f6-4768-b8cd-fa89acf5c51f',
  'Martini Duo',
  'accepted',
  11000.00,
  'Uppsala',
  E'Rep: Måndag 17 mars 10:00-14:00, Tisdag 18 mars 10:00-14:00\nKonsert: Fredag 20 mars 2026 kl 19:00\nGage: 11.000 kr',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-03-17T00:00:00+00:00',
  '2026-03-17',
  '2026-03-20',
  3,
  'SEK',
  NULL,
  NULL,
  '2026-02-27T20:29:57.120538+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Rep Jenufa
INSERT INTO gigs (id, project_name, status, fee, venue, notes, client_id, gig_type_id, position_id, user_id, company_id, date, start_date, end_date, total_days, currency, fee_base, exchange_rate, created_at, updated_at)
VALUES (
  'aedcdca5-5a9a-4d68-8e70-38a12cc90585',
  'Rep Jenufa',
  'accepted',
  80000.00,
  'Göteborgsoperan',
  E'Februari\nTis 17/2 kl. 10:30\u201313:40\nOns 18/2 kl. 10:30\u201314:00\nTor 19/2 kl. 10:30\u201313:40\nFre 20/2 kl. 10:45\u201314:30\n\nMars\nMån 3/3 kl. 19:00\nTor 12/3 kl. 19:00\nSön 15/3 kl. 18:00\nTis 17/3 kl. 11:00\u201314:00\nOns 18/3 kl. 11:00\u201314:00\nOns 18/3 kl. 19:00\nFre 20/3 kl. 11:00\nLör 21/3 kl. 18:00\nSön 22/3 kl. 12:30\n\nOns 25/3 kl. 11:00\u201314:15\nTor 26/3 kl. 11:00\u201314:30\nTor 26/3 kl. 19:00\nFre 27/3 kl. 11:00\u201314:15\nSön 29/3 kl. 18:00\n\nTis 31/3 kl. 11:00\n\nApril\nOns 1/4 kl. 12:00\nOns 1/4 kl. 19:30\nTis 7/4 kl. 11:00\nTis 7/4 kl. 19:00\nOns 8/4 kl. 11:00\nOns 8/4 kl. 19:30',
  '6f5f8297-3866-482d-93e5-b2c255ff9918',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  'a55b2859-c7ab-40a8-889f-9af12568a8a1',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-02-17T00:00:00+00:00',
  '2026-02-17',
  '2026-04-08',
  20,
  'SEK',
  80000.00,
  1.000000,
  '2025-12-19T13:56:43.395673+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Haydn Symf. nr 96
INSERT INTO gigs (id, project_name, status, fee, venue, client_id, gig_type_id, position_id, user_id, company_id, date, start_date, end_date, total_days, currency, fee_base, exchange_rate, created_at, updated_at)
VALUES (
  '2b218e0c-426b-4cba-88f6-ece166ffef17',
  'Haydn Symf. nr 96',
  'accepted',
  25000.00,
  'Jönköping Spira',
  '02d1ae9d-acaf-4c4c-9733-b70fad255df7',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  '22e0e637-4a33-4847-a2f2-56ad5d798221',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-03-05T00:00:00+00:00',
  '2026-03-05',
  '2026-03-08',
  4,
  'SEK',
  25000.00,
  1.000000,
  '2025-12-16T23:41:50.494169+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Den fula ankungen
INSERT INTO gigs (id, project_name, status, venue, notes, client_id, gig_type_id, position_id, user_id, company_id, date, start_date, end_date, total_days, currency, exchange_rate, created_at, updated_at)
VALUES (
  '478e8f48-c0f4-43b0-aae2-c68d34dae542',
  'Den fula ankungen',
  'accepted',
  'Kulturhuset tio14, Myntgatan 10-14, Falun',
  E'Dirigent/kompositör: Jonas Nydesjö\n\nFredag 10 april 2026:\n  11:00\u201315:30: Pass\n\nLördag 11 april 2026:\n  ca 10:00\u201311:00: Genrep\n  ca 13:00\u201314:00: Konsert',
  'd70d3757-3488-4d0c-8ecf-b5f0bd04968b',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  '22e0e637-4a33-4847-a2f2-56ad5d798221',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-04-10T00:00:00+00:00',
  '2026-04-10',
  '2026-04-11',
  2,
  'SEK',
  1.000000,
  '2026-02-24T11:12:34.690847+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. Lasse Spångberg Födelsedag 80 år
INSERT INTO gigs (id, project_name, status, fee, venue, notes, gig_type_id, position_id, user_id, company_id, date, start_date, end_date, total_days, currency, fee_base, exchange_rate, created_at, updated_at)
VALUES (
  'f456a6fc-43a4-4365-b9c4-c76f9539c944',
  'Lasse Spångberg Födelsedag 80 år',
  'tentative',
  5000.00,
  'Bachelor Club',
  'Fixa stråkkvarett, prata gage, fråga Paloma?',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  '15fca136-a191-41b3-88be-11a5e818611e',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-04-18T00:00:00+00:00',
  '2026-04-18',
  '2026-04-18',
  1,
  'SEK',
  5000.00,
  1.000000,
  '2025-12-24T20:19:17.721636+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 6. Julius Hus (no project_name)
INSERT INTO gigs (id, status, fee, venue, notes, client_id, gig_type_id, position_id, user_id, company_id, date, start_date, end_date, total_days, currency, fee_base, exchange_rate, created_at, updated_at)
VALUES (
  '16dd0f5a-8fbc-4c2a-b997-f7c2b346f939',
  'accepted',
  6000.00,
  'Julius Hus',
  '19/4 på Julius Hus (antagligen dubbla gig den dagen)',
  'cc1af41c-0a3d-4eb0-a65b-4339128d10a9',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  '15fca136-a191-41b3-88be-11a5e818611e',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-04-19T19:00:00+00:00',
  '2026-04-19',
  '2026-04-19',
  1,
  'SEK',
  6000.00,
  1.000000,
  '2025-12-28T21:24:59.710135+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 7. Konserthuset I Stockholm (15 000 kr)
INSERT INTO gigs (id, status, fee, venue, client_id, gig_type_id, position_id, user_id, company_id, date, start_date, end_date, total_days, currency, fee_base, exchange_rate, created_at, updated_at)
VALUES (
  'ff5a1780-b694-46db-b50c-c8a0bee20891',
  'accepted',
  15000.00,
  'Konserthuset I stockholm',
  'e68194a7-1d6d-481d-89ed-16dec7c79643',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  '026bc0fd-01f2-43b8-8af5-418a87d136a9',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-05-11T00:00:00+00:00',
  '2026-05-11',
  '2026-05-13',
  3,
  'SEK',
  15000.00,
  1.000000,
  '2026-01-19T13:09:18.190188+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 8. Stockholm / Sara concert (tentative)
INSERT INTO gigs (id, status, fee, venue, notes, client_id, gig_type_id, position_id, user_id, company_id, date, start_date, end_date, total_days, currency, fee_base, exchange_rate, response_date, created_at, updated_at)
VALUES (
  '5052713c-6d1a-4be1-9394-7be533e69325',
  'tentative',
  8000.00,
  'Stockholm',
  E'Sara har bett mig reservera detta datum , Hej igen! Vad tror du om konserten 22 maj i Stockholms konserthus? rep samma vecka. 3 uruppföranden Johan Ulléns Pulcinella. Hade vart sjukt bra om du kan. Hoppas du har haft det bra över helgerna. Kraam!!\n\nHej igen. B Tommy ska dirigera 2 av styckena på konserten i maj (Ullén och Wang) och han kan bara dessa tider B Tommy kan måndagen, tisdag kväll från 19, torsdag, och fredag från ca 13 Sedan ska vi själva repa in 2 stycken till (Hedelin och Hedås) utan dirigent, har du några önskemål på tider för de repen, eller ska jag bara dra till med något i anslutning till de repen?',
  '6423a3e1-c98e-4161-9abf-10b7177f7bc8',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  '15fca136-a191-41b3-88be-11a5e818611e',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-05-22T00:00:00+00:00',
  '2026-05-22',
  '2026-05-22',
  1,
  'SEK',
  8000.00,
  1.000000,
  '2025-12-18T17:54:59.523+00:00',
  '2025-12-16T23:43:30.093774+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 9. Konserthuset I Stockholm (20 000 kr)
INSERT INTO gigs (id, status, fee, venue, client_id, gig_type_id, position_id, user_id, company_id, date, start_date, end_date, total_days, currency, fee_base, exchange_rate, created_at, updated_at)
VALUES (
  '07edd68a-4a62-4292-bdbb-63c633f0971b',
  'accepted',
  20000.00,
  'Konserthuset I Stockholm',
  'e68194a7-1d6d-481d-89ed-16dec7c79643',
  '3124955e-6e16-4e30-91ce-9b54611f29e7',
  '026bc0fd-01f2-43b8-8af5-418a87d136a9',
  'a73fbf94-55ef-4134-a798-cd78f3e89700',
  '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6',
  '2026-05-25T10:00:00+00:00',
  '2026-05-25',
  '2026-05-30',
  5,
  'SEK',
  20000.00,
  1.000000,
  '2026-01-19T13:11:08.064813+00:00',
  NOW()
) ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- PART 2: Restore gig_dates for all 9 gigs (41 unique dates)
-- ============================================================================

-- Gig 1: Martini Duo (3 dates)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), 'e24bd043-77f6-4768-b8cd-fa89acf5c51f', '2026-03-17', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'e24bd043-77f6-4768-b8cd-fa89acf5c51f', '2026-03-18', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'e24bd043-77f6-4768-b8cd-fa89acf5c51f', '2026-03-20', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;

-- Gig 2: Rep Jenufa (20 dates)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-02-17', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-02-18', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-02-19', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-02-20', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-03', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-12', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-15', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-17', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-18', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-20', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-21', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-22', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-25', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-26', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-27', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-29', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-03-31', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-04-01', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-04-07', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'aedcdca5-5a9a-4d68-8e70-38a12cc90585', '2026-04-08', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;

-- Gig 3: Haydn Symf. nr 96 (4 dates)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), '2b218e0c-426b-4cba-88f6-ece166ffef17', '2026-03-05', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '2b218e0c-426b-4cba-88f6-ece166ffef17', '2026-03-06', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '2b218e0c-426b-4cba-88f6-ece166ffef17', '2026-03-07', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '2b218e0c-426b-4cba-88f6-ece166ffef17', '2026-03-08', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;

-- Gig 4: Den fula ankungen (2 dates)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), '478e8f48-c0f4-43b0-aae2-c68d34dae542', '2026-04-10', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '478e8f48-c0f4-43b0-aae2-c68d34dae542', '2026-04-11', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;

-- Gig 5: Lasse Spångberg 80 år (1 date)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), 'f456a6fc-43a4-4365-b9c4-c76f9539c944', '2026-04-18', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;

-- Gig 6: Julius Hus (1 date)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), '16dd0f5a-8fbc-4c2a-b997-f7c2b346f939', '2026-04-19', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;

-- Gig 7: Konserthuset I Stockholm 15k (3 dates)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), 'ff5a1780-b694-46db-b50c-c8a0bee20891', '2026-05-11', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'ff5a1780-b694-46db-b50c-c8a0bee20891', '2026-05-12', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), 'ff5a1780-b694-46db-b50c-c8a0bee20891', '2026-05-13', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;

-- Gig 8: Stockholm / Sara (2 dates)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), '5052713c-6d1a-4be1-9394-7be533e69325', '2026-05-20', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '5052713c-6d1a-4be1-9394-7be533e69325', '2026-05-22', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;

-- Gig 9: Konserthuset I Stockholm 20k (5 dates)
INSERT INTO gig_dates (id, gig_id, date, company_id) VALUES
  (gen_random_uuid(), '07edd68a-4a62-4292-bdbb-63c633f0971b', '2026-05-25', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '07edd68a-4a62-4292-bdbb-63c633f0971b', '2026-05-26', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '07edd68a-4a62-4292-bdbb-63c633f0971b', '2026-05-27', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '07edd68a-4a62-4292-bdbb-63c633f0971b', '2026-05-28', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'),
  (gen_random_uuid(), '07edd68a-4a62-4292-bdbb-63c633f0971b', '2026-05-30', '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- PART 3: Cleanup test garbage
-- ============================================================================

-- Delete gig_dates for orphaned test gigs
DELETE FROM gig_dates WHERE gig_id IN (
  SELECT id FROM gigs
  WHERE (project_name IS NULL OR project_name = '')
  AND created_at > '2026-02-24 13:00:00'
  AND status IN ('draft', 'pending')
  AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'
);

-- Delete orphaned test gigs (79+ drafts + 19+ pending)
DELETE FROM gigs
WHERE (project_name IS NULL OR project_name = '')
AND created_at > '2026-02-24 13:00:00'
AND status IN ('draft', 'pending')
AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6';

-- Delete E2E-prefixed test gigs
DELETE FROM gig_dates WHERE gig_id IN (
  SELECT id FROM gigs WHERE project_name ILIKE 'E2E-%'
  AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'
);
DELETE FROM gigs WHERE project_name ILIKE 'E2E-%'
AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6';

-- Delete test invoice lines
DELETE FROM invoice_lines WHERE invoice_id IN (
  SELECT id FROM invoices
  WHERE status = 'draft'
  AND created_at > '2026-02-27 20:00:00'
  AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6'
);

-- Delete test invoices (#241-#250)
DELETE FROM invoices
WHERE status = 'draft'
AND created_at > '2026-02-27 20:00:00'
AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6';

-- Reset invoice counter
UPDATE companies SET next_invoice_number = 241
WHERE id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6';

-- Delete test clients
DELETE FROM clients WHERE name ILIKE 'E2E%'
AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6';

-- Delete test gig types
DELETE FROM gig_types WHERE name ILIKE 'E2E%'
AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6';

-- Delete test positions
DELETE FROM positions WHERE name ILIKE 'E2E%'
AND company_id = '74c1c8b5-1f87-41ba-b0a1-f2831e39a8e6';

COMMIT;
