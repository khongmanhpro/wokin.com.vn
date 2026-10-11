import assert from 'node:assert/strict'
import test from 'node:test'
import type { CollectionBeforeChangeHook } from 'payload'

import { enforceRedirectPolicy, isCanonicalInternalPath } from '../src/access/redirectPolicy.js'
import { Redirects } from '../src/collections/Redirects.js'

const hook = enforceRedirectPolicy as CollectionBeforeChangeHook

function requestWithPages(pages: Array<{ docs: unknown[]; hasNextPage: boolean; nextPage?: number }>) {
  const calls: Array<Record<string, unknown>> = []
  return {
    calls,
    req: {
      payload: {
        find: async (options: Record<string, unknown>) => {
          calls.push(options)
          return pages[(options.page as number) - 1]
        },
      },
    },
  }
}

test('R5.4b validates canonical paths and rejects active redirect cycles using every Local API page', async () => {
  for (const invalidPath of ['', 'about', '//example.com', 'https://example.com', '/a/../b', '/a%2F..%2Fb', '/a?x=1', '/a#section', '/has space', '/has\ncontrol']) {
    assert.equal(isCanonicalInternalPath(invalidPath), false, invalidPath)
  }
  assert.equal(isCanonicalInternalPath('/danh-muc/may-khoan'), true)

  const { req, calls } = requestWithPages([
    { docs: [{ id: 'current', fromPath: '/old', toPath: '/ignored', active: true }, { id: 'first', fromPath: '/b', toPath: '/c', active: true }], hasNextPage: true, nextPage: 2 },
    { docs: [{ id: 'second', fromPath: '/c', toPath: '/a', active: true }, { id: 'inactive', fromPath: '/a', toPath: '/a', active: false }], hasNextPage: false },
  ])

  await assert.rejects(
    hook({ data: { toPath: '/b' }, originalDoc: { id: 'current', fromPath: '/a', toPath: '/old', active: true }, req } as never),
    /cycle/i,
  )
  assert.deepEqual(calls.map(({ collection, page, limit, overrideAccess }) => ({ collection, page, limit, overrideAccess })), [
    { collection: 'redirects', page: 1, limit: 100, overrideAccess: false },
    { collection: 'redirects', page: 2, limit: 100, overrideAccess: false },
  ])

  await assert.doesNotReject(
    hook({ data: { active: false, toPath: '/a' }, originalDoc: { id: 'current', fromPath: '/a', toPath: '/old', active: true }, req } as never),
  )
  assert.equal(Redirects.hooks?.beforeChange?.[0], enforceRedirectPolicy)
})
