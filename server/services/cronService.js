const { syncDiscover } = require('./syncService');

// Runs fn once at the next occurrence of (dayOfMonth, hour) and then every 30 days.
const scheduleMonthly = (dayOfMonth, hour, fn) => {
  const msUntilNext = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hour, 0, 0, 0);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next - now;
  };

  const schedule = () => {
    setTimeout(async () => {
      try { await fn(); } catch (e) { console.error('[cron] monthly sync failed:', e.message); }
      setInterval(async () => {
        try { await fn(); } catch (e) { console.error('[cron] monthly sync failed:', e.message); }
      }, 30 * 24 * 60 * 60 * 1000);
    }, msUntilNext());
  };

  schedule();
  console.log(`[cron] Monthly new-release sync scheduled (day ${dayOfMonth} of each month at ${hour}:00)`);
};

const syncNewReleases = async () => {
  if (!process.env.TMDB_API_KEY) {
    console.warn('[cron] TMDB_API_KEY not set — skipping monthly sync');
    return;
  }
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearFrom = prevMonth.getFullYear();
  const yearTo = now.getFullYear();

  console.log(`[cron] Starting monthly new-release sync (${yearFrom}–${yearTo})…`);
  const result = await syncDiscover({
    targetCount: 5000,
    minVotes: 10,
    yearFrom,
    yearTo,
    withDetails: true,
  });
  console.log(`[cron] Monthly sync done — ${result.stored} stored, ${result.skipped} skipped, ${result.failed} failed`);
};

const initCron = () => {
  // Run on the 1st of every month at 3:00 AM
  scheduleMonthly(1, 3, syncNewReleases);
};

module.exports = { initCron, syncNewReleases };
