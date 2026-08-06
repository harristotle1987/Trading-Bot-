const esbuild = require('esbuild');

const externalExceptPlugin = {
  name: 'external-except',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, args => {
      // Inline/bundle pure ESM dependencies and firebase-admin/jwks-rsa/jose stack to prevent ERR_REQUIRE_ESM on Vercel
      const isEsmStack = 
        args.path === 'jose' ||
        args.path.startsWith('jose/') ||
        args.path === 'jwks-rsa' ||
        args.path.startsWith('jwks-rsa/') ||
        args.path === 'firebase-admin' ||
        args.path.startsWith('firebase-admin/');

      if (isEsmStack) {
        return undefined; // Let esbuild bundle it
      }
      return { external: true }; // Keep other node_modules external
    });
  }
};

async function build() {
  console.log('Building server with esbuild...');
  await esbuild.build({
    entryPoints: ['server.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    plugins: [externalExceptPlugin],
    sourcemap: true,
    outfile: 'dist/server.cjs',
  });
  console.log('Server build complete: dist/server.cjs');
}

build().catch((err) => {
  console.error('Server build failed:', err);
  process.exit(1);
});
