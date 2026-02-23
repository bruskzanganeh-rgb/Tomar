import { test, expect } from '@playwright/test'

const pages = [
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
]

// Pages that require auth — these will redirect to login if not authenticated,
// but we still verify that the redirect itself doesn't break layouts
const authPages = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'gigs', path: '/gigs' },
  { name: 'calendar', path: '/calendar' },
  { name: 'finance', path: '/finance' },
  { name: 'settings', path: '/settings' },
]

test.describe('Responsive layout — no horizontal overflow', () => {
  for (const page of pages) {
    test(`${page.name} has no horizontal scroll`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: 'networkidle' })

      const scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await p.evaluate(() => document.documentElement.clientWidth)

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // 1px tolerance
    })
  }

  for (const page of authPages) {
    test(`${page.name} (or redirect) has no horizontal scroll`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: 'networkidle' })

      const scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await p.evaluate(() => document.documentElement.clientWidth)

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
})

test.describe('Responsive layout — elements within viewport', () => {
  for (const page of pages) {
    test(`${page.name} — no elements overflow viewport`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: 'networkidle' })

      const overflowing = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const elements = document.querySelectorAll('button, input, select, a, [role="dialog"]')
        const results: string[] = []

        elements.forEach((el) => {
          const rect = el.getBoundingClientRect()
          if (rect.width > 0 && rect.right > vw + 5) {
            const tag = el.tagName.toLowerCase()
            const cls = el.className?.toString().slice(0, 50) || ''
            results.push(`${tag}[${cls}] right=${Math.round(rect.right)} > viewport=${vw}`)
          }
        })

        return results
      })

      expect(overflowing, `Overflowing elements found:\n${overflowing.join('\n')}`).toHaveLength(0)
    })
  }
})

test.describe('Responsive screenshots', () => {
  for (const page of pages) {
    test(`screenshot — ${page.name}`, async ({ page: p }, testInfo) => {
      await p.goto(page.path, { waitUntil: 'networkidle' })

      await p.screenshot({
        path: `tests/screenshots/${testInfo.project.name}-${page.name}.png`,
        fullPage: true,
      })
    })
  }
})
