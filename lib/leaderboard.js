/**
 * The ONE leaderboard ordering, shared by the learner board and the admin board
 * so an organization sees the same ranking on both (§10.5). Mirrors the server's
 * `LeaderboardService.standings`: top three by points, everyone from 4th by
 * course completion %, a points tie broken by who earned it first.
 *
 * Both boards re-derive with this when a department filter is applied, so the
 * per-department top three is computed the same way on each — not the global
 * top three sliced down, which is where the two used to diverge.
 */

/** A points tie goes to whoever earned it first (earlier wins). */
export function earnedFirst(a, b) {
  const av = a.lastEarnedAt;
  const bv = b.lastEarnedAt;
  if (av === bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av < bv ? -1 : 1;
}

/** Top 3 by points, everyone from 4th down by completion %. */
export function rankAllTime(list) {
  const byPoints = [...list].sort(
    (a, b) => b.allTimePoints - a.allTimePoints || earnedFirst(a, b) || b.badges - a.badges,
  );
  const rest = byPoints.slice(3).sort(
    (a, b) =>
      (b.completionPct ?? 0) - (a.completionPct ?? 0) ||
      b.allTimePoints - a.allTimePoints ||
      earnedFirst(a, b) ||
      b.badges - a.badges,
  );
  return [...byPoints.slice(0, 3), ...rest];
}
