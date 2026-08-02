import appModule from '../dist/server.cjs';

export default async function handler(req, res) {
  // If esbuild bundles as cjs, it might put exports under default or on the module itself
  const app = appModule.default || appModule;
  const initPromise = appModule.initPromise;
  
  if (initPromise) {
    await initPromise;
  }
  
  return app(req, res);
}
