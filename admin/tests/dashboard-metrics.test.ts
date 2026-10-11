import assert from 'node:assert/strict'
import test from 'node:test'

import { dashboardMetricDefinitions } from '../src/lib/dashboardMetrics.js'

test('UX-3 dashboard metrics use real collections and never substitute unauthorized counts', () => {
  const metrics = dashboardMetricDefinitions({ active: true, role: 'owner' })
  assert.deepEqual(metrics.map((metric) => metric.collection), ['products', 'products', 'products', 'products', 'media', 'review-requests'])
  assert.equal(metrics.find((metric) => metric.key === 'mediaPending')?.where?.rightsStatus?.equals, 'pending')
  assert.equal(dashboardMetricDefinitions({ active: true, role: 'readonly' }).find((metric) => metric.key === 'mediaPending')?.restricted, true)
})
