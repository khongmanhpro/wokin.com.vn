import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { Products } from '../src/collections/Products.js'
import { NAVIGATION_SECTIONS, getVisibleNavigationSections, isNavigationItemActive } from '../src/lib/navigationState.js'
import { adminComponents } from '../src/payload.config.js'
import { dashboardMetricDefinitions } from '../src/lib/dashboardMetrics.js'
import { getCustomViewByRoute } from '../node_modules/@payloadcms/next/dist/views/Document/getCustomViewByRoute.js'

test('UX-0 Payload 3.88 resolves the protected product preview at the live document route', () => {
  const documentID = '10000000-0000-0000-0000-000000005560'
  const baseRoute = `/admin/collections/products/${documentID}`
  const views = Products.admin?.components?.views as { edit?: { preview?: { meta?: { robots?: unknown }; path?: string } } } | undefined
  const preview = views?.edit?.preview

  assert.ok(preview && typeof preview === 'object')
  assert.equal(preview.path, '/preview')
  assert.deepEqual(preview.meta?.robots, { index: false, follow: false })
  assert.notEqual(getCustomViewByRoute({ baseRoute, currentRoute: `${baseRoute}/preview`, views: Products.admin?.components?.views as never }).Component, null)
})

test('UX-0 navigation exposes operational Vietnamese destinations', () => {
  const items = NAVIGATION_SECTIONS.flatMap((section) => section.items)
  assert.ok(items.some((item) => item.label === 'Tổng quan' && item.href === '/admin'))
  assert.ok(items.some((item) => item.label === 'Sản phẩm' && item.href === '/admin/collections/products'))
  assert.ok(items.every((item) => !/Planned|Later phase/.test(item.label)))
})

test('P0-5-R custom navigation delegates its layout shell to Payload NavWrapper', () => {
  const component = readFileSync(new URL('../src/components/WokinNav.tsx', import.meta.url), 'utf8')
  const nativeWrapper = readFileSync(new URL('../node_modules/@payloadcms/next/dist/elements/Nav/NavWrapper/index.js', import.meta.url), 'utf8')

  assert.match(component, /import\s+\{\s*NavWrapper\s*\}\s+from\s+'@payloadcms\/next\/client'/)
  assert.match(component, /<NavWrapper\s+baseClass="nav">/)
  assert.match(component, /<nav\s+className="nav__wrap\s+wokin-nav"/)
  assert.doesNotMatch(component, /<aside\b/)
  assert.match(nativeWrapper, /_jsx\("aside"/)
  assert.match(nativeWrapper, /className: t6,\s*ref: navRef/)
  assert.match(nativeWrapper, /!navOpen \? true : undefined/)
})

test('UX-A derives active navigation for exact routes, collection descendants, and intended query variants', () => {
  const dashboard = NAVIGATION_SECTIONS[0]!.items[0]!
  const products = NAVIGATION_SECTIONS[1]!.items[0]!
  const changes = NAVIGATION_SECTIONS[2]!.items[1]!

  assert.equal(isNavigationItemActive(dashboard, '/admin', ''), true)
  assert.equal(isNavigationItemActive(dashboard, '/admin/category-workspace', ''), false)
  assert.equal(isNavigationItemActive(products, '/admin/collections/products/abc-123', ''), true)
  assert.equal(isNavigationItemActive(changes, '/admin/collections/review-requests/queue', '?view=changes'), true)
  assert.equal(isNavigationItemActive(changes, '/admin/collections/review-requests/queue', '?view=completed'), false)
})

test('UX-A exposes semantic capability-filtered navigation sections without inventing destinations', () => {
  const readonly = getVisibleNavigationSections({ active: true, role: 'readonly' })
  const owner = getVisibleNavigationSections({ active: true, role: 'owner' })

  assert.ok(readonly.every((section) => section.items.length > 0))
  assert.equal(readonly.flatMap((section) => section.items).some((item) => item.label === 'Danh mục'), false)
  assert.equal(owner.flatMap((section) => section.items).some((item) => item.label === 'Danh mục'), true)
  assert.ok(owner.flatMap((section) => section.items).every((item) => item.href.startsWith('/admin')))
})

test('UX-2 keeps custom admin styling out of native Payload selectors', () => {
  const stylesheet = readFileSync(new URL('../src/app/(payload)/custom.scss', import.meta.url), 'utf8')

  assert.doesNotMatch(stylesheet, /^:where\(/m)
  assert.doesNotMatch(stylesheet, /^\s*\*\s*(?:,|\{)/m)
})

test('UX-2 config replaces Payload native navigation and dashboard instead of appending competing surfaces', () => {
  assert.equal(adminComponents.Nav, '/components/WokinNav#WokinNav')
  assert.equal('afterNavLinks' in adminComponents, false)
  assert.equal('beforeDashboard' in adminComponents, false)
  assert.equal(adminComponents.views?.dashboard?.Component, '/components/WokinDashboardIntro#WokinDashboardIntro')
})

test('UX-3 dashboard has database-backed operational metric definitions', () => {
  const metrics = dashboardMetricDefinitions({ active: true, role: 'owner' })
  assert.ok(metrics.some((metric) => metric.label === 'Tổng sản phẩm' && metric.collection === 'products'))
  assert.ok(metrics.every((metric) => metric.href.startsWith('/admin/collections/')))
})
