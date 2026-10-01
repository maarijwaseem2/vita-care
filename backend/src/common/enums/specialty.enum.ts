/**
 * Medical departments / specialties offered by Vita Care.
 * These map to the department cards on the landing page and are what the
 * AI Doctor recommends after analysing a patient's symptoms.
 *
 * NOTE: adding a value here requires a migration (Postgres enum type).
 */
export enum Specialty {
  NEUROLOGY = 'Neurology',
  HEART_CARE = 'Heart Care',
  OSTEOPOROSIS = 'Osteoporosis',
  ENT = 'ENT',
  GENERAL = 'General Physician',
  PEDIATRICS = 'Pediatrics',
  GYNECOLOGY = 'Gynecology',
  DERMATOLOGY = 'Dermatology',
  PSYCHIATRY = 'Psychiatry',
  PHYSIOTHERAPY = 'Physiotherapy',
  RADIOLOGY = 'Radiology',
}
