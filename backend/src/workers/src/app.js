export function createWorkerHandler({
  config = { RELEASE_VERSION: 'local' },
  dependencies,
  lifecycle = { shuttingDown: false },
}) {
  return async (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    if (req.method === 'GET' && req.url === '/health/live')
      return res.end(
        JSON.stringify({
          status: 'alive',
          service: 'worker',
          version: config.RELEASE_VERSION,
          jobs: 'turns_disconnects_results',
        }),
      );
    if (req.method === 'GET' && req.url === '/health/ready') {
      try {
        const status = lifecycle.shuttingDown
          ? { redis: false, mongo: false }
          : await dependencies.check();
        const ready = status.redis && status.mongo;
        res.statusCode = ready ? 200 : 503;
        return res.end(
          JSON.stringify({
            status: ready ? 'ready' : 'not_ready',
            service: 'worker',
            version: config.RELEASE_VERSION,
            dependencies: status,
          }),
        );
      } catch {
        res.statusCode = 503;
        return res.end(JSON.stringify({ status: 'not_ready' }));
      }
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'NOT_FOUND' }));
  };
}
