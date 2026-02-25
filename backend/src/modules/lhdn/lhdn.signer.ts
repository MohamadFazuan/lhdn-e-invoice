import { sha256Base64, sha256Hex } from '../../utils/hash.js';

export interface SignedDocument {
  document: string;        // Base64-encoded JSON document
  documentHash: string;    // SHA-256 hex of the document bytes
  codeNumber: string;      // Invoice code number for LHDN submission
}

/**
 * Prepares a UBL document for LHDN submission.
 *
 * LHDN MyInvois v1.1 requires:
 * - document: Base64-encoded UTF-8 JSON of the UBL document
 * - documentHash: SHA-256 of the document bytes in Base64
 * - codeNumber: matches Invoice[0].ID[0]._
 *
 * Note: Digital signature (RSA-PSS with MCMC CA certificate) is only required
 * in production. In sandbox, the signature block is not validated.
 */
export async function prepareDocument(
  ublDocument: object,
  invoiceCodeNumber: string,
): Promise<SignedDocument> {
  const documentJson = JSON.stringify(ublDocument);
  const documentBytes = new TextEncoder().encode(documentJson);
  const documentBase64 = btoa(
    Array.from(documentBytes)
      .map((b) => String.fromCharCode(b))
      .join(''),
  );

  // SHA-256 of raw bytes, expressed as Base64
  const hashBuffer = await crypto.subtle.digest('SHA-256', documentBytes);
  const hashBytes = new Uint8Array(hashBuffer);
  const documentHash = btoa(
    Array.from(hashBytes)
      .map((b) => String.fromCharCode(b))
      .join(''),
  );

  return {
    document: documentBase64,
    documentHash,
    codeNumber: invoiceCodeNumber,
  };
}
