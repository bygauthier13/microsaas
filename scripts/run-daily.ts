/**
 * Run the daily job directly (for hosts without Vercel Cron), e.g. from system cron:
 *   0 6 * * * cd /srv/repairclock && npm run cron:daily
 */
import { runDailyJobs } from "../src/lib/jobs/daily";

runDailyJobs()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
