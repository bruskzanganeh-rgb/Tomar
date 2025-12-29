/**
 * Shared file validation utilities for receipt/document uploads
 */

export const ALLOWED_RECEIPT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type AllowedReceiptType = typeof ALLOWED_RECEIPT_TYPES[number]

export const ALLOWED_RECEIPT_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp,.gif'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function isValidReceiptFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type as AllowedReceiptType)) {
    return { valid: false, error: 'Otillåten filtyp. Använd PDF eller bild (JPG, PNG, WebP, GIF).' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Filen är för stor (max 10MB).' }
  }
  return { valid: true }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf'
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}
