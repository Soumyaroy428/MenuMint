let appPromise;

export default async function handler(req, res) {
  if (!appPromise) {
    appPromise = import('../server/dist/app.js').then((m) => m.app);
  }
  const app = await appPromise;
  return app(req, res);
}
