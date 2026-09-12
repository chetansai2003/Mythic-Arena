export function startGameWorker(games, logger, intervalMs = 500) {
  let pending = null;
  let stopped = false;
  const run = () => {
    if (pending || stopped) return;
    pending = games
      .work()
      .catch(() =>
        logger.warn(
          { operation: 'game_worker' },
          'Game work deferred; dependencies will be retried',
        ),
      )
      .finally(() => {
        pending = null;
      });
  };
  const interval = setInterval(run, intervalMs);
  run();
  return async () => {
    stopped = true;
    clearInterval(interval);
    await pending;
  };
}
