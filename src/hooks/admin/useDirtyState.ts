// hooks/admin/useDirtyState.ts
// Tracks unsaved changes across loans, borrowers, and config independently.
// Registers a beforeunload guard when any flag is true.

import { useState, useEffect } from 'react'

export function useDirtyState() {
  const [hasLoanChanges, setHasLoanChanges] = useState(false)
  const [hasBorrowerChanges, setHasBorrowerChanges] = useState(false)
  const [hasConfigChanges, setHasConfigChanges] = useState(false)

  const isDirty = hasLoanChanges || hasBorrowerChanges || hasConfigChanges

  // ── beforeunload guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // ── Setters ──────────────────────────────────────────────────────────────
  function markLoanDirty() { setHasLoanChanges(true) }
  function markBorrowerDirty() { setHasBorrowerChanges(true) }
  function markConfigDirty() { setHasConfigChanges(true) }

  function clearDirty() {
    setHasLoanChanges(false)
    setHasBorrowerChanges(false)
    setHasConfigChanges(false)
  }

  return {
    isDirty,
    hasLoanChanges,
    hasBorrowerChanges,
    hasConfigChanges,
    markLoanDirty,
    markBorrowerDirty,
    markConfigDirty,
    clearDirty,
  }
}