import build from '../../.scripts/esbuild.js'

const files = [{
  from: 'src/index.base.ts',
  to: 'dst/tiedliene.base.js',
}, {
  format: 'iife',
  from: 'src/index.base.iife.ts',
  to: 'dst/tiedliene.base.iife.js',
}, {
  from: 'src/index.ts',
  to: 'dst/tiedliene.js',
}, {
  format: 'iife',
  from: 'src/index.iife.ts',
  to: 'dst/tiedliene.iife.js',
}]

for (const file of files) {
  await build(file)
}
