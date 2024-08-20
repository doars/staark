import build from '../../.scripts/esbuild.js'

const files = [{
  from: 'src/index.base.ts',
  to: 'dst/vroagn.base.js',
}, {
  format: 'iife',
  from: 'src/index.base.iife.ts',
  to: 'dst/vroagn.base.iife.js',
}, {
  from: 'src/index.ts',
  to: 'dst/vroagn.js',
}, {
  format: 'iife',
  from: 'src/index.iife.ts',
  to: 'dst/vroagn.iife.js',
}]

for (const file of files) {
  await build(file)
}
