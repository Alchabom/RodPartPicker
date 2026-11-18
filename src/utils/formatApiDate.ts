// The API's timestamps are UTC but may carry no offset; without one, JS reads them as local time
export function formatApiDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  const utc = /(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`
  return new Intl.DateTimeFormat(undefined, options).format(new Date(utc))
}
