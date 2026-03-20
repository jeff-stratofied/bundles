// hooks/admin/useSchoolOptions.ts
// Fetches school names from /schoolTiers for use in the loan table school autocomplete.

import { useState, useEffect } from 'react'

const API_BASE = 'https://bundles-api.jeff-263.workers.dev'

// Fallback list if API is unavailable
const FALLBACK_SCHOOLS = [
  'Penn State',
  'Ohio State',
  'Texas Tech University',
]

export function useSchoolOptions() {
  const [schoolOptions, setSchoolOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/schoolTiers`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
        const data = await res.json()

        const names: string[] = Object.values(data)
          .map((item: any) => item?.name?.trim())
          .filter(
            (name): name is string =>
              !!name &&
              name !== 'DEFAULT' &&
              !name.startsWith('UNKNOWN')
          )

        names.sort()
        setSchoolOptions(names)
      } catch (err) {
        console.warn('[useSchoolOptions] Failed to load school list, using fallback', err)
        setSchoolOptions(FALLBACK_SCHOOLS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { schoolOptions, loading }
}