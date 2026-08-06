const esbuild = require('esbuild');

async function build() {
  console.log('Building server with esbuild...');
  await esbuild.build({
    entryPoints: ['server.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    sourcemap: true,
    outfile: 'dist/server.cjs',
  });
  console.log('Server build complete: dist/server.cjs');
}

build().catch((err) => {
  console.error('Server build failed:', err);
  process.exit(1);
});

