import { extractText } from 'unpdf'

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Convert Buffer to Uint8Array for unpdf library
    const uint8Array = new Uint8Array(pdfBuffer)
    const result = await extractText(uint8Array)
    // unpdf returns { totalPages: number; text: string[] }, join the text array
    return result.text.join('\n')
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function extractInvoiceNumberFromFilename(filename: string): number | null {
  // Extract from filenames like "Faktura-123.pdf" or "faktura-123.pdf"
  const match = filename.match(/faktura[_-]?(\d+)\.pdf/i)
  return match ? parseInt(match[1], 10) : null
}
