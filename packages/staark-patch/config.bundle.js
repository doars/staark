import bundle from '../../.scripts/bundle.js'

bundle([{
  entryPoints: 'src/index.base.js',
  outfile: 'dst/staark-patch.base.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.base.iife.js',
  outfile: 'dst/staark-patch.base.iife.js',
}, {
  entryPoints: 'src/index.js',
  outfile: 'dst/staark-patch.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.iife.js',
  outfile: 'dst/staark-patch.iife.js',
}])
