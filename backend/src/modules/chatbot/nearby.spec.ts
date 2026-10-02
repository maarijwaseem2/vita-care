import { nearbyDoctorsLine } from './nearby';

const docs = [
  { title: 'Dr', firstName: 'Saif', lastName: 'Ur Rehman', address: 'Clifton, Karachi', city: 'Karachi', proximity: 'area' as const },
  { title: 'Dr', firstName: 'Hina', lastName: 'Shah', address: 'Gulshan-e-Iqbal, Karachi', city: 'Karachi', proximity: 'city' as const },
];

describe('nearby doctors line', () => {
  it('names the department and the nearest doctors in Roman Urdu', () => {
    const line = nearbyDoctorsLine('roman-ur', 'Neurology', docs, true);
    expect(line).toBe('Aap Neurology ke doctor ko dikhayein. Aap ke qareeb: Dr Saif Ur Rehman (Clifton, Karachi) aur Dr Hina Shah (Gulshan-e-Iqbal, Karachi). Neeche se appointment book kar sakte hain.');
  });
  it('asks for a location when the profile has none', () => {
    const line = nearbyDoctorsLine('en', 'ENT', docs.map((d) => ({ ...d, proximity: null })), false);
    expect(line).toMatch(/^Please see a ENT doctor\. Recommended: /);
    expect(line).toMatch(/Add your city and area in your profile/);
  });
  it('writes Urdu script for Urdu', () => {
    expect(nearbyDoctorsLine('ur', 'ENT', docs, true)).toMatch(/^آپ ENT کے ڈاکٹر کو دکھائیں۔ آپ کے قریب/);
  });
});
