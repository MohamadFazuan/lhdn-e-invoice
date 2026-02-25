// ── Standard envelope ──────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, string[]> };
  meta?: { page?: number; limit?: number; total?: number };
}

// ── Auth ───────────────────────────────────────────────────────────────────
export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// ── Business ───────────────────────────────────────────────────────────────
export interface Business {
  id: string;
  userId: string;
  name: string;
  tin: string;
  registrationNumber: string;
  msicCode: string;
  sstRegistration?: string | null;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  state?: string | null;
  country: string;
  hasLhdnCredentials: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Team ───────────────────────────────────────────────────────────────────
export type MemberRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
export type MemberStatus = 'ACTIVE' | 'PENDING';

export interface TeamMember {
  id: string;
  businessId: string;
  userId?: string;
  email?: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt?: string;
  invitedAt: string;
  createdAt: string;
}

// ── Invoice ────────────────────────────────────────────────────────────────
export type InvoiceStatus =
  | 'DRAFT'
  | 'OCR_PROCESSING'
  | 'REVIEW_REQUIRED'
  | 'READY_FOR_SUBMISSION'
  | 'SUBMITTED'
  | 'VALIDATED'
  | 'REJECTED'
  | 'CANCELLED';

export type InvoiceType = '01' | '02' | '03' | '04';

export interface Invoice {
  id: string;
  businessId: string;
  status: InvoiceStatus;
  invoiceType: InvoiceType;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currencyCode: string;
  supplierName?: string;
  supplierTin?: string;
  supplierRegistration?: string;
  buyerName?: string;
  buyerTin?: string;
  buyerRegistrationNumber?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddressLine1?: string;
  buyerCity?: string;
  buyerPostcode?: string;
  buyerState?: string;
  buyerCountry?: string;
  subtotal?: string;
  taxTotal?: string;
  grandTotal?: string;
  notes?: string;
  lhdnUuid?: string;
  lhdnSubmittedAt?: string;
  lhdnValidatedAt?: string;
  lhdnRejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  classificationCode: string;
  quantity: string;
  unitCode: string;
  unitPrice: string;
  subtotal: string;
  taxType: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  sortOrder: number;
}

// ── Analytics ──────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  totalInvoices: number;
  validated: number;
  pendingReview: number;
  submitted: number;
  rejected: number;
  revenueThisMonth: string;
}

export interface RevenueDataPoint {
  period: string;
  revenue: string;
  count: number;
}

export interface RejectionRate {
  from: string;
  to: string;
  totalSubmitted: number;
  rejected: number;
  rate: string;
}

export interface TopBuyer {
  buyerName: string;
  invoiceCount: number;
  totalRevenue: string;
}

export interface InvoiceVolumeByType {
  invoiceType: string;
  count: number;
}

// ── Notifications ──────────────────────────────────────────────────────────
export interface NotificationPreferences {
  id: string;
  userId: string;
  businessId: string;
  emailOnSubmit: boolean;
  emailOnValidated: boolean;
  emailOnRejected: boolean;
  emailOnCancelled: boolean;
  emailOnTeamInvite: boolean;
}

export interface NotificationLog {
  id: string;
  event: string;
  recipientEmail: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  sentAt?: string;
  error?: string;
  createdAt: string;
}

// ── Bulk Import ────────────────────────────────────────────────────────────
export type BulkImportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type BulkImportSource = 'CSV' | 'DOCUMENTS';

export interface BulkImport {
  id: string;
  businessId: string;
  r2Key: string;
  originalFilename: string;
  source: BulkImportSource;
  status: BulkImportStatus;
  totalRows?: number;
  successCount?: number;
  errorCount?: number;
  errorSummary?: string;
  createdInvoiceIds?: string;
  processingError?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionOcrDocument {
  id: string;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  confidenceScore?: string | null;
  processingError?: string | null;
  originalFilename: string;
}

export interface SessionInvoice {
  invoice: Invoice;
  ocrDocument: SessionOcrDocument | null;
}

export interface SessionStats {
  total: number;
  ready: number;
  reviewing: number;
  processing: number;
  failed: number;
}

export interface BulkSessionResponse {
  session: BulkImport;
  invoices: SessionInvoice[];
  stats: SessionStats;
}

export interface BulkSubmitResult {
  invoiceId: string;
  success: boolean;
  submissionUid?: string;
  error?: string;
}

export interface BulkSubmitResponse {
  submitted: number;
  failed: number;
  total: number;
  results: BulkSubmitResult[];
}

// ── Buyer Portal ───────────────────────────────────────────────────────────
export interface PortalReceipt {
  invoice: Invoice;
  items: InvoiceItem[];
  business: {
    name: string;
    tin: string;
    address: string;
  };
}

// ── Files ──────────────────────────────────────────────────────────────────
export interface PresignedUrl {
  url: string;
  r2Key: string;
}
