const esbuild = require('esbuild');

const esmPackagesToBundle = [
  'jose',
  'jwks-rsa',
  'firebase-admin',
];

const externalPlugin = {
  name: 'external-except-esm',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, args => {
      const isBundledEsm = esmPackagesToBundle.some(pkg => 
        args.path === pkg || args.path.startsWith(pkg + '/')
      );
      if (isBundledEsm) {
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
    plugins: [externalPlugin],
    sourcemap: true,
    outfile: 'dist/server.cjs',
  });
  console.log('Server build complete: dist/server.cjs');
}

build().catch((err) => {
  console.error('Server build failed:', err);
  process.exit(1);
});


