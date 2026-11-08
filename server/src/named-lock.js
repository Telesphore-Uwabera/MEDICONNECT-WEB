/**
 * MySQL GET_LOCK is per connection. pool.query checks a connection out and
 * returns it, so lock and unlock must share one checked-out connection.
 * The work may use other pool queries; this connection is held until release.
 */
export async function withNamedLock(db, name, work) {
  if (typeof db?.getConnection !== "function") {
    throw new Error("Named locks require a pool that can check out one connection.");
  }
  const connection = await db.getConnection();
  const lockName = String(name || "lock").slice(0, 64);
  let acquired = false;
  try {
    const [rows] = await connection.query("SELECT GET_LOCK(?, 5) AS locked", [lockName]);
    acquired = Number(rows?.[0]?.locked) === 1;
    if (!acquired) {
      const error = new Error("That action is already in progress. Try again.");
      error.status = 409;
      throw error;
    }
    return await work(connection);
  } finally {
    try {
      if (acquired) await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
    } catch {
      // Still return the connection so the pool is not left one short.
    }
    connection.release?.();
  }
}
