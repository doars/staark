import bundle from '../../helpers/bundle.js'

bundle([{
  entrypoints: 'src/index.base.js',
  outfile: 'dst/vroagn.base.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.base.iife.js',
  outfile: 'dst/vroagn.base.iife.js',
}, {
  entrypoints: 'src/index.js',
  outfile: 'dst/vroagn.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.iife.js',
  outfile: 'dst/vroagn.iife.js',
}])
