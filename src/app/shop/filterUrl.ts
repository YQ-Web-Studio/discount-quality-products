export function stringifyFilterParams(params: URLSearchParams): string {
  return params.toString().replace(/%2C/gi, ",");
}

export function buildShopUrl(params: URLSearchParams): string {
  const query = stringifyFilterParams(params);
  return query ? `/shop?${query}` : "/shop";
}

export function setPageParam(params: URLSearchParams, page: number): void {
  if (page <= 1) {
    params.delete("page");
    return;
  }

  params.set("page", page.toString());
}
