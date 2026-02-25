export interface LhdnTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LhdnSubmitResponse {
  submissionUid: string;
  acceptedDocuments: Array<{ uuid: string; invoiceCodeNumber: string }>;
  rejectedDocuments: Array<{ invoiceCodeNumber: string; error: { code: string; message: string } }>;
}

export interface LhdnSubmissionStatusResponse {
  submissionUid: string;
  documentCount: number;
  dateTimeReceived: string;
  overallStatus: string;
  documentSummary: Array<{
    uuid: string;
    submissionUid: string;
    longId: string;
    internalId: string;
    typeName: string;
    status: string;
    dateTimeReceived: string;
    dateTimeValidated?: string;
    dateTimeDelivered?: string;
    supplierTin?: string;
    buyerTin?: string;
    error?: { code: string; message: string };
  }>;
}

export interface LhdnCancelResponse {
  uuid: string;
  status: string;
}
