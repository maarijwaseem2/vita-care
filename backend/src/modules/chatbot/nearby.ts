import type { ChatLanguage } from './language';

interface NearbyDoctor {
  title?: string | null;
  firstName: string;
  lastName: string;
  address?: string | null;
  city?: string | null;
  proximity?: 'area' | 'city' | null;
}

/**
 * The line added to every assessment: which department, and the nearest doctors by name,
 * in the patient's language. (The model writes the advice; this keeps the referral exact.)
 */
export function nearbyDoctorsLine(lang: ChatLanguage, department: string, doctors: NearbyDoctor[], knowsLocation: boolean): string {
  const names = doctors
    .slice(0, 2)
    .map((d) => {
      const where = [d.address?.split(',')[0]?.trim(), d.city].filter((x, i, a) => x && a.indexOf(x) === i).join(', ');
      return `${d.title ?? 'Dr'} ${d.firstName} ${d.lastName}${where ? ` (${where})` : ''}`;
    })
    .join(lang === 'ur' ? ' اور ' : lang === 'roman-ur' ? ' aur ' : ' and ');
  const near = doctors.some((d) => d.proximity);
  if (lang === 'ur') {
    return `آپ ${department} کے ڈاکٹر کو دکھائیں۔ ${near ? 'آپ کے قریب' : 'تجویز کردہ'}: ${names}۔ نیچے سے اپائنٹمنٹ بک کریں۔` +
      (knowsLocation ? '' : ' اپنے قریب ترین ڈاکٹر دیکھنے کے لیے پروفائل میں شہر اور علاقہ لکھیں۔');
  }
  if (lang === 'roman-ur') {
    return `Aap ${department} ke doctor ko dikhayein. ${near ? 'Aap ke qareeb' : 'Recommended'}: ${names}. Neeche se appointment book kar sakte hain.` +
      (knowsLocation ? '' : ' Apne qareeb ke doctor dekhne ke liye profile mein shehar aur area likhein.');
  }
  return `Please see a ${department} doctor. ${near ? 'Nearest to you' : 'Recommended'}: ${names}. You can book below.` +
    (knowsLocation ? '' : ' Add your city and area in your profile to see the doctors closest to you.');
}
