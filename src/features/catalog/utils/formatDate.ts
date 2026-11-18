const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

// The API's timestamps are UTC but may carry no offset; without one, JS reads them as local time
export const formatDate = (iso: string) =>
  dateFormat.format(new Date(/(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`))
