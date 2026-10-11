import assert from 'node:assert/strict'
import test from 'node:test'

import { globalsToPublicSettings, isSafeHref, publicSettingsToGlobals, validatePublicSettings } from '../src/catalog/site-settings-sync.js'

const settings = {
  siteName: 'WOKIN TOOLS Việt Nam', defaultTitle: 'Tiêu đề', defaultDescription: 'Mô tả',
  legalName: 'CÔNG TY CỔ PHẦN THIẾT BỊ CÔNG NGHIỆP WORKMAN', address: 'Địa chỉ', taxCode: '3702963744',
  hotline: '0978.390.339', email: '', zaloUrl: 'https://zalo.me/0978390339', social: { facebook: '', youtube: '', tiktok: '' },
}
const navigation = {
  header: [{ id: 'a', label: 'Hỗ trợ', url: '/gioi-thieu/', newTab: false, children: [{ id: 'b', label: 'Liên hệ', url: '/lien-he/', newTab: false }] }],
  footer: [{ id: 'c', label: 'Facebook', url: 'https://www.facebook.com/workmanjsc/', newTab: true }],
}

test('site settings export maps admin globals to the public JSON shape without array row ids', () => {
  const output = globalsToPublicSettings(settings, navigation)
  assert.equal(output.version, 1)
  assert.deepEqual(output.navigation.header[0], { label: 'Hỗ trợ', url: '/gioi-thieu/', newTab: false, children: [{ label: 'Liên hệ', url: '/lien-he/', newTab: false }] })
  assert.deepEqual(output.navigation.footer[0], { label: 'Facebook', url: 'https://www.facebook.com/workmanjsc/', newTab: true })
  assert.deepEqual(validatePublicSettings(output), [])
  assert.deepEqual(globalsToPublicSettings(publicSettingsToGlobals(output).siteSettings, publicSettingsToGlobals(output).navigation), output)
})

test('site settings export refuses unsafe links and missing required company details', () => {
  assert.equal(isSafeHref('javascript:alert(1)'), false)
  assert.equal(isSafeHref('//evil.example'), false)
  assert.equal(isSafeHref('/san-pham/'), true)
  const output = globalsToPublicSettings({ ...settings, hotline: '' }, { header: [{ label: 'X', url: 'javascript:alert(1)' }], footer: [] })
  const problems = validatePublicSettings(output)
  assert.ok(problems.some((problem) => problem.includes('Hotline')))
  assert.ok(problems.some((problem) => problem.includes('javascript:alert(1)')))
})
