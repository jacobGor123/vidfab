export type PageFetcher<T> = (from: number, to: number) => Promise<T[]>

export async function collectPaginatedRows<T>(
  fetchPage: PageFetcher<T>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error('pageSize must be a positive integer')
  }

  const rows: T[] = []

  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1)

    if (page.length > pageSize) {
      throw new Error('Page fetcher returned more rows than requested')
    }

    rows.push(...page)

    if (page.length < pageSize) {
      return rows
    }
  }
}
