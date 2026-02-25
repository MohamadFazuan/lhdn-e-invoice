# LHDN MyInvois Integration Guide

## Environments

| | Sandbox | Production |
|---|---|---|
| Portal | preprod.myinvois.hasil.gov.my | myinvois.hasil.gov.my |
| API Base | preprod-api.myinvois.hasil.gov.my | api.myinvois.hasil.gov.my |

Set `LHDN_ENV=sandbox` in `.dev.vars` for local development.

## Authentication (OAuth 2.0 Client Credentials)

```
POST /connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=<your_client_id>
&client_secret=<your_client_secret>
&scope=InvoicingAPI
```

Response:
```json
{
  "access_token": "eyJ...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Token is valid for **60 minutes**. The platform caches it in `lhdn_tokens` table (encrypted).
`getValidToken()` uses a 60-second pre-expiry buffer to prevent edge-case expiry during submission.

## Invoice Submission

```
POST /api/v1.0/documentsubmissions/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "documents": [
    {
      "format": "JSON",
      "documentHash": "<sha256-hex-of-minified-json>",
      "codeNumber": "<invoice_number>",
      "document": "<base64-encoded-minified-json>"
    }
  ]
}
```

Response (HTTP 202 — async):
```json
{
  "submissionUID": "26-char-alphanumeric",
  "acceptedDocuments": [
    { "codeNumber": "INV-001", "uuid": "document-uuid" }
  ],
  "rejectedDocuments": []
}
```

Store `submissionUID` immediately. Poll for status after 3–5 seconds.

## Status Polling

```
GET /api/v1.0/documentsubmissions/{submissionUID}
Authorization: Bearer <access_token>
```

Response:
```json
{
  "submissionUID": "...",
  "documentCount": 1,
  "dateTimeReceived": "2024-01-01T10:00:00Z",
  "overallStatus": "Valid",
  "documentSummary": [
    {
      "uuid": "document-uuid",
      "submissionUID": "...",
      "longId": "...",
      "internalId": "INV-001",
      "typeName": "Invoice",
      "typeVersionName": "1.1",
      "issuerTin": "C123456789",
      "issuerName": "...",
      "receiverTin": "C987654321",
      "receiverName": "...",
      "dateTimeIssued": "2024-01-01T00:00:00Z",
      "dateTimeReceived": "2024-01-01T10:00:00Z",
      "dateTimeValidated": "2024-01-01T10:00:10Z",
      "totalSales": 1000.00,
      "totalDiscount": 0,
      "netAmount": 1000.00,
      "total": 1060.00,
      "status": "Valid",
      "cancelDateTime": null,
      "rejectRequestDateTime": null,
      "documentStatusReason": null,
      "createdByUserId": "..."
    }
  ]
}
```

Status mapping:
| LHDN status | Our status |
|---|---|
| Submitted | SUBMITTED |
| Valid | VALIDATED |
| Invalid | REJECTED |
| Cancelled | CANCELLED |

## UBL 2.1 JSON Document Structure

The LHDN API accepts a simplified JSON format (not raw UBL XML).
Built by `src/modules/lhdn/lhdn.ubl-builder.ts`.

```json
{
  "_D": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  "_A": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  "_B": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  "Invoice": [{
    "ID": [{ "_": "INV-001" }],
    "IssueDate": [{ "_": "2024-01-01" }],
    "IssueTime": [{ "_": "10:00:00Z" }],
    "InvoiceTypeCode": [{ "_": "01", "listVersionID": "1.1" }],
    "DocumentCurrencyCode": [{ "_": "MYR" }],
    "TaxCurrencyCode": [{ "_": "MYR" }],
    "AccountingSupplierParty": [{
      "Party": [{
        "PartyLegalEntity": [{ "RegistrationName": [{ "_": "Supplier Name" }] }],
        "PartyIdentification": [
          { "ID": [{ "_": "C12345678901", "schemeID": "TIN" }] },
          { "ID": [{ "_": "202301012345", "schemeID": "BRN" }] }
        ],
        "PostalAddress": [{
          "AddressLine": [
            { "Line": [{ "_": "123 Jalan Merdeka" }] }
          ],
          "PostalZone": [{ "_": "50000" }],
          "CityName": [{ "_": "Kuala Lumpur" }],
          "CountrySubentityCode": [{ "_": "14" }],
          "Country": [{ "IdentificationCode": [{ "_": "MYS" }] }]
        }],
        "PartyTaxScheme": [{
          "TaxScheme": [{ "ID": [{ "_": "OTH" }] }],
          "CompanyID": [{ "_": "NA" }]
        }],
        "Contact": [{
          "Telephone": [{ "_": "+60123456789" }],
          "ElectronicMail": [{ "_": "supplier@example.my" }]
        }],
        "IndustryClassificationCode": [{ "_": "46510", "name": "Computer hardware" }]
      }]
    }],
    "AccountingCustomerParty": [{
      "Party": [{
        "PartyLegalEntity": [{ "RegistrationName": [{ "_": "Buyer Name" }] }],
        "PartyIdentification": [
          { "ID": [{ "_": "C98765432109", "schemeID": "TIN" }] }
        ],
        "PostalAddress": [{
          "AddressLine": [{ "Line": [{ "_": "456 Jalan Bukit Bintang" }] }],
          "PostalZone": [{ "_": "55100" }],
          "CityName": [{ "_": "Kuala Lumpur" }],
          "CountrySubentityCode": [{ "_": "14" }],
          "Country": [{ "IdentificationCode": [{ "_": "MYS" }] }]
        }],
        "PartyTaxScheme": [{
          "TaxScheme": [{ "ID": [{ "_": "OTH" }] }],
          "CompanyID": [{ "_": "NA" }]
        }],
        "Contact": [{
          "Telephone": [{ "_": "+60198765432" }],
          "ElectronicMail": [{ "_": "buyer@example.my" }]
        }]
      }]
    }],
    "InvoiceLine": [{
      "ID": [{ "_": "1" }],
      "InvoicedQuantity": [{ "_": 1, "unitCode": "KGM" }],
      "LineExtensionAmount": [{ "_": 1000.00, "currencyID": "MYR" }],
      "TaxTotal": [{
        "TaxAmount": [{ "_": 60.00, "currencyID": "MYR" }],
        "TaxSubtotal": [{
          "TaxableAmount": [{ "_": 1000.00, "currencyID": "MYR" }],
          "TaxAmount": [{ "_": 60.00, "currencyID": "MYR" }],
          "TaxCategory": [{
            "ID": [{ "_": "01" }],
            "TaxExemptionReason": [{ "_": "" }],
            "TaxScheme": [{ "ID": [{ "_": "OTH" }] }],
            "Percent": [{ "_": 6 }]
          }]
        }]
      }],
      "Item": [{
        "CommodityClassification": [{
          "ItemClassificationCode": [{ "_": "001", "listID": "CLASS" }]
        }],
        "Description": [{ "_": "Product description" }]
      }],
      "Price": [{
        "PriceAmount": [{ "_": 1000.00, "currencyID": "MYR" }]
      }],
      "ItemPriceExtension": [{
        "Amount": [{ "_": 1000.00, "currencyID": "MYR" }]
      }]
    }],
    "TaxTotal": [{
      "TaxAmount": [{ "_": 60.00, "currencyID": "MYR" }],
      "TaxSubtotal": [{
        "TaxableAmount": [{ "_": 1000.00, "currencyID": "MYR" }],
        "TaxAmount": [{ "_": 60.00, "currencyID": "MYR" }],
        "TaxCategory": [{
          "ID": [{ "_": "01" }],
          "TaxScheme": [{ "ID": [{ "_": "OTH" }] }],
          "Percent": [{ "_": 6 }]
        }]
      }]
    }],
    "LegalMonetaryTotal": [{
      "LineExtensionAmount": [{ "_": 1000.00, "currencyID": "MYR" }],
      "TaxExclusiveAmount": [{ "_": 1000.00, "currencyID": "MYR" }],
      "TaxInclusiveAmount": [{ "_": 1060.00, "currencyID": "MYR" }],
      "PayableAmount": [{ "_": 1060.00, "currencyID": "MYR" }]
    }],
    "Signature": [{ "ID": [{ "_": "urn:oasis:names:specification:ubl:signature:Invoice" }] }]
  }]
}
```

## Tax Type Codes

| Code | Description |
|---|---|
| `01` | Sales Tax (SST) |
| `02` | Service Tax (SST) |
| `E` | Tax Exempt |
| `AE` | Zero-Rated |
| `NA` | Not Applicable |

## Invoice Type Codes

| Code | Description |
|---|---|
| `01` | Invoice |
| `02` | Credit Note |
| `03` | Debit Note |
| `04` | Refund Note |

## Document Hash Computation

```
1. Build UBL JSON document (with empty Signature block)
2. JSON.stringify(doc)  — minified, no whitespace
3. Encode to UTF-8 bytes
4. SHA-256(bytes) → hex string = documentHash
5. btoa(utf8string) = base64 document
```

## Digital Signature (Production)

LHDN v1.1 requires XAdES (XML Advanced Electronic Signature) from an MCMC-approved CA:
- MSC Trustgate (https://www.trustgate.com)
- DigiCert Malaysia
- Pos Digicert (https://www.posdigicert.com.my)

For sandbox testing with v1.0 documents, the Signature block can be empty `{}`.
See `src/modules/lhdn/lhdn.signer.ts` for the integration point.

## Rate Limits

- 100 requests per minute per Client ID
- 429 response includes `Retry-After` header
- Maximum 100 documents per submission
- Maximum 5 MB total payload per submission
- Maximum 300 KB per individual document

## Error Codes

| HTTP | LHDN Code | Meaning |
|---|---|---|
| 400 | — | Bad request / invalid format |
| 401 | — | Expired or missing token |
| 403 | — | Insufficient permissions |
| 404 | — | Document/submission not found |
| 422 | Error03 | Duplicate submission |
| 422 | DS302 | Duplicate document |
| 429 | — | Rate limit exceeded |
| 500 | — | LHDN internal error |
