/**
 * Layout Regression E2E Tests
 *
 * Catches layout issues: buttons cut off, content not using full width,
 * element overlaps, text truncation, collapsed table columns.
 *
 * Runs as OWNER (E2E_EMAIL) on Desktop viewport.
 */
import { test, expect, Page } from '@playwright/test'

const pages = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'gigs', path: '/gigs' },
  { name: 'calendar', path: '/calendar' },
  { name: 'finance', path: '/finance' },
  { name: 'settings', path: '/settings' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all buttons that overflow the viewport */
async function getOverflowingButtons(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const buttons = document.querySelectorAll('button, a[role="button"]')
    const results: string[] = []

    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      // Skip hidden elements
      const style = window.getComputedStyle(btn)
      if (style.display === 'none' || style.visibility === 'hidden') return
      if (rect.right > vw + 2) {
        const text = btn.textContent?.trim().slice(0, 40) || ''
        results.push(`"${text}" right=${Math.round(rect.right)} > viewport=${vw}`)
      }
    })

    return results
  })
}

/** Measure main content width usage */
async function getContentWidthRatio(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const main = document.querySelector('main')
    if (!main) return { ratio: 0, mainWidth: 0, viewport: vw }
    const rect = main.getBoundingClientRect()
    return { ratio: rect.width / vw, mainWidth: Math.round(rect.width), viewport: vw }
  })
}

/** Find buttons with truncated text */
async function getTruncatedButtons(page: Page) {
  return page.evaluate(() => {
    const buttons = document.querySelectorAll('button')
    const results: string[] = []

    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const style = window.getComputedStyle(btn)
      if (style.display === 'none' || style.visibility === 'hidden') return

      // Check if text is being clipped
      if (btn.scrollWidth > btn.clientWidth + 4) {
        const text = btn.textContent?.trim().slice(0, 40) || ''
        if (text.length > 0) {
          results.push(`"${text}" scrollW=${btn.scrollWidth} > clientW=${btn.clientWidth}`)
        }
      }
    })

    return results
  })
}

/** Check for overlapping sibling cards/widgets */
async function getOverlappingCards(page: Page) {
  return page.evaluate(() => {
    const results: string[] = []
    // Check grid children (dashboard widgets, etc.)
    const grids = document.querySelectorAll('.grid, [class*="grid-cols"]')

    grids.forEach(grid => {
      const children = Array.from(grid.children)
      for (let i = 0; i < children.length; i++) {
        const a = children[i].getBoundingClientRect()
        if (a.width === 0 || a.height === 0) continue

        for (let j = i + 1; j < children.length; j++) {
          const b = children[j].getBoundingClientRect()
          if (b.width === 0 || b.height === 0) continue

          // Check if bounding boxes overlap (with 2px tolerance)
          const overlapX = a.left < b.right - 2 && a.right > b.left + 2
          const overlapY = a.top < b.bottom - 2 && a.bottom > b.top + 2
          if (overlapX && overlapY) {
            const textA = children[i].textContent?.trim().slice(0, 20) || `child-${i}`
            const textB = children[j].textContent?.trim().slice(0, 20) || `child-${j}`
            results.push(`"${textA}" overlaps "${textB}"`)
          }
        }
      }
    })

    return results
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Layout regression — button visibility', () => {
  test('finance — "Create invoice" button fully visible', async ({ page }) => {
    await page.goto('/finance', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const btn = page.getByRole('button', { name: /ny faktura|new invoice/i }).first()
    if (await btn.isVisible()) {
      const box = await btn.boundingBox()
      expect(box).not.toBeNull()

      const viewport = page.viewportSize()!
      expect(
        box!.x + box!.width,
        `"Create invoice" button right edge (${box!.x + box!.width}) exceeds viewport (${viewport.width})`
      ).toBeLessThanOrEqual(viewport.width)
    }
  })

  for (const pg of pages) {
    test(`${pg.name} — no buttons overflow viewport`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)

      const overflowing = await getOverflowingButtons(page)
      expect(
        overflowing,
        `Buttons overflow viewport on ${pg.name}:\n${overflowing.join('\n')}`
      ).toHaveLength(0)
    })
  }
})

test.describe('Layout regression — content width', () => {
  for (const pg of pages) {
    test(`${pg.name} — main content uses available width`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)

      const { ratio, mainWidth, viewport } = await getContentWidthRatio(page)
      expect(
        ratio,
        `Main content too narrow on ${pg.name}: ${mainWidth}px / ${viewport}px = ${(ratio * 100).toFixed(0)}%`
      ).toBeGreaterThan(0.75)
    })
  }
})

test.describe('Layout regression — text truncation', () => {
  for (const pg of pages) {
    test(`${pg.name} — no buttons have truncated text`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)

      const truncated = await getTruncatedButtons(page)
      expect(
        truncated,
        `Truncated button text on ${pg.name}:\n${truncated.join('\n')}`
      ).toHaveLength(0)
    })
  }
})

test.describe('Layout regression — no widget overlap', () => {
  test('dashboard — widgets do not overlap', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const overlaps = await getOverlappingCards(page)
    expect(
      overlaps,
      `Overlapping widgets on dashboard:\n${overlaps.join('\n')}`
    ).toHaveLength(0)
  })

  test('dashboard — grid height does not exceed viewport', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const result = await page.evaluate(() => {
      const grid = document.querySelector('.grid') as HTMLElement
      if (!grid) return { gridHeight: 0, viewportHeight: window.innerHeight }
      return {
        gridHeight: grid.getBoundingClientRect().height,
        viewportHeight: window.innerHeight,
      }
    })

    // Grid should not be taller than viewport + 100px (some tolerance for scrolling)
    expect(
      result.gridHeight,
      `Dashboard grid too tall: ${Math.round(result.gridHeight)}px > viewport ${result.viewportHeight}px + 100px`
    ).toBeLessThanOrEqual(result.viewportHeight + 100)
  })
})

test.describe('Layout regression — settings tabs', () => {
  test('settings — all tabs visible without horizontal scroll', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const tabList = page.locator('[role="tablist"]').first()
    if (await tabList.isVisible()) {
      const overflow = await tabList.evaluate(el => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }))
      expect(
        overflow.scrollWidth,
        `Settings tab list overflows: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`
      ).toBeLessThanOrEqual(overflow.clientWidth + 5)
    }
  })
})

test.describe('Layout regression — table columns', () => {
  test('gigs — table columns have reasonable width', async ({ page }) => {
    await page.goto('/gigs', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const narrowColumns = await page.evaluate(() => {
      const results: string[] = []
      const ths = document.querySelectorAll('table th')

      ths.forEach((th, i) => {
        const rect = th.getBoundingClientRect()
        // Flag columns narrower than 40px (likely collapsed)
        if (rect.width > 0 && rect.width < 40) {
          const text = th.textContent?.trim().slice(0, 20) || `col-${i}`
          results.push(`"${text}" width=${Math.round(rect.width)}px`)
        }
      })

      return results
    })

    expect(
      narrowColumns,
      `Collapsed table columns on gigs:\n${narrowColumns.join('\n')}`
    ).toHaveLength(0)
  })
})
