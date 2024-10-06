import build from '../../.scripts/esbuild.js'

const files = [{
  from: 'src/snabbdom.base.ts',
  to: 'dst/snabbdom.base.js',
}, {
  from: 'src/hyperapp.base.ts',
  to: 'dst/hyperapp.base.js',
}, {
  from: 'src/staark-patch.base.ts',
  to: 'dst/staark-patch.base.js',
}, {
  from: 'src/staark.base.ts',
  to: 'dst/staark.base.js',
}]

for (const file of files) {
  await build(file)
}
