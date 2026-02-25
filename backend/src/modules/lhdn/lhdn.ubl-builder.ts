import type { Invoice, InvoiceItem, Business } from '../../db/schema/index.js';
import { sha256Base64 } from '../../utils/hash.js';

interface UblDocument {
  _D: string;
  _A: string;
  _B: string;
  Invoice: [UblInvoice];
}

interface UblInvoice {
  ID: [{ _: string }];
  IssueDate: [{ _: string }];
  IssueTime: [{ _: string }];
  InvoiceTypeCode: [{ _: string; listVersionID: string }];
  DocumentCurrencyCode: [{ _: string }];
  InvoicePeriod?: [{ Description: [{ _: string }] }];
  AccountingSupplierParty: [UblParty];
  AccountingCustomerParty: [UblParty];
  InvoiceLine: UblInvoiceLine[];
  TaxTotal: [UblTaxTotal];
  LegalMonetaryTotal: [UblMonetaryTotal];
}

interface UblParty {
  Party: [
    {
      PartyIdentification: [{ ID: [{ _: string; schemeID: string }] }];
      PartyName: [{ Name: [{ _: string }] }];
      PostalAddress: [{ CityName?: [{ _: string }]; Country: [{ IdentificationCode: [{ _: string }] }] }];
      PartyTaxScheme: [{ CompanyID: [{ _: string }]; TaxScheme: [{ ID: [{ _: string }] }] }];
      PartyLegalEntity: [{ RegistrationName: [{ _: string }] }];
      Contact?: [{ ElectronicMail?: [{ _: string }]; Telephone?: [{ _: string }] }];
    },
  ];
}

interface UblInvoiceLine {
  ID: [{ _: string }];
  InvoicedQuantity: [{ _: number; unitCode: string }];
  LineExtensionAmount: [{ _: number; currencyID: string }];
  Item: [{ Description: [{ _: string }]; CommodityClassification: [{ ItemClassificationCode: [{ _: string; listID: string }] }] }];
  Price: [{ PriceAmount: [{ _: number; currencyID: string }] }];
  TaxTotal: [{ TaxAmount: [{ _: number; currencyID: string }]; TaxSubtotal: [{ TaxableAmount: [{ _: number; currencyID: string }]; TaxAmount: [{ _: number; currencyID: string }]; TaxCategory: [{ ID: [{ _: string }]; TaxScheme: [{ ID: [{ _: string }] }] }] }] }];
}

interface UblTaxTotal {
  TaxAmount: [{ _: number; currencyID: string }];
  TaxSubtotal: [{ TaxableAmount: [{ _: number; currencyID: string }]; TaxAmount: [{ _: number; currencyID: string }]; TaxCategory: [{ ID: [{ _: string }]; TaxScheme: [{ ID: [{ _: string }] }] }] }];
}

interface UblMonetaryTotal {
  LineExtensionAmount: [{ _: number; currencyID: string }];
  TaxExclusiveAmount: [{ _: number; currencyID: string }];
  TaxInclusiveAmount: [{ _: number; currencyID: string }];
  PayableAmount: [{ _: number; currencyID: string }];
}

function buildParty(
  name: string,
  tin: string,
  registration: string,
  countryCode: string,
  cityName?: string | null,
  email?: string | null,
  phone?: string | null,
): UblParty {
  return {
    Party: [
      {
        PartyIdentification: [{ ID: [{ _: tin, schemeID: 'TIN' }] }],
        PartyName: [{ Name: [{ _: name }] }],
        PostalAddress: [
          {
            ...(cityName ? { CityName: [{ _: cityName }] } : {}),
            Country: [{ IdentificationCode: [{ _: countryCode }] }],
          },
        ],
        PartyTaxScheme: [{ CompanyID: [{ _: tin }], TaxScheme: [{ ID: [{ _: 'OTH' }] }] }],
        PartyLegalEntity: [{ RegistrationName: [{ _: registration }] }],
        ...(email || phone
          ? {
              Contact: [
                {
                  ...(email ? { ElectronicMail: [{ _: email }] } : {}),
                  ...(phone ? { Telephone: [{ _: phone }] } : {}),
                },
              ],
            }
          : {}),
      },
    ],
  };
}

export async function buildUblDocument(
  invoice: Invoice,
  items: InvoiceItem[],
  business: Business,
): Promise<{ document: UblDocument; documentHash: string }> {
  const currency = invoice.currencyCode;
  const issueDate = invoice.issueDate ?? new Date().toISOString().split('T')[0];
  const issueTime = '00:00:00Z';

  const invoiceLines: UblInvoiceLine[] = items.map((item, idx) => ({
    ID: [{ _: String(idx + 1) }],
    InvoicedQuantity: [{ _: parseFloat(item.quantity), unitCode: item.unitCode }],
    LineExtensionAmount: [{ _: parseFloat(item.subtotal), currencyID: currency }],
    Item: [
      {
        Description: [{ _: item.description }],
        CommodityClassification: [
          {
            ItemClassificationCode: [
              { _: item.classificationCode, listID: 'CLASS' },
            ],
          },
        ],
      },
    ],
    Price: [{ PriceAmount: [{ _: parseFloat(item.unitPrice), currencyID: currency }] }],
    TaxTotal: [
      {
        TaxAmount: [{ _: parseFloat(item.taxAmount), currencyID: currency }],
        TaxSubtotal: [
          {
            TaxableAmount: [{ _: parseFloat(item.subtotal), currencyID: currency }],
            TaxAmount: [{ _: parseFloat(item.taxAmount), currencyID: currency }],
            TaxCategory: [
              { ID: [{ _: item.taxType }], TaxScheme: [{ ID: [{ _: 'OTH' }] }] },
            ],
          },
        ],
      },
    ],
  }));

  const supplierParty = buildParty(
    invoice.supplierName ?? business.name,
    invoice.supplierTin ?? business.tin,
    invoice.supplierRegistration ?? business.registrationNumber,
    business.countryCode,
    business.cityName,
    business.email,
    business.phone,
  );

  const buyerParty = buildParty(
    invoice.buyerName ?? '',
    invoice.buyerTin ?? '',
    invoice.buyerRegistrationNumber ?? '',
    invoice.buyerCountryCode,
    invoice.buyerCityName,
    invoice.buyerEmail,
    invoice.buyerPhone,
  );

  const document: UblDocument = {
    _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    _B: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    Invoice: [
      {
        ID: [{ _: invoice.invoiceNumber ?? '' }],
        IssueDate: [{ _: issueDate }],
        IssueTime: [{ _: issueTime }],
        InvoiceTypeCode: [{ _: invoice.invoiceType, listVersionID: '1.1' }],
        DocumentCurrencyCode: [{ _: currency }],
        AccountingSupplierParty: [supplierParty],
        AccountingCustomerParty: [buyerParty],
        InvoiceLine: invoiceLines,
        TaxTotal: [
          {
            TaxAmount: [{ _: parseFloat(invoice.taxTotal), currencyID: currency }],
            TaxSubtotal: [
              {
                TaxableAmount: [{ _: parseFloat(invoice.subtotal), currencyID: currency }],
                TaxAmount: [{ _: parseFloat(invoice.taxTotal), currencyID: currency }],
                TaxCategory: [{ ID: [{ _: 'NA' }], TaxScheme: [{ ID: [{ _: 'OTH' }] }] }],
              },
            ],
          },
        ],
        LegalMonetaryTotal: [
          {
            LineExtensionAmount: [{ _: parseFloat(invoice.subtotal), currencyID: currency }],
            TaxExclusiveAmount: [{ _: parseFloat(invoice.subtotal), currencyID: currency }],
            TaxInclusiveAmount: [{ _: parseFloat(invoice.grandTotal), currencyID: currency }],
            PayableAmount: [{ _: parseFloat(invoice.grandTotal), currencyID: currency }],
          },
        ],
      },
    ],
  };

  const documentJson = JSON.stringify(document);
  const documentHash = await sha256Base64(documentJson);

  return { document, documentHash };
}
