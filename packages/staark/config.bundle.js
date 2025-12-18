import bundle from '../../helpers/bundle.js'

bundle([{
  entrypoints: 'src/index.base.js',
  outfile: 'dst/staark.base.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.base.iife.js',
  outfile: 'dst/staark.base.iife.js',
}, {
  entrypoints: 'src/index.js',
  outfile: 'dst/staark.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.iife.js',
  outfile: 'dst/staark.iife.js',
}])
