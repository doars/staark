import bundle from '../../helpers/bundle.js'

bundle([{
  entrypoints: 'src/index.base.js',
  outfile: 'dst/staark-patch.base.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.base.iife.js',
  outfile: 'dst/staark-patch.base.iife.js',
}, {
  entrypoints: 'src/index.js',
  outfile: 'dst/staark-patch.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.iife.js',
  outfile: 'dst/staark-patch.iife.js',
}])
