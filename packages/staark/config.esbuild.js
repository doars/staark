import build from '../../.scripts/esbuild.js'

const files = [{
  from: 'src/index.base.ts',
  to: 'dst/staark.base.js',
}, {
  format: 'iife',
  from: 'src/index.base.iife.ts',
  to: 'dst/staark.base.iife.js',
}, {
  from: 'src/index.ts',
  to: 'dst/staark.js',
}, {
  format: 'iife',
  from: 'src/index.iife.ts',
  to: 'dst/staark.iife.js',
}]

for (const file of files) {
  await build(file)
}
