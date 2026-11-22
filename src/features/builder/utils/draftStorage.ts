// Where the local draft lives, shared by its provider and the header's count.
// v2: part ids became `${component}-${dbId}` when the catalog moved to the API
export const DRAFT_KEY = 'rpp:build:v2'
// Fired on window after each write of the draft, so readers in this tab update
// (other tabs get the browser's storage event)
export const DRAFT_CHANGE_EVENT = 'rpp:draft-change'
