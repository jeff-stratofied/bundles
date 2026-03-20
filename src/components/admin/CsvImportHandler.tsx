// components/admin/CsvImportHandler.tsx
// Handles CSV file import for the admin page.
// Parses the CSV, merges with existing loans (preserving ownershipLots & events),
// deduplicates by loanId, and extracts highest FICO per borrower.
// Triggered by a hidden <input type="file"> ref from AdminPage toolbar.

import { type RefObject } from 'react'
import type { AdminLoan } from '../../hooks/admin/useAdminLoans'
import type { AdminBorrower } from '../../hooks/admin/useAdminBorrowers'
import { normalizeOwnership } from '../../utils/ownershipEngine'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CsvImportResult {
  loans: AdminLoan[]
  borrowers: AdminBorrower[]
  importedCount: number
  updatedCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateLoanId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function normalizeDate(d: string): string {
  if (!d) return ''
  // YYYYMMDD → YYYY-MM-DD
  if (/^\d{8}$/.test(d)) return d.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  // MM/DD/YYYY
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return d
}

// ─── CSV column map ───────────────────────────────────────────────────────────
// Maps uppercase CSV header names to loan/borrower fields.
// Matches the original admin.html import logic exactly.

function parseRow(row: Record<string, string>): { loan: AdminLoan; appScore: number | null } {
  const startDate = normalizeDate(row['DATE_ON_SYSTEM'] ?? '')
  const today = new Date().toISOString().split('T')[0]

  const loanId = row['PROM_NOTE_ID'] || generateLoanId()
  const borrowerId = row['BORROWER_ID'] || `BRW-${generateLoanId()}`

  // nominalRate: CSV stores as integer percent (e.g. 925 = 9.25%), divide by 10000
  // or as decimal percent (e.g. 9.25), divide by 100
  const rateRaw = Number(row['LOAN_INT_RATE'] || 0)
  const nominalRate = rateRaw > 50 ? rateRaw / 10000 : rateRaw / 100

  const termMonths = Number(row['TERM'] || 0)
  const termYears = termMonths > 0 ? Math.ceil(termMonths / 12) : 10

  const graceMos = Number(row['MOS_GRACE_ELIG'] || 0)
  const graceYears = graceMos > 0 ? graceMos / 12 : 0

  const appScore = row['APP_SCORE'] ? Number(row['APP_SCORE']) : null

  const loan: AdminLoan = {
    loanId,
    borrowerId,
    loanName: row['LOAN_NAME'] || '',
    school: (row['ORIGINAL_SCHOOL_NAME'] || '').trim(),
    loanStartDate: startDate,
    principal: Number(row['ORIG_PRINCIPAL_BAL'] || 0),
    nominalRate,
    termYears,
    graceYears,
    loanStatus: row['LOAN_STATUS'] || '',
    feeWaiver: 'none',
    events: [],
    ownershipLots: [{
      user: 'market',
      pct: 1,
      purchaseDate: startDate || today,
    }],
  }

  normalizeOwnership(loan)

  return { loan, appScore }
}

// ─── Main import function ─────────────────────────────────────────────────────

export async function processImport(
  file: File,
  existingLoans: AdminLoan[],
  existingBorrowers: AdminBorrower[]
): Promise<CsvImportResult> {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length < 2) throw new Error('CSV has no data rows')

  const headers = lines[0].split(',').map(h => h.trim().toUpperCase())

  const rawRows = lines.slice(1)
    .filter(l => l.trim() !== '' && !l.startsWith(',,,'))
    .map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return row
    })

  // Parse all rows
  const parsed = rawRows.map(parseRow)

  // Build FICO map: highest appScore per borrowerId
  const ficoMap = new Map<string, number>()
  parsed.forEach(({ loan, appScore }) => {
    if (loan.borrowerId && appScore) {
      const current = ficoMap.get(loan.borrowerId) ?? 0
      ficoMap.set(loan.borrowerId, Math.max(current, appScore))
    }
  })

  // Merge loans into existing array
  let importedCount = 0
  let updatedCount = 0

  const mergedLoans = [...existingLoans]

  parsed.forEach(({ loan }) => {
    const idx = mergedLoans.findIndex(l => l.loanId === loan.loanId)
    if (idx !== -1) {
      // Update existing — preserve ownershipLots and events
      mergedLoans[idx] = {
        ...mergedLoans[idx],
        ...loan,
        ownershipLots: mergedLoans[idx].ownershipLots?.length
          ? mergedLoans[idx].ownershipLots
          : loan.ownershipLots,
        events: mergedLoans[idx].events ?? [],
      }
      updatedCount++
    } else {
      mergedLoans.push(loan)
      importedCount++
    }
  })

  // Deduplicate by loanId (safety net)
  const seen = new Set<string>()
  const deduped = mergedLoans.filter(l => {
    if (seen.has(l.loanId)) return false
    seen.add(l.loanId)
    return true
  })

  // Merge borrowers — apply highest FICO
  const mergedBorrowers = [...existingBorrowers]

  ficoMap.forEach((highestFico, borrowerId) => {
    const idx = mergedBorrowers.findIndex(b => b.borrowerId === borrowerId)
    if (idx !== -1) {
      mergedBorrowers[idx] = {
        ...mergedBorrowers[idx],
        borrowerFico: highestFico,
      }
    } else {
      mergedBorrowers.push({
        borrowerId,
        borrowerName: 'Imported Borrower',
        borrowerFico: highestFico,
        cosignerFico: null,
        yearInSchool: null,
        degreeType: null,
        isGraduateStudent: false,
        school: '',
      })
    }
  })

  return {
    loans: deduped,
    borrowers: mergedBorrowers,
    importedCount,
    updatedCount,
  }
}