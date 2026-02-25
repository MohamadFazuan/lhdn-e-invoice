import type { IInvoiceRepository } from './invoice.repository.interface.js';
import type { InvoiceItemRepository } from './invoice-item.repository.js';
import type { CreateInvoiceDto, UpdateInvoiceDto, ListInvoicesQueryDto } from './invoice.dto.js';
import type { Invoice, InvoiceItem } from '../../db/schema/index.js';
import { computeTotalsFromDtos, validateInvoiceTotals } from './invoice-totals.validator.js';
import { newId } from '../../utils/uuid.js';
import { nowISO } from '../../utils/date.js';
import { AppError } from '../../errors/app-error.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeItemTotals(item: {
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxType: string;
}) {
  const qty = parseFloat(item.quantity);
  const unitPrice = parseFloat(item.unitPrice);
  const itemSubtotal = round2(qty * unitPrice);
  const taxRate = parseFloat(item.taxRate) / 100;
  const taxAmount =
    item.taxType === 'NA' || item.taxType === 'E' ? 0 : round2(itemSubtotal * taxRate);
  return {
    subtotal: itemSubtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: round2(itemSubtotal + taxAmount).toFixed(2),
  };
}

export class InvoiceService {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly itemRepo: InvoiceItemRepository,
  ) {}

  async list(businessId: string, query: ListInvoicesQueryDto) {
    const offset = (query.page - 1) * query.limit;
    const { invoices: rows, total } = await this.invoiceRepo.findByBusinessId(businessId, {
      status: query.status,
      limit: query.limit,
      offset,
    });
    return {
      invoices: rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getById(id: string, businessId: string) {
    const invoice = await this._getOwnedInvoice(id, businessId);
    const items = await this.itemRepo.findByInvoiceId(id);
    return { invoice, items };
  }

  async create(businessId: string, dto: CreateInvoiceDto) {
    const totals = computeTotalsFromDtos(dto.items);
    const now = nowISO();
    const invoiceId = newId();

    const invoice = await this.invoiceRepo.create({
      id: invoiceId,
      businessId,
      ocrDocumentId: null,
      invoiceNumber: dto.invoiceNumber ?? null,
      invoiceType: dto.invoiceType,
      status: 'DRAFT',
      supplierName: dto.supplierName ?? null,
      supplierTin: dto.supplierTin ?? null,
      supplierRegistration: dto.supplierRegistration ?? null,
      buyerName: dto.buyerName ?? null,
      buyerTin: dto.buyerTin ?? null,
      buyerRegistrationNumber: dto.buyerRegistrationNumber ?? null,
      buyerSstNumber: dto.buyerSstNumber ?? null,
      buyerEmail: dto.buyerEmail ?? null,
      buyerPhone: dto.buyerPhone ?? null,
      buyerAddressLine0: dto.buyerAddressLine0 ?? null,
      buyerAddressLine1: dto.buyerAddressLine1 ?? null,
      buyerCityName: dto.buyerCityName ?? null,
      buyerStateCode: dto.buyerStateCode ?? null,
      buyerCountryCode: dto.buyerCountryCode,
      currencyCode: dto.currencyCode,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      issueDate: dto.issueDate ?? null,
      dueDate: dto.dueDate ?? null,
      notes: dto.notes ?? null,
      lhdnUuid: null,
      lhdnSubmissionUid: null,
      lhdnValidationStatus: null,
      lhdnSubmittedAt: null,
      lhdnValidatedAt: null,
      pdfStorageKey: null,
      createdAt: now,
      updatedAt: now,
    });

    const items = dto.items.map((item, idx) => {
      const computed = computeItemTotals(item);
      return {
        id: newId(),
        invoiceId,
        description: item.description,
        classificationCode: item.classificationCode,
        quantity: item.quantity,
        unitCode: item.unitCode,
        unitPrice: item.unitPrice,
        subtotal: computed.subtotal,
        taxType: item.taxType,
        taxRate: item.taxRate,
        taxAmount: computed.taxAmount,
        total: computed.total,
        sortOrder: idx,
        createdAt: now,
      };
    });

    await this.itemRepo.replaceAll(invoiceId, items);
    return { invoice, items };
  }

  async update(id: string, businessId: string, dto: UpdateInvoiceDto) {
    const invoice = await this._getOwnedInvoice(id, businessId);
    if (!['DRAFT', 'REVIEW_REQUIRED'].includes(invoice.status)) {
      throw new AppError(409, 'INVOICE_NOT_EDITABLE', 'Only DRAFT or REVIEW_REQUIRED invoices can be edited');
    }

    const updateData: Partial<Invoice> = { updatedAt: nowISO() };
    const fields = [
      'invoiceNumber', 'invoiceType', 'supplierName', 'supplierTin', 'supplierRegistration',
      'buyerName', 'buyerTin', 'buyerRegistrationNumber', 'buyerSstNumber', 'buyerEmail',
      'buyerPhone', 'buyerAddressLine0', 'buyerAddressLine1', 'buyerCityName', 'buyerStateCode',
      'buyerCountryCode', 'currencyCode', 'issueDate', 'dueDate', 'notes',
    ] as const;

    for (const field of fields) {
      if (dto[field as keyof typeof dto] !== undefined) {
        (updateData as any)[field] = dto[field as keyof typeof dto];
      }
    }

    let items: InvoiceItem[] = await this.itemRepo.findByInvoiceId(id);

    if (dto.items) {
      const totals = computeTotalsFromDtos(dto.items);
      updateData.subtotal = totals.subtotal;
      updateData.taxTotal = totals.taxTotal;
      updateData.grandTotal = totals.grandTotal;

      const now = nowISO();
      const newItems = dto.items.map((item, idx) => {
        const computed = computeItemTotals(item);
        return {
          id: newId(),
          invoiceId: id,
          description: item.description,
          classificationCode: item.classificationCode,
          quantity: item.quantity,
          unitCode: item.unitCode,
          unitPrice: item.unitPrice,
          subtotal: computed.subtotal,
          taxType: item.taxType,
          taxRate: item.taxRate,
          taxAmount: computed.taxAmount,
          total: computed.total,
          sortOrder: idx,
          createdAt: now,
        };
      });
      await this.itemRepo.replaceAll(id, newItems);
      items = newItems as unknown as InvoiceItem[];
    }

    const updated = await this.invoiceRepo.update(id, updateData);
    return { invoice: updated, items };
  }

  async finalize(id: string, businessId: string) {
    const invoice = await this._getOwnedInvoice(id, businessId);

    if (!['DRAFT', 'REVIEW_REQUIRED'].includes(invoice.status)) {
      throw new AppError(409, 'INVALID_STATUS', 'Only DRAFT or REVIEW_REQUIRED invoices can be finalized');
    }

    // Validate required fields
    const missing: string[] = [];
    if (!invoice.invoiceNumber) missing.push('invoiceNumber');
    if (!invoice.issueDate) missing.push('issueDate');
    if (!invoice.supplierName) missing.push('supplierName');
    if (!invoice.supplierTin) missing.push('supplierTin');
    if (!invoice.buyerName) missing.push('buyerName');
    if (!invoice.buyerTin) missing.push('buyerTin');
    if (missing.length > 0) {
      throw new AppError(422, 'MISSING_REQUIRED_FIELDS', `Missing required fields: ${missing.join(', ')}`);
    }

    // Validate totals against line items
    const items = await this.itemRepo.findByInvoiceId(id);
    if (items.length === 0) {
      throw new AppError(422, 'NO_LINE_ITEMS', 'Invoice must have at least one line item');
    }

    const validation = validateInvoiceTotals(
      items,
      invoice.subtotal,
      invoice.taxTotal,
      invoice.grandTotal,
    );
    if (!validation.valid) {
      throw new AppError(422, 'INVALID_TOTALS', validation.errors.join('; '));
    }

    const updated = await this.invoiceRepo.update(id, {
      status: 'READY_FOR_SUBMISSION',
      updatedAt: nowISO(),
    });

    return { invoice: updated, items };
  }

  async delete(id: string, businessId: string) {
    const invoice = await this._getOwnedInvoice(id, businessId);
    if (!['DRAFT', 'REVIEW_REQUIRED'].includes(invoice.status)) {
      throw new AppError(409, 'INVOICE_NOT_DELETABLE', 'Only DRAFT or REVIEW_REQUIRED invoices can be deleted');
    }
    await this.invoiceRepo.delete(id);
  }

  private async _getOwnedInvoice(id: string, businessId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    if (invoice.businessId !== businessId) throw new AppError(403, 'FORBIDDEN', 'Access denied');
    return invoice;
  }
}
