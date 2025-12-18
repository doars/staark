import bundle from '../../helpers/bundle.js'

bundle([{
  entrypoints: 'src/index.base.js',
  outfile: 'dst/tiedliene.base.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.base.iife.js',
  outfile: 'dst/tiedliene.base.iife.js',
}, {
  entrypoints: 'src/index.js',
  outfile: 'dst/tiedliene.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.iife.js',
  outfile: 'dst/tiedliene.iife.js',
}])
