import build from '../../.scripts/esbuild.js'

const files = [{
  from: 'src/staark.base.ts',
  to: 'dst/staark.base.js',
}, {
  from: 'src/staark.ts',
  to: 'dst/staark.js',
}, {
  from: 'src/hyperapp.base.ts',
  to: 'dst/hyperapp.base.js',
}]

for (const file of files) {
  await build(file)
}
