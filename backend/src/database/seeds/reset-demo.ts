/**
 * npm run demo:reset
 *
 * Puts the demo back to its starting state before a rehearsal, the live demo
 * or a Maestro run, without wiping the database:
 *  - pending nurse (Rizwana) and pending doctors back in the verification queue
 *  - today's accepted home visit (HN-DEMO0003) ready to record vitals again, dated today
 *  - rows created by browser / Maestro tests removed
 */
import 'reflect-metadata';
import dataSource from '../../config/data-source';
import { clinicNow } from '../../common/utils/schedule';

async function run() {
  const ds = await dataSource.initialize();
  const q = (sql: string, p: unknown[] = []) => ds.query(sql, p);
  await q(`UPDATE nurses SET verification_status = 'pending', verified_at = NULL WHERE user_id IN (SELECT id FROM users WHERE email = 'nurse.pending@vitacare.test')`);
  await q(`UPDATE doctors SET verification_status = 'pending', verified_at = NULL WHERE user_id IN (SELECT id FROM users WHERE email IN ('dr.pending.hassan@vitacare.test','dr.pending.mahnoor@vitacare.test'))`);
  await q(
    `UPDATE home_care_requests SET status = 'accepted', visit_date = $1, vitals = NULL, vital_alerts = NULL, alert_level = NULL,
            nurse_notes = NULL, completed_at = NULL,
            nurse_id = (SELECT n.id FROM nurses n JOIN users u ON u.id = n.user_id WHERE u.email = 'nurse@vitacare.test')
      WHERE reference = 'HN-DEMO0003'`,
    [clinicNow().date],
  );
  await q(`UPDATE home_care_requests SET visit_date = ($1::date + 1), status = 'requested', nurse_id = NULL WHERE reference = 'HN-DEMO0002'`, [clinicNow().date]);
  await q(`DELETE FROM home_care_requests WHERE notes ILIKE 'maestro%' OR notes ILIKE 'browser test%'`);
  await q(`DELETE FROM blog_posts WHERE slug LIKE 'maestro-%' OR slug LIKE 'browser-test-%'`);
  await q(`DELETE FROM appointments WHERE patient_name = 'Maestro Tester' OR reason ILIKE 'browser test%' OR reason ILIKE 'e2e%'`);
  await ds.destroy();
  console.log('Demo reset complete.');
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
