import { getLHDNBaseUrl, LHDN_ENDPOINTS } from '../../config/lhdn.js';
import type { LhdnTokenResponse, LhdnSubmitResponse, LhdnSubmissionStatusResponse, LhdnCancelResponse } from './lhdn.dto.js';
import { LHDNTokenError, LHDNSubmissionError } from '../../errors/lhdn-errors.js';

export class LhdnApiClient {
  private readonly baseUrl: string;

  constructor(lhdnEnv: string) {
    this.baseUrl = getLHDNBaseUrl(lhdnEnv);
  }

  async getToken(clientId: string, clientSecret: string): Promise<LhdnTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'InvoicingAPI',
    });

    const res = await fetch(`${this.baseUrl}${LHDN_ENDPOINTS.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new LHDNTokenError(`Token request failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<LhdnTokenResponse>;
  }

  async submitDocuments(
    accessToken: string,
    payload: object,
  ): Promise<LhdnSubmitResponse> {
    const res = await fetch(`${this.baseUrl}${LHDN_ENDPOINTS.submitDocuments}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new LHDNSubmissionError(`Submission failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<LhdnSubmitResponse>;
  }

  async getSubmissionStatus(
    accessToken: string,
    submissionUid: string,
  ): Promise<LhdnSubmissionStatusResponse> {
    const res = await fetch(
      `${this.baseUrl}${LHDN_ENDPOINTS.getSubmission(submissionUid)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new LHDNSubmissionError(`Status check failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<LhdnSubmissionStatusResponse>;
  }

  async cancelDocument(
    accessToken: string,
    uuid: string,
    reason: string,
  ): Promise<LhdnCancelResponse> {
    const res = await fetch(`${this.baseUrl}${LHDN_ENDPOINTS.cancelDocument(uuid)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status: 'cancelled', reason }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new LHDNSubmissionError(`Cancel failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<LhdnCancelResponse>;
  }
}
