import { describe, it, expect } from 'vitest'
import {
  ALLOWED_RECEIPT_TYPES,
  MAX_FILE_SIZE,
  isValidReceiptFile,
  sanitizeFilename,
  isPdfFile,
  isImageFile,
} from '@/lib/upload/file-validation'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('Constants', () => {
  it('ALLOWED_RECEIPT_TYPES contains exactly 5 MIME types', () => {
    expect(ALLOWED_RECEIPT_TYPES).toHaveLength(5)
  })

  it('ALLOWED_RECEIPT_TYPES includes pdf, jpeg, png, webp, gif', () => {
    expect(ALLOWED_RECEIPT_TYPES).toContain('application/pdf')
    expect(ALLOWED_RECEIPT_TYPES).toContain('image/jpeg')
    expect(ALLOWED_RECEIPT_TYPES).toContain('image/png')
    expect(ALLOWED_RECEIPT_TYPES).toContain('image/webp')
    expect(ALLOWED_RECEIPT_TYPES).toContain('image/gif')
  })

  it('MAX_FILE_SIZE is 10MB (10 * 1024 * 1024)', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
  })
})

// ---------------------------------------------------------------------------
// isValidReceiptFile
// ---------------------------------------------------------------------------
describe('isValidReceiptFile', () => {
  it('accepts a valid PDF file', () => {
    const file = new File(['pdf-content'], 'receipt.pdf', { type: 'application/pdf' })
    const result = isValidReceiptFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('accepts a valid JPEG file', () => {
    const file = new File(['jpeg-content'], 'photo.jpg', { type: 'image/jpeg' })
    const result = isValidReceiptFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('accepts a valid PNG file', () => {
    const file = new File(['png-content'], 'screenshot.png', { type: 'image/png' })
    const result = isValidReceiptFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('accepts a valid WebP file', () => {
    const file = new File(['webp-content'], 'image.webp', { type: 'image/webp' })
    const result = isValidReceiptFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('accepts a valid GIF file', () => {
    const file = new File(['gif-content'], 'animation.gif', { type: 'image/gif' })
    const result = isValidReceiptFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('rejects a text/plain file with an error message', () => {
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })
    const result = isValidReceiptFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Otillåten filtyp. Använd PDF eller bild (JPG, PNG, WebP, GIF).')
  })

  it('rejects an application/zip file', () => {
    const file = new File(['zip'], 'archive.zip', { type: 'application/zip' })
    const result = isValidReceiptFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects a file with empty MIME type', () => {
    const file = new File(['data'], 'unknown', { type: '' })
    const result = isValidReceiptFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects an oversized file', () => {
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    const result = isValidReceiptFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Filen är för stor (max 10MB).')
  })

  it('accepts a file at exactly MAX_FILE_SIZE', () => {
    const file = new File(['x'], 'exact.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE })
    const result = isValidReceiptFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('rejects a file one byte over MAX_FILE_SIZE', () => {
    const file = new File(['x'], 'over.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    const result = isValidReceiptFile(file)
    expect(result.valid).toBe(false)
  })

  it('accepts a zero-byte file with valid type', () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' })
    const result = isValidReceiptFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('checks type before size (invalid type on oversized file returns type error)', () => {
    const file = new File(['x'], 'huge.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    const result = isValidReceiptFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Otillåten filtyp. Använd PDF eller bild (JPG, PNG, WebP, GIF).')
  })
})

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------
describe('sanitizeFilename', () => {
  it('replaces å with a', () => {
    expect(sanitizeFilename('kvitto_från.pdf')).toBe('kvitto_fran.pdf')
  })

  it('replaces ä with a', () => {
    expect(sanitizeFilename('räkning.pdf')).toBe('rakning.pdf')
  })

  it('replaces ö with o', () => {
    expect(sanitizeFilename('faktura_för.pdf')).toBe('faktura_for.pdf')
  })

  it('handles uppercase Swedish characters (Å→a, Ä→a, Ö→o)', () => {
    expect(sanitizeFilename('ÅÄÖ.pdf')).toBe('aao.pdf')
  })

  it('replaces special characters with underscores', () => {
    // Parentheses become underscores; closing paren before dot leaves a trailing underscore before extension
    expect(sanitizeFilename('my file (1).pdf')).toBe('my_file_1_.pdf')
  })

  it('collapses consecutive underscores into one', () => {
    expect(sanitizeFilename('a   b___c.pdf')).toBe('a_b_c.pdf')
  })

  it('trims leading underscores', () => {
    expect(sanitizeFilename('___file.pdf')).toBe('file.pdf')
  })

  it('trims trailing underscores at end of string', () => {
    // Trailing underscore trim only applies to the very end of the string, not before the extension dot
    expect(sanitizeFilename('file___')).toBe('file')
  })

  it('does not trim underscores before extension dot (mid-string)', () => {
    // The regex ^_+|_+$ trims string boundaries only; underscores before "." stay
    expect(sanitizeFilename('file___.pdf')).toBe('file_.pdf')
  })

  it('preserves dots, hyphens, and alphanumerics', () => {
    expect(sanitizeFilename('my-file.2024.pdf')).toBe('my-file.2024.pdf')
  })

  it('handles a filename with only Swedish chars', () => {
    expect(sanitizeFilename('åäö')).toBe('aao')
  })

  it('handles a complex real-world filename', () => {
    // Closing paren before ".pdf" becomes underscore that persists (not at string boundary)
    expect(sanitizeFilename('Kvitto från Löfbergs (2024-01-15).pdf')).toBe('Kvitto_fran_Lofbergs_2024-01-15_.pdf')
  })

  it('returns the same string when no special chars present', () => {
    expect(sanitizeFilename('receipt.pdf')).toBe('receipt.pdf')
  })

  it('handles empty string', () => {
    expect(sanitizeFilename('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// isPdfFile
// ---------------------------------------------------------------------------
describe('isPdfFile', () => {
  it('returns true for application/pdf', () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    expect(isPdfFile(file)).toBe(true)
  })

  it('returns false for image/jpeg', () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    expect(isPdfFile(file)).toBe(false)
  })

  it('returns false for image/png', () => {
    const file = new File(['data'], 'img.png', { type: 'image/png' })
    expect(isPdfFile(file)).toBe(false)
  })

  it('returns false for empty MIME type', () => {
    const file = new File(['data'], 'unknown', { type: '' })
    expect(isPdfFile(file)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isImageFile
// ---------------------------------------------------------------------------
describe('isImageFile', () => {
  it('returns true for image/jpeg', () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    expect(isImageFile(file)).toBe(true)
  })

  it('returns true for image/png', () => {
    const file = new File(['data'], 'img.png', { type: 'image/png' })
    expect(isImageFile(file)).toBe(true)
  })

  it('returns true for image/webp', () => {
    const file = new File(['data'], 'img.webp', { type: 'image/webp' })
    expect(isImageFile(file)).toBe(true)
  })

  it('returns true for image/gif', () => {
    const file = new File(['data'], 'anim.gif', { type: 'image/gif' })
    expect(isImageFile(file)).toBe(true)
  })

  it('returns false for application/pdf', () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    expect(isImageFile(file)).toBe(false)
  })

  it('returns false for text/plain', () => {
    const file = new File(['data'], 'notes.txt', { type: 'text/plain' })
    expect(isImageFile(file)).toBe(false)
  })

  it('returns false for empty MIME type', () => {
    const file = new File(['data'], 'unknown', { type: '' })
    expect(isImageFile(file)).toBe(false)
  })

  it('returns true for image/svg+xml (any image/* subtype)', () => {
    const file = new File(['data'], 'icon.svg', { type: 'image/svg+xml' })
    expect(isImageFile(file)).toBe(true)
  })
})
