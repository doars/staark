import build from '../../.scripts/esbuild.js'

const files = [{
  from: 'src/index.ts',
  to: 'dst/staark-common.js',
}, {
  format: 'iife',
  from: 'src/index.iife.ts',
  to: 'dst/staark-common.iife.js',
}]

for (const file of files) {
  await build(file)
}
