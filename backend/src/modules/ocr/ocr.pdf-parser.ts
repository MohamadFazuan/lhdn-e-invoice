/**
 * PDF text extraction using pdfjs-serverless.
 * Edge-compatible redistribution of PDF.js with no Node.js native dependencies.
 */
export async function extractPDFText(pdfBytes: Uint8Array): Promise<string> {
  // Dynamic import avoids bundling pdfjs-serverless into the main Worker chunk;
  // Cloudflare Workers supports dynamic import for lazy loading.
  const { getDocument } = await import('pdfjs-serverless');

  const pdf = await getDocument({ data: pdfBytes }).promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    parts.push(pageText);
  }

  return parts.join('\n').trim();
}
