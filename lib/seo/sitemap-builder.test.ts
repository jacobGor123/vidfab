import assert from 'node:assert/strict'
import { routing } from '../../i18n/routing'
import { seoToolSlugs } from '../tools/seo-tool-configs'
import { collectPaginatedRows } from '../data/collect-paginated-rows'
import { getLocalizedUrl } from './alternate-links'
import { englishOnlyPublicRoutes } from './english-only-routes'
import {
  buildBlogSitemapEntries,
  buildEnglishOnlySitemapEntries,
  buildLocalizedSitemapEntries,
  buildSitemap,
  localizedSitemapRoutes,
} from './sitemap-builder'

async function main() {
  assert.equal(new URL(getLocalizedUrl('/', 'en')).pathname, '/')
  assert.equal(new URL(getLocalizedUrl('/', 'zh')).pathname, '/zh')
  assert.equal(new URL(getLocalizedUrl('/', 'ja')).pathname, '/ja')
  assert.equal(new URL(getLocalizedUrl('/', 'de')).pathname, '/de')

  const localizedEntries = buildLocalizedSitemapEntries()
  const expectedLocalizedCount = localizedSitemapRoutes.length * routing.locales.length

  assert.equal(localizedEntries.length, expectedLocalizedCount)
  assert.equal(new Set(localizedEntries.map((entry) => entry.url)).size, expectedLocalizedCount)
  assert.ok(localizedEntries.every((entry) => new URL(entry.url).pathname !== '/tools/sora2'))

  for (const entry of localizedEntries) {
    const languages = entry.alternates?.languages
    assert.ok(languages)
    assert.deepEqual(Object.keys(languages).sort(), ['de', 'en', 'ja', 'x-default', 'zh'])
    assert.equal(languages.en, languages['x-default'])
    assert.ok(Object.values(languages).includes(entry.url))
    assert.ok(!('lastModified' in entry))
    assert.ok(!('changeFrequency' in entry))
    assert.ok(!('priority' in entry))
  }

  const englishOnlyEntries = buildEnglishOnlySitemapEntries()
  assert.equal(englishOnlyEntries.length, englishOnlyPublicRoutes.length)
  assert.ok(englishOnlyEntries.every((entry) => !entry.alternates))
  assert.ok(
    englishOnlyEntries.every((entry) => {
      const pathname = new URL(entry.url).pathname
      return !routing.locales.some((locale) => pathname.startsWith(`/${locale}/`))
    }),
  )
  assert.deepEqual(
    seoToolSlugs.map((slug) => `/tools/${slug}`).sort(),
    englishOnlyPublicRoutes.filter((route) => route.startsWith('/tools/')).sort(),
  )

  const posts = Array.from({ length: 26 }, (_, index) => ({
    slug: `post-${index + 1}`,
  }))
  const generatedSitemap = buildSitemap(posts)
  const blogPostEntries = generatedSitemap.filter((entry) =>
    new URL(entry.url).pathname.startsWith('/blog/post-'),
  )

  assert.equal(blogPostEntries.length, posts.length)
  assert.equal(
    generatedSitemap.length,
    expectedLocalizedCount + englishOnlyPublicRoutes.length + 1 + posts.length,
  )
  assert.ok(generatedSitemap.every((entry) => !('changeFrequency' in entry)))
  assert.ok(generatedSitemap.every((entry) => !('priority' in entry)))
  assert.ok(generatedSitemap.every((entry) => !('lastModified' in entry)))

  const blogListEntry = generatedSitemap.find((entry) => new URL(entry.url).pathname === '/blog')
  assert.ok(blogListEntry)
  assert.ok(!blogListEntry.alternates)

  const [blogEntry] = buildBlogSitemapEntries([{ slug: 'article' }])
  assert.ok(!('lastModified' in blogEntry))

  const sourceRows = Array.from({ length: 2005 }, (_, index) => index)
  const requestedRanges: Array<[number, number]> = []
  const paginatedRows = await collectPaginatedRows(async (from, to) => {
    requestedRanges.push([from, to])
    return sourceRows.slice(from, to + 1)
  }, 1000)

  assert.deepEqual(paginatedRows, sourceRows)
  assert.deepEqual(requestedRanges, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ])

  console.log('sitemap-builder tests: OK')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
