/**
 * District gazetteer for place filtering.
 *
 * The sheet uses pre-split legacy names (`Nawalparasi`, `Rukum`) in Keywords,
 * so canonical names match the sheet — not the post-split East/West pair.
 * `?district=` filters on inferred districts (see `eventGeography.ts`).
 * A future `District` sheet column would replace inference; canonical names stay.
 */

export const DISTRICTS: string[] = [
  'Achham', 'Arghakhanchi', 'Baglung', 'Baitadi', 'Bajhang', 'Bajura',
  'Banke', 'Bara', 'Bardiya', 'Bhaktapur', 'Bhojpur',
  'Chitwan', 'Dadeldhura', 'Dailekh', 'Dang', 'Darchula', 'Dhading',
  'Dhankuta', 'Dhanusha', 'Dolakha', 'Dolpa', 'Doti',
  'Gorkha', 'Gulmi', 'Humla', 'Ilam', 'Jajarkot', 'Jhapa', 'Jumla',
  'Kailali', 'Kalikot', 'Kanchanpur', 'Kapilvastu', 'Kaski', 'Kathmandu',
  'Kavrepalanchok', 'Khotang', 'Lalitpur', 'Lamjung',
  'Mahottari', 'Makwanpur', 'Manang', 'Morang', 'Mugu', 'Mustang', 'Myagdi',
  'Nawalparasi', 'Nuwakot', 'Okhaldhunga', 'Palpa', 'Panchthar', 'Parsa',
  'Parbat', 'Pyuthan', 'Ramechhap', 'Rasuwa', 'Rautahat', 'Rolpa', 'Rukum',
  'Rupandehi', 'Salyan', 'Sankhuwasabha', 'Saptari', 'Sarlahi', 'Sindhuli',
  'Sindhupalchok', 'Siraha', 'Solukhumbu', 'Sunsari', 'Surkhet', 'Syangja',
  'Tanahun', 'Taplejung', 'Terhathum', 'Udayapur',
]

/** Lowercase alias → canonical district. Includes variant spellings + major cities. */
const ALIAS_TO_DISTRICT: Record<string, string> = {
  'kavre': 'Kavrepalanchok',
  'kavrepalanchowk': 'Kavrepalanchok',
  'sindhupalchowk': 'Sindhupalchok',
  'sindhupalchowk district': 'Sindhupalchok',
  'nawalparasi east': 'Nawalparasi',
  'nawalparasi west': 'Nawalparasi',
  'nawalpur': 'Nawalparasi',
  'parasi': 'Nawalparasi',
  'rukum east': 'Rukum',
  'rukum west': 'Rukum',
  'rukum district': 'Rukum',
  // Major cities appearing as keywords → their district (recall aid, documented).
  'nepalgunj': 'Banke',
  'birgunj': 'Parsa',
  'biratnagar': 'Morang',
  'pokhara': 'Kaski',
  'janakpur': 'Dhanusha',
  'janakpurdham': 'Dhanusha',
  'bhotahiti': 'Kathmandu',
  'ratna park': 'Kathmandu',
  'panauti': 'Kavrepalanchok',
  'tansen': 'Palpa',
  'dhangadhi': 'Kailali',
  'mahendranagar': 'Kanchanpur',
  'nepalgunj, banke': 'Banke',
}

const CANONICAL_SET = new Set(DISTRICTS.map((d) => d.toLowerCase()))

export function canonicalDistrict(raw: string): string | null {
  const key = raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
  if (!key) return null
  if (CANONICAL_SET.has(key)) {
    return DISTRICTS.find((d) => d.toLowerCase() === key) ?? null
  }
  const aliased = ALIAS_TO_DISTRICT[key]
  return aliased ?? null
}

/** Province of each canonical district (legacy grouping matching sheet names). */
export const PROVINCE_OF_DISTRICT: Record<string, string> = {
  'Bhojpur': 'Koshi', 'Dhankuta': 'Koshi', 'Ilam': 'Koshi', 'Jhapa': 'Koshi',
  'Khotang': 'Koshi', 'Morang': 'Koshi', 'Okhaldhunga': 'Koshi', 'Panchthar': 'Koshi',
  'Sankhuwasabha': 'Koshi', 'Solukhumbu': 'Koshi', 'Sunsari': 'Koshi', 'Taplejung': 'Koshi',
  'Terhathum': 'Koshi', 'Udayapur': 'Koshi',
  'Bara': 'Madhesh', 'Dhanusha': 'Madhesh', 'Mahottari': 'Madhesh', 'Parsa': 'Madhesh',
  'Rautahat': 'Madhesh', 'Saptari': 'Madhesh', 'Sarlahi': 'Madhesh', 'Siraha': 'Madhesh',
  'Bhaktapur': 'Bagmati', 'Chitwan': 'Bagmati', 'Dhading': 'Bagmati', 'Dolakha': 'Bagmati',
  'Kathmandu': 'Bagmati', 'Kavrepalanchok': 'Bagmati', 'Lalitpur': 'Bagmati', 'Makwanpur': 'Bagmati',
  'Nuwakot': 'Bagmati', 'Ramechhap': 'Bagmati', 'Rasuwa': 'Bagmati', 'Sindhuli': 'Bagmati',
  'Sindhupalchok': 'Bagmati',
  'Baglung': 'Gandaki', 'Gorkha': 'Gandaki', 'Kaski': 'Gandaki', 'Lamjung': 'Gandaki',
  'Manang': 'Gandaki', 'Mustang': 'Gandaki', 'Myagdi': 'Gandaki', 'Nawalparasi': 'Gandaki/Lumbini',
  'Parbat': 'Gandaki', 'Syangja': 'Gandaki', 'Tanahun': 'Gandaki',
  'Arghakhanchi': 'Lumbini', 'Banke': 'Lumbini', 'Bardiya': 'Lumbini', 'Dang': 'Lumbini',
  'Gulmi': 'Lumbini', 'Kapilvastu': 'Lumbini', 'Palpa': 'Lumbini', 'Pyuthan': 'Lumbini',
  'Rolpa': 'Lumbini', 'Rukum': 'Lumbini/Karnali', 'Rupandehi': 'Lumbini',
  'Dailekh': 'Karnali', 'Dolpa': 'Karnali', 'Humla': 'Karnali', 'Jajarkot': 'Karnali',
  'Jumla': 'Karnali', 'Kalikot': 'Karnali', 'Mugu': 'Karnali', 'Salyan': 'Karnali',
  'Surkhet': 'Karnali',
  'Achham': 'Sudurpashchim', 'Baitadi': 'Sudurpashchim', 'Bajhang': 'Sudurpashchim',
  'Bajura': 'Sudurpashchim', 'Dadeldhura': 'Sudurpashchim', 'Darchula': 'Sudurpashchim',
  'Doti': 'Sudurpashchim', 'Kailali': 'Sudurpashchim', 'Kanchanpur': 'Sudurpashchim',
}
