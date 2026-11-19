// The static rig shown in the landing page hero. Real catalog parts, copied
// from the seed migrations. They pass check_build in
// api/app/compatibility/rules.py with no warnings:
//   curl "http://localhost:3001/api/compatibility/check?rodId=189&reelId=1&flyLineId=7"
// sampleRig.test.ts re-checks the weights and water tags.

export interface SampleRigPart {
  type: 'rod' | 'reel' | 'line'
  dbId: number // catalog id, so the rig can be re-checked against the API
  label: 'Rod' | 'Reel' | 'Line'
  name: string // brand + model, as shown
  specs: string[]
  price: number
  water: 'fresh' | 'salt' | 'both'
  lineWeight?: number // rod and line
  minLineWeight?: number // reel
  maxLineWeight?: number // reel
}

export const SAMPLE_RIG: { title: string; parts: SampleRigPart[] } = {
  title: 'Smokies 4wt',
  parts: [
    {
      type: 'rod',
      dbId: 189,
      label: 'Rod',
      name: 'Redington Classic Trout 486-4',
      specs: ['8′6″', '4 wt', 'Medium', '4 pc'],
      price: 199.99,
      water: 'fresh',
      lineWeight: 4,
    },
    {
      type: 'reel',
      dbId: 1,
      label: 'Reel',
      name: 'Lamson Liquid S',
      specs: ['2–4 wt', 'Fresh'],
      price: 149.0,
      water: 'fresh',
      minLineWeight: 2,
      maxLineWeight: 4,
    },
    {
      type: 'line',
      dbId: 7,
      label: 'Line',
      name: 'RIO Avid Trout-Gold',
      specs: ['4 wt', 'Floating', '126 gr'],
      price: 69.0,
      water: 'fresh',
      lineWeight: 4,
    },
  ],
}
