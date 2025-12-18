import { Dropbox } from 'dropbox'
import { extractInvoiceNumberFromFilename } from '@/lib/pdf/extractor'
import type { DropboxInvoiceFile } from '@/lib/types/import'

const BASE_PATH = '/Delade Mappar/Babalisk AB'
const IGNORE_FOLDERS = ['Gröna Linjen', 'Mall']
const YEARS = [2021, 2022, 2023, 2024, 2025]

// Month mappings: both number format (01) and name format (01 Januari)
const MONTH_FORMATS = [
  ['01', '01 Januari'],
  ['02', '02 Februari'],
  ['03', '03 Mars'],
  ['04', '04 April'],
  ['05', '05 Maj'],
  ['06', '06 Juni'],
  ['07', '07 Juli'],
  ['08', '08 Augusti'],
  ['09', '09 September'],
  ['10', '10 Oktober'],
  ['11', '11 November'],
  ['12', '12 December'],
]

/**
 * Scan all invoices from Dropbox across all years and months
 */
export async function scanAllInvoices(
  dbx: Dropbox,
  years: number[] = YEARS
): Promise<DropboxInvoiceFile[]> {
  const allInvoices: DropboxInvoiceFile[] = []

  console.log(`📁 Starting scan of ${years.length} years...`)

  for (const year of years) {
    // Skip ignored folders
    if (IGNORE_FOLDERS.some(ignored => year.toString().includes(ignored))) {
      console.log(`⏭️  Skipping ignored folder: ${year}`)
      continue
    }

    for (const monthFormats of MONTH_FORMATS) {
      // Try both month formats: "01" and "01 Januari"
      for (const monthFormat of monthFormats) {
        const monthPath = `${BASE_PATH}/${year}/${monthFormat}/Kundfakturor`

        try {
          const invoices = await scanFolder(dbx, monthPath)
          if (invoices.length > 0) {
            console.log(`✅ Found ${invoices.length} invoices in ${monthPath}`)
          }
          allInvoices.push(...invoices)
          break // If we found the folder, don't try the other format
        } catch (error: any) {
          // Folder might not exist, try next format or skip silently
          if (!error?.error?.error_summary?.includes('not_found')) {
            console.error(`❌ Error scanning ${monthPath}:`, error.message)
          }
        }
      }
    }
  }

  console.log(`📊 Scan complete: Found ${allInvoices.length} total invoices`)

  // Sort by invoice number
  return allInvoices.sort((a, b) => a.invoiceNumber - b.invoiceNumber)
}

/**
 * Scan a specific folder for PDF invoices
 */
async function scanFolder(
  dbx: Dropbox,
  folderPath: string
): Promise<DropboxInvoiceFile[]> {
  const response = await dbx.filesListFolder({ path: folderPath })

  const invoices: DropboxInvoiceFile[] = response.result.entries
    .filter((entry) => {
      // Only include PDF files
      return entry['.tag'] === 'file' && entry.name.toLowerCase().endsWith('.pdf')
    })
    .map((entry) => {
      const invoiceNumber = extractInvoiceNumberFromFilename(entry.name)
      return {
        path: entry.path_display || entry.path_lower || '',
        name: entry.name,
        size: 'size' in entry ? entry.size : 0,
        modified: 'client_modified' in entry ? entry.client_modified : '',
        invoiceNumber: invoiceNumber || 0,
      }
    })
    .filter((inv) => inv.invoiceNumber > 0) // Only include valid invoice files

  return invoices
}

/**
 * Scan specific year
 */
export async function scanYear(
  dbx: Dropbox,
  year: number
): Promise<DropboxInvoiceFile[]> {
  return scanAllInvoices(dbx, [year])
}

/**
 * Scan specific month
 */
export async function scanMonth(
  dbx: Dropbox,
  year: number,
  month: string
): Promise<DropboxInvoiceFile[]> {
  const monthPath = `${BASE_PATH}/${year}/${month}/Kundfakturor`
  return scanFolder(dbx, monthPath)
}
