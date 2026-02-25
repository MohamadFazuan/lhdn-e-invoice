/**
 * Image OCR using Cloudflare Workers AI vision model.
 * Supports JPEG and PNG invoice scans.
 */
export async function extractImageText(imageBytes: Uint8Array, ai: Ai): Promise<string> {
  const result = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct' as any, {
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all text exactly as it appears in this invoice document. Preserve numbers, dates, and formatting. Output only the extracted text, nothing else.',
          },
          {
            type: 'image',
            image: Array.from(imageBytes),
          },
        ],
      },
    ],
    max_tokens: 4096,
  } as any);

  return (result as any).response as string;
}
