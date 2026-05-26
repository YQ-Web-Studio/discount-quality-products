export function stringifyFilterParams(params: URLSearchParams): string {
  return params.toString().replace(/%2C/gi, ",");
}

export function buildCategoryUrl(slug: string, params: URLSearchParams): string {
  const query = stringifyFilterParams(params);
  return query ? `/categories/${slug}?${query}` : `/categories/${slug}`;
}

export function setPageParam(params: URLSearchParams, page: number): void {
  if (page <= 1) {
    params.delete("page");
    return;
  }
  params.set("page", page.toString());
}
