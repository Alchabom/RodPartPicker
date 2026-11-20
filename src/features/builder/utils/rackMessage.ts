// The API's messages stay as they are (its tests depend on them); this maps them to Rack wording.
const RACK_MESSAGES: Record<string, string> = {
  'Already published': 'Already on the Rack',
  'Add all five parts before publishing': 'Add all five parts before posting',
  'Not published': 'Not on the Rack',
}

export function rackMessage(message: string): string {
  return RACK_MESSAGES[message] ?? message
}
