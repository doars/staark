import build from '../../.scripts/esbuild.js'

const files = [{
  from: 'src/index.base.ts',
  to: 'dst/staark-patch.base.js',
}, {
  format: 'iife',
  from: 'src/index.base.iife.ts',
  to: 'dst/staark-patch.base.iife.js',
}, {
  from: 'src/index.ts',
  to: 'dst/staark-patch.js',
}, {
  format: 'iife',
  from: 'src/index.iife.ts',
  to: 'dst/staark-patch.iife.js',
}]

for (const file of files) {
  await build(file)
}
