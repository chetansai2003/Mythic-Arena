export function createAuthMiddleware(auth) {
  return async (req, _res, next) => {
    try {
      req.auth = await auth.authenticate(req.headers.authorization);
      next();
    } catch (error) {
      next(error);
    }
  };
}
