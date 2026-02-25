-- =============================================================================
-- LHDN E-Invoice — Local Dev Seed Data
-- Run: wrangler d1 execute lhdn-einvoice-db --local --file=./scripts/seed.sql
--
-- Test credentials (all users):
--   password: Test1234!
--   hash:     $2a$10$6v1okiYmvPIx9GQ//35MHuyKab9D/F6kOkz0B9rEKkDWpFqnl..F.
--
-- Demo users (all 4 business roles):
--   password: password123
--   hash:     $2a$10$TlJBGP8xWV3Mnm9XWm61OOcH2KP/t.5vYI.i.u/5hRNuTRj9dHZ2q
--   owner@demo.com      → OWNER
--   admin@demo.com      → ADMIN
--   accountant@demo.com → ACCOUNTANT
--   viewer@demo.com     → VIEWER
-- =============================================================================

-- ── Wipe existing seed data (safe for local only) ────────────────────────────
DELETE FROM audit_logs;
DELETE FROM notification_logs;
DELETE FROM buyer_portal_tokens;
DELETE FROM lhdn_submissions;
DELETE FROM bulk_imports;
DELETE FROM ocr_documents;
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM lhdn_tokens;
DELETE FROM refresh_tokens;
DELETE FROM notification_preferences;
DELETE FROM business_members;
DELETE FROM businesses;
DELETE FROM users;

-- =============================================================================
-- USERS
-- =============================================================================

-- Admin / business owner
INSERT INTO users (id, email, name, password_hash, role, is_active, created_at, updated_at) VALUES
  ('usr_01_owner',  'ali@techventure.my',   'Ali Hassan',        '$2a$10$6v1okiYmvPIx9GQ//35MHuyKab9D/F6kOkz0B9rEKkDWpFqnl..F.', 'USER',  1, '2025-01-10T08:00:00Z', '2025-01-10T08:00:00Z'),
  ('usr_02_admin',  'siti@techventure.my',  'Siti Aishah',       '$2a$10$6v1okiYmvPIx9GQ//35MHuyKab9D/F6kOkz0B9rEKkDWpFqnl..F.', 'USER',  1, '2025-01-11T09:00:00Z', '2025-01-11T09:00:00Z'),
  ('usr_03_viewer', 'rizal@techventure.my', 'Mohd Rizal Ismail', '$2a$10$6v1okiYmvPIx9GQ//35MHuyKab9D/F6kOkz0B9rEKkDWpFqnl..F.', 'USER',  1, '2025-02-01T10:00:00Z', '2025-02-01T10:00:00Z'),
  ('usr_04_owner2', 'farah@globallogistic.my', 'Farah Nadia',    '$2a$10$6v1okiYmvPIx9GQ//35MHuyKab9D/F6kOkz0B9rEKkDWpFqnl..F.', 'USER',  1, '2025-01-15T08:30:00Z', '2025-01-15T08:30:00Z');

-- Demo users — all 4 business member roles (password: password123)
INSERT INTO users (id, email, name, password_hash, role, is_active, created_at, updated_at) VALUES
  ('usr_demo_owner',      'owner@demo.com',      'Demo Owner',      '$2a$10$TlJBGP8xWV3Mnm9XWm61OOcH2KP/t.5vYI.i.u/5hRNuTRj9dHZ2q', 'USER', 1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('usr_demo_admin',      'admin@demo.com',      'Demo Admin',      '$2a$10$TlJBGP8xWV3Mnm9XWm61OOcH2KP/t.5vYI.i.u/5hRNuTRj9dHZ2q', 'USER', 1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('usr_demo_accountant', 'accountant@demo.com', 'Demo Accountant', '$2a$10$TlJBGP8xWV3Mnm9XWm61OOcH2KP/t.5vYI.i.u/5hRNuTRj9dHZ2q', 'USER', 1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('usr_demo_viewer',     'viewer@demo.com',     'Demo Viewer',     '$2a$10$TlJBGP8xWV3Mnm9XWm61OOcH2KP/t.5vYI.i.u/5hRNuTRj9dHZ2q', 'USER', 1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z');

-- =============================================================================
-- BUSINESSES
-- =============================================================================

INSERT INTO businesses (
  id, user_id, name, tin, registration_number, msic_code,
  sst_registration_number,
  address_line0, address_line1, address_line2,
  postal_zone, city_name, state_code, country_code,
  email, phone,
  lhdn_client_id_encrypted, lhdn_client_secret_encrypted,
  is_active, created_at, updated_at
) VALUES
  (
    'biz_01_techventure', 'usr_01_owner',
    'TechVenture Sdn Bhd',
    'C12345678910', '202301012345', '6201',
    'W10-2301-12345678',
    'Unit 12-3, Tower B, Menara KL Eco City', 'No. 3, Jalan Bangsar', NULL,
    '59200', 'Kuala Lumpur', '14', 'MYS',
    'billing@techventure.my', '+60312345678',
    NULL, NULL,
    1, '2025-01-10T08:05:00Z', '2025-01-10T08:05:00Z'
  ),
  (
    'biz_02_globallogistic', 'usr_04_owner2',
    'Global Logistic Services Sdn Bhd',
    'C98765432100', '202001098765', '4941',
    NULL,
    'Lot 5, Jalan Perindustrian Bukit Minyak 1', 'Kawasan Perindustrian Bukit Minyak', NULL,
    '14100', 'Bukit Minyak', '07', 'MYS',
    'accounts@globallogistic.my', '+604-5011234',
    NULL, NULL,
    1, '2025-01-15T08:35:00Z', '2025-01-15T08:35:00Z'
  );

-- Demo business (linked to demo owner)
INSERT INTO businesses (
  id, user_id, name, tin, registration_number, msic_code,
  address_line0, postal_zone, city_name, state_code, country_code,
  email, phone,
  is_active, created_at, updated_at
) VALUES (
  'biz_demo', 'usr_demo_owner',
  'Demo Company Sdn Bhd', 'C00000000001', '202500000001', '6201',
  'No 1, Jalan Demo, Taman Demo', '50000', 'Kuala Lumpur', '14', 'MYS',
  'demo@democompany.my', '+60312340000',
  1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'
);

-- =============================================================================
-- BUSINESS MEMBERS
-- =============================================================================

-- TechVenture: owner has implicit access; add Siti as ADMIN, Rizal as VIEWER
INSERT INTO business_members (id, business_id, user_id, role, invited_by_user_id, accepted_at, created_at, updated_at) VALUES
  ('mbr_01', 'biz_01_techventure', 'usr_01_owner',  'OWNER',  NULL,           '2025-01-10T08:05:00Z', '2025-01-10T08:05:00Z', '2025-01-10T08:05:00Z'),
  ('mbr_02', 'biz_01_techventure', 'usr_02_admin',  'ADMIN',  'usr_01_owner', '2025-01-12T10:00:00Z', '2025-01-11T09:05:00Z', '2025-01-12T10:00:00Z'),
  ('mbr_03', 'biz_01_techventure', 'usr_03_viewer', 'VIEWER', 'usr_01_owner', '2025-02-02T09:00:00Z', '2025-02-01T10:05:00Z', '2025-02-02T09:00:00Z');

-- GlobalLogistic: owner only
INSERT INTO business_members (id, business_id, user_id, role, invited_by_user_id, accepted_at, created_at, updated_at) VALUES
  ('mbr_04', 'biz_02_globallogistic', 'usr_04_owner2', 'OWNER', NULL, '2025-01-15T08:35:00Z', '2025-01-15T08:35:00Z', '2025-01-15T08:35:00Z');

-- Demo business: all 4 roles represented
INSERT INTO business_members (id, business_id, user_id, role, invited_by_user_id, accepted_at, created_at, updated_at) VALUES
  ('mbr_demo_owner',      'biz_demo', 'usr_demo_owner',      'OWNER',      NULL,             '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('mbr_demo_admin',      'biz_demo', 'usr_demo_admin',      'ADMIN',      'usr_demo_owner', '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('mbr_demo_accountant', 'biz_demo', 'usr_demo_accountant', 'ACCOUNTANT', 'usr_demo_owner', '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('mbr_demo_viewer',     'biz_demo', 'usr_demo_viewer',     'VIEWER',     'usr_demo_owner', '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z');

-- =============================================================================
-- NOTIFICATION PREFERENCES
-- =============================================================================

INSERT INTO notification_preferences (id, user_id, email_on_submitted, email_on_validated, email_on_rejected, email_on_cancelled, email_on_team_invite, created_at, updated_at) VALUES
  ('notpref_01', 'usr_01_owner',  1, 1, 1, 0, 1, '2025-01-10T08:05:00Z', '2025-01-10T08:05:00Z'),
  ('notpref_02', 'usr_02_admin',  1, 1, 1, 1, 1, '2025-01-11T09:05:00Z', '2025-01-11T09:05:00Z'),
  ('notpref_03', 'usr_03_viewer', 0, 1, 1, 0, 1, '2025-02-01T10:05:00Z', '2025-02-01T10:05:00Z'),
  ('notpref_04', 'usr_04_owner2', 1, 1, 1, 0, 1, '2025-01-15T08:35:00Z', '2025-01-15T08:35:00Z'),
  ('notpref_demo_owner',      'usr_demo_owner',      1, 1, 1, 0, 1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('notpref_demo_admin',      'usr_demo_admin',      1, 1, 1, 0, 1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('notpref_demo_accountant', 'usr_demo_accountant', 1, 1, 1, 0, 1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z'),
  ('notpref_demo_viewer',     'usr_demo_viewer',     0, 1, 1, 0, 1, '2025-01-01T08:00:00Z', '2025-01-01T08:00:00Z');

-- =============================================================================
-- INVOICES  (various statuses to cover the full flow)
-- =============================================================================

-- 1. DRAFT — manually created, no buyer details yet
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date, created_at, updated_at
) VALUES (
  'inv_01_draft', 'biz_01_techventure',
  'INV-2025-001', '01', 'DRAFT',
  'TechVenture Sdn Bhd', 'C12345678910', '202301012345',
  NULL, NULL, NULL, NULL, 'MYS',
  'MYR', '0.00', '0.00', '0.00',
  '2025-02-01', '2025-02-01T10:00:00Z', '2025-02-01T10:00:00Z'
);

-- 2. REVIEW_REQUIRED — OCR completed but confidence too low
INSERT INTO invoices (
  id, business_id, ocr_document_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email, buyer_phone,
  buyer_address_line0, buyer_city_name, buyer_state_code, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date, created_at, updated_at
) VALUES (
  'inv_02_review', 'biz_01_techventure', 'ocrdoc_01',
  'INV-2025-002', '01', 'REVIEW_REQUIRED',
  'TechVenture Sdn Bhd', 'C12345678910', '202301012345',
  'Nexus Digital Sdn Bhd', 'C11223344556', '201901023456',
  'procurement@nexusdigital.my', '+60312223333',
  'Level 8, Wisma Nexus, Jalan Semarak', 'Kuala Lumpur', '14', 'MYS',
  'MYR', '4500.00', '270.00', '4770.00',
  '2025-02-05', '2025-02-05T11:30:00Z', '2025-02-05T14:00:00Z'
);

-- 3. READY_FOR_SUBMISSION — OCR passed, awaiting user submit
INSERT INTO invoices (
  id, business_id, ocr_document_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email,
  buyer_address_line0, buyer_city_name, buyer_state_code, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date, due_date, created_at, updated_at
) VALUES (
  'inv_03_ready', 'biz_01_techventure', 'ocrdoc_02',
  'INV-2025-003', '01', 'READY_FOR_SUBMISSION',
  'TechVenture Sdn Bhd', 'C12345678910', '202301012345',
  'Syarikat Pembinaan Mulia Sdn Bhd', 'C55443322110', '200801055443',
  'finance@spmulia.my',
  'No 22, Jalan PJS 5/28, Petaling Jaya', 'Petaling Jaya', '10', 'MYS',
  'MYR', '12000.00', '720.00', '12720.00',
  '2025-02-10', '2025-03-10', '2025-02-10T09:00:00Z', '2025-02-10T09:45:00Z'
);

-- 4. SUBMITTED — sent to LHDN, pending validation
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email,
  buyer_address_line0, buyer_city_name, buyer_state_code, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date, due_date,
  lhdn_submission_uid, lhdn_submitted_at,
  created_at, updated_at
) VALUES (
  'inv_04_submitted', 'biz_01_techventure',
  'INV-2025-004', '01', 'SUBMITTED',
  'TechVenture Sdn Bhd', 'C12345678910', '202301012345',
  'Konsortium Teknologi Bersepadu Sdn Bhd', 'C66778899001', '199901066778',
  'ap@ktbsb.my',
  'Suite 3A-1, Menara TA One, Jalan P. Ramlee', 'Kuala Lumpur', '14', 'MYS',
  'MYR', '8750.00', '525.00', '9275.00',
  '2025-02-12', '2025-03-12',
  'SUB-20250212-ABCD1234', '2025-02-12T16:00:00Z',
  '2025-02-12T14:00:00Z', '2025-02-12T16:01:00Z'
);

-- 5. VALIDATED — accepted by LHDN
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email,
  buyer_address_line0, buyer_city_name, buyer_state_code, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date, due_date,
  lhdn_uuid, lhdn_submission_uid, lhdn_validation_status, lhdn_submitted_at, lhdn_validated_at,
  created_at, updated_at
) VALUES (
  'inv_05_validated', 'biz_01_techventure',
  'INV-2025-005', '01', 'VALIDATED',
  'TechVenture Sdn Bhd', 'C12345678910', '202301012345',
  'Petronas Trading Corp Sdn Bhd', 'C10293847560', '200101010293',
  'einvoice@ptcsb.my',
  'Tower 1, PETRONAS Twin Towers, KLCC', 'Kuala Lumpur', '14', 'MYS',
  'MYR', '25000.00', '1500.00', '26500.00',
  '2025-01-20', '2025-02-20',
  'DOC-UUID-LHDN-00000001', 'SUB-20250120-EFGH5678', 'Valid',
  '2025-01-20T11:00:00Z', '2025-01-20T11:45:00Z',
  '2025-01-20T10:00:00Z', '2025-01-20T11:46:00Z'
);

-- 6. REJECTED — rejected by LHDN
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email,
  buyer_address_line0, buyer_city_name, buyer_state_code, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date,
  lhdn_uuid, lhdn_submission_uid, lhdn_validation_status, lhdn_submitted_at,
  created_at, updated_at
) VALUES (
  'inv_06_rejected', 'biz_01_techventure',
  'INV-2025-006', '01', 'REJECTED',
  'TechVenture Sdn Bhd', 'C12345678910', '202301012345',
  'Agensi Inovatif Bestari Sdn Bhd', 'C19283746550', '201601019283',
  'billing@aibestari.my',
  'A-3-10, Kompleks Pejabat Damansara', 'Petaling Jaya', '10', 'MYS',
  'MYR', '3200.00', '192.00', '3392.00',
  '2025-02-08',
  'DOC-UUID-LHDN-00000002', 'SUB-20250208-IJKL9012', 'Invalid',
  '2025-02-08T14:30:00Z',
  '2025-02-08T13:00:00Z', '2025-02-08T15:00:00Z'
);

-- 7. CANCELLED
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email,
  buyer_country_code, currency_code, subtotal, tax_total, grand_total,
  issue_date, created_at, updated_at
) VALUES (
  'inv_07_cancelled', 'biz_01_techventure',
  'INV-2025-007', '01', 'CANCELLED',
  'TechVenture Sdn Bhd', 'C12345678910', '202301012345',
  'Impian Maju Enterprise', 'C30405060700', '202001030405',
  'info@impianmaju.my',
  'MYS', 'MYR', '1500.00', '90.00', '1590.00',
  '2025-01-25', '2025-01-25T09:00:00Z', '2025-01-28T11:00:00Z'
);

-- 8. GlobalLogistic — VALIDATED invoice (different business)
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email,
  buyer_address_line0, buyer_city_name, buyer_state_code, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date, due_date,
  lhdn_uuid, lhdn_submission_uid, lhdn_validation_status, lhdn_submitted_at, lhdn_validated_at,
  created_at, updated_at
) VALUES (
  'inv_08_gls_validated', 'biz_02_globallogistic',
  'GLS-2025-001', '01', 'VALIDATED',
  'Global Logistic Services Sdn Bhd', 'C98765432100', '202001098765',
  'Maju Industri Sdn Bhd', 'C12309876540', '199501012309',
  'purchasing@majuindustri.my',
  'Lot 12, Jalan Industri 3, Kawasan Industri Prai', 'Prai', '07', 'MYS',
  'MYR', '18500.00', '0.00', '18500.00',
  '2025-02-01', '2025-03-01',
  'DOC-UUID-LHDN-00000003', 'SUB-20250201-MNOP3456', 'Valid',
  '2025-02-01T10:00:00Z', '2025-02-01T10:30:00Z',
  '2025-02-01T09:00:00Z', '2025-02-01T10:31:00Z'
);

-- =============================================================================
-- INVOICE ITEMS
-- =============================================================================

-- inv_02_review items
INSERT INTO invoice_items (id, invoice_id, description, classification_code, quantity, unit_code, unit_price, subtotal, tax_type, tax_rate, tax_amount, total, sort_order, created_at) VALUES
  ('item_02_1', 'inv_02_review', 'Software Development Services',   '022', '30', 'HUR', '150.00', '4500.00', '01', '6', '270.00', '4770.00', 0, '2025-02-05T14:00:00Z');

-- inv_03_ready items
INSERT INTO invoice_items (id, invoice_id, description, classification_code, quantity, unit_code, unit_price, subtotal, tax_type, tax_rate, tax_amount, total, sort_order, created_at) VALUES
  ('item_03_1', 'inv_03_ready', 'Web Application Development',      '022', '1', 'EA', '10000.00', '10000.00', '01', '6', '600.00', '10600.00', 0, '2025-02-10T09:45:00Z'),
  ('item_03_2', 'inv_03_ready', 'UI/UX Design Services',            '022', '1', 'EA',  '2000.00',  '2000.00', '01', '6', '120.00',  '2120.00', 1, '2025-02-10T09:45:00Z');

-- inv_04_submitted items
INSERT INTO invoice_items (id, invoice_id, description, classification_code, quantity, unit_code, unit_price, subtotal, tax_type, tax_rate, tax_amount, total, sort_order, created_at) VALUES
  ('item_04_1', 'inv_04_submitted', 'System Integration Consulting', '022', '25', 'HUR', '250.00', '6250.00', '01', '6', '375.00', '6625.00', 0, '2025-02-12T16:01:00Z'),
  ('item_04_2', 'inv_04_submitted', 'Technical Documentation',       '022', '10', 'HUR', '250.00', '2500.00', '01', '6', '150.00', '2650.00', 1, '2025-02-12T16:01:00Z');

-- inv_05_validated items
INSERT INTO invoice_items (id, invoice_id, description, classification_code, quantity, unit_code, unit_price, subtotal, tax_type, tax_rate, tax_amount, total, sort_order, created_at) VALUES
  ('item_05_1', 'inv_05_validated', 'Enterprise Software License (Annual)', '022', '1',  'EA', '20000.00', '20000.00', '01', '6', '1200.00', '21200.00', 0, '2025-01-20T11:46:00Z'),
  ('item_05_2', 'inv_05_validated', 'Implementation & Training',            '022', '20', 'HUR',   '250.00',  '5000.00', '01', '6',  '300.00',  '5300.00', 1, '2025-01-20T11:46:00Z');

-- inv_06_rejected items
INSERT INTO invoice_items (id, invoice_id, description, classification_code, quantity, unit_code, unit_price, subtotal, tax_type, tax_rate, tax_amount, total, sort_order, created_at) VALUES
  ('item_06_1', 'inv_06_rejected', 'IT Support Services (Monthly)',  '022', '1', 'MON', '3200.00', '3200.00', '01', '6', '192.00', '3392.00', 0, '2025-02-08T15:00:00Z');

-- inv_07_cancelled items
INSERT INTO invoice_items (id, invoice_id, description, classification_code, quantity, unit_code, unit_price, subtotal, tax_type, tax_rate, tax_amount, total, sort_order, created_at) VALUES
  ('item_07_1', 'inv_07_cancelled', 'Cloud Hosting Services (3 months)', '022', '3', 'MON', '500.00', '1500.00', '01', '6', '90.00', '1590.00', 0, '2025-01-28T11:00:00Z');

-- inv_08_gls_validated items (freight — zero-rated GST/SST exempt)
INSERT INTO invoice_items (id, invoice_id, description, classification_code, quantity, unit_code, unit_price, subtotal, tax_type, tax_rate, tax_amount, total, sort_order, created_at) VALUES
  ('item_08_1', 'inv_08_gls_validated', 'Freight Forwarding — Port Klang to Prai', '004', '5', 'EA', '2500.00', '12500.00', 'E', '0', '0.00', '12500.00', 0, '2025-02-01T10:31:00Z'),
  ('item_08_2', 'inv_08_gls_validated', 'Customs Clearance Services',               '004', '5', 'EA', '1200.00',  '6000.00', 'E', '0', '0.00',  '6000.00', 1, '2025-02-01T10:31:00Z');

-- =============================================================================
-- OCR DOCUMENTS
-- =============================================================================

INSERT INTO ocr_documents (
  id, invoice_id, user_id, business_id,
  r2_key, original_filename, file_type, file_size, ocr_status,
  confidence_score, processed_at, created_at, updated_at
) VALUES
  (
    'ocrdoc_01', 'inv_02_review', 'usr_01_owner', 'biz_01_techventure',
    'uploads/biz_01_techventure/ocr/invoice_scan_001.pdf',
    'invoice_scan_001.pdf', 'application/pdf', 245678, 'COMPLETED',
    '0.71', '2025-02-05T13:55:00Z', '2025-02-05T11:30:00Z', '2025-02-05T14:00:00Z'
  ),
  (
    'ocrdoc_02', 'inv_03_ready', 'usr_02_admin', 'biz_01_techventure',
    'uploads/biz_01_techventure/ocr/inv_mulia_feb2025.pdf',
    'inv_mulia_feb2025.pdf', 'application/pdf', 189340, 'COMPLETED',
    '0.88', '2025-02-10T09:40:00Z', '2025-02-10T09:00:00Z', '2025-02-10T09:45:00Z'
  );

-- =============================================================================
-- LHDN SUBMISSIONS
-- =============================================================================

INSERT INTO lhdn_submissions (
  id, invoice_id, business_id, submission_uid, document_uuid,
  submission_payload, response_payload, status,
  submitted_at, validated_at, created_at
) VALUES
  (
    'sub_01', 'inv_04_submitted', 'biz_01_techventure',
    'SUB-20250212-ABCD1234', NULL,
    '{"invoiceTypeCode":"01","invoiceDate":"2025-02-12"}',
    '{"submissionUid":"SUB-20250212-ABCD1234","status":"InProgress"}',
    'PENDING',
    '2025-02-12T16:00:00Z', NULL, '2025-02-12T16:00:00Z'
  ),
  (
    'sub_02', 'inv_05_validated', 'biz_01_techventure',
    'SUB-20250120-EFGH5678', 'DOC-UUID-LHDN-00000001',
    '{"invoiceTypeCode":"01","invoiceDate":"2025-01-20"}',
    '{"submissionUid":"SUB-20250120-EFGH5678","documentSummary":[{"uuid":"DOC-UUID-LHDN-00000001","status":"Valid"}]}',
    'VALIDATED',
    '2025-01-20T11:00:00Z', '2025-01-20T11:45:00Z', '2025-01-20T11:00:00Z'
  ),
  (
    'sub_03', 'inv_06_rejected', 'biz_01_techventure',
    'SUB-20250208-IJKL9012', 'DOC-UUID-LHDN-00000002',
    '{"invoiceTypeCode":"01","invoiceDate":"2025-02-08"}',
    '{"submissionUid":"SUB-20250208-IJKL9012","documentSummary":[{"uuid":"DOC-UUID-LHDN-00000002","status":"Invalid","errors":["Buyer TIN not found in LHDN registry"]}]}',
    'REJECTED',
    '2025-02-08T14:30:00Z', NULL, '2025-02-08T14:30:00Z'
  ),
  (
    'sub_04', 'inv_08_gls_validated', 'biz_02_globallogistic',
    'SUB-20250201-MNOP3456', 'DOC-UUID-LHDN-00000003',
    '{"invoiceTypeCode":"01","invoiceDate":"2025-02-01"}',
    '{"submissionUid":"SUB-20250201-MNOP3456","documentSummary":[{"uuid":"DOC-UUID-LHDN-00000003","status":"Valid"}]}',
    'VALIDATED',
    '2025-02-01T10:00:00Z', '2025-02-01T10:30:00Z', '2025-02-01T10:00:00Z'
  );

-- =============================================================================
-- AUDIT LOGS  (sample entries)
-- =============================================================================

INSERT INTO audit_logs (id, user_id, business_id, invoice_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at) VALUES
  ('alog_01', 'usr_01_owner',  'biz_01_techventure', NULL,                 'CREATE', 'BUSINESS', 'biz_01_techventure', NULL, NULL, '127.0.0.1', '2025-01-10T08:05:00Z'),
  ('alog_02', 'usr_01_owner',  'biz_01_techventure', 'inv_05_validated',   'CREATE', 'INVOICE',  'inv_05_validated',   NULL, '{"status":"DRAFT"}', '127.0.0.1', '2025-01-20T10:00:00Z'),
  ('alog_03', 'usr_01_owner',  'biz_01_techventure', 'inv_05_validated',   'SUBMIT', 'INVOICE',  'inv_05_validated',   '{"status":"READY_FOR_SUBMISSION"}', '{"status":"SUBMITTED"}', '127.0.0.1', '2025-01-20T11:00:00Z'),
  ('alog_04', NULL,            'biz_01_techventure', 'inv_05_validated',   'VALIDATE', 'INVOICE', 'inv_05_validated',  '{"status":"SUBMITTED"}', '{"status":"VALIDATED"}', NULL, '2025-01-20T11:45:00Z'),
  ('alog_05', 'usr_02_admin',  'biz_01_techventure', 'inv_06_rejected',    'SUBMIT', 'INVOICE',  'inv_06_rejected',    '{"status":"READY_FOR_SUBMISSION"}', '{"status":"SUBMITTED"}', '127.0.0.1', '2025-02-08T14:30:00Z'),
  ('alog_06', NULL,            'biz_01_techventure', 'inv_06_rejected',    'REJECT', 'INVOICE',  'inv_06_rejected',    '{"status":"SUBMITTED"}', '{"status":"REJECTED"}', NULL, '2025-02-08T15:00:00Z'),
  ('alog_07', 'usr_01_owner',  'biz_01_techventure', 'inv_07_cancelled',   'CANCEL', 'INVOICE',  'inv_07_cancelled',   '{"status":"DRAFT"}', '{"status":"CANCELLED"}', '127.0.0.1', '2025-01-28T11:00:00Z');

-- =============================================================================
-- DEMO BUSINESS INVOICES  (for role-testing with demo users)
-- =============================================================================

-- 1. DRAFT
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_country_code, currency_code, subtotal, tax_total, grand_total,
  issue_date, created_at, updated_at
) VALUES (
  'inv_demo_01', 'biz_demo', 'DEMO-001', '01', 'DRAFT',
  'Demo Company Sdn Bhd', 'C00000000001', '202500000001',
  'MYS', 'MYR', '0.00', '0.00', '0.00',
  '2025-02-01', '2025-02-01T10:00:00Z', '2025-02-01T10:00:00Z'
);

-- 2. VALIDATED
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date, due_date,
  lhdn_uuid, lhdn_submission_uid, lhdn_validation_status, lhdn_submitted_at, lhdn_validated_at,
  created_at, updated_at
) VALUES (
  'inv_demo_02', 'biz_demo', 'DEMO-002', '01', 'VALIDATED',
  'Demo Company Sdn Bhd', 'C00000000001', '202500000001',
  'Demo Buyer Sdn Bhd', 'C11111111111', '202200011111', 'buyer@demo.com', 'MYS',
  'MYR', '1000.00', '60.00', '1060.00',
  '2025-01-15', '2025-02-15',
  'DOC-UUID-DEMO-0001', 'SUB-DEMO-20250115-0001', 'Valid',
  '2025-01-15T12:00:00Z', '2025-01-15T12:30:00Z',
  '2025-01-15T10:00:00Z', '2025-01-15T12:31:00Z'
);

-- 3. REJECTED
INSERT INTO invoices (
  id, business_id, invoice_number, invoice_type, status,
  supplier_name, supplier_tin, supplier_registration,
  buyer_name, buyer_tin, buyer_registration_number, buyer_email, buyer_country_code,
  currency_code, subtotal, tax_total, grand_total,
  issue_date,
  lhdn_uuid, lhdn_submission_uid, lhdn_validation_status, lhdn_submitted_at,
  created_at, updated_at
) VALUES (
  'inv_demo_03', 'biz_demo', 'DEMO-003', '01', 'REJECTED',
  'Demo Company Sdn Bhd', 'C00000000001', '202500000001',
  'Another Buyer Sdn Bhd', 'C22222222222', '202300022222', 'buyer2@demo.com', 'MYS',
  'MYR', '500.00', '30.00', '530.00',
  '2025-01-20',
  'DOC-UUID-DEMO-0002', 'SUB-DEMO-20250120-0002', 'Invalid',
  '2025-01-20T14:00:00Z',
  '2025-01-20T13:00:00Z', '2025-01-20T14:30:00Z'
);

-- Demo invoice items
INSERT INTO invoice_items (id, invoice_id, description, classification_code, quantity, unit_code, unit_price, subtotal, tax_type, tax_rate, tax_amount, total, sort_order, created_at) VALUES
  ('item_demo_02_1', 'inv_demo_02', 'Professional Services', '022', '10', 'HUR', '100.00', '1000.00', '01', '6', '60.00', '1060.00', 0, '2025-01-15T12:31:00Z'),
  ('item_demo_03_1', 'inv_demo_03', 'Consulting Fee',        '022', '5',  'HUR', '100.00',  '500.00', '01', '6', '30.00',  '530.00', 0, '2025-01-20T14:30:00Z');
