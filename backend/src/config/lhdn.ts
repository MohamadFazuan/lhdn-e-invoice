export const LHDN_BASE_URLS = {
  sandbox: 'https://preprod-api.myinvois.hasil.gov.my',
  production: 'https://api.myinvois.hasil.gov.my',
} as const;

export const LHDN_ENDPOINTS = {
  token: '/connect/token',
  submitDocuments: '/api/v1.0/documentsubmissions/',
  getSubmission: (uid: string) => `/api/v1.0/documentsubmissions/${uid}`,
  getDocumentDetails: (uuid: string) => `/api/v1.0/documents/${uuid}/details`,
  cancelDocument: (uuid: string) => `/api/v1.0/documents/state/${uuid}/state`,
  validateTin: '/api/v1.0/taxpayer/validate',
} as const;

export type LHDNEnv = keyof typeof LHDN_BASE_URLS;

export function getLHDNBaseUrl(env: string): string {
  if (env === 'production') return LHDN_BASE_URLS.production;
  return LHDN_BASE_URLS.sandbox;
}
