// Query keys for the public published-builds catalog. They live in lib/ because
// both the catalog and the builder (which invalidates them) use them.
export type CatalogParams = { page: number; weight?: number; maxPrice?: number }

export const publishedKeys = {
  all: ['published'] as const,
  list: (params: CatalogParams) => ['published', 'list', params] as const,
  detail: (id: number) => ['published', id] as const,
}
