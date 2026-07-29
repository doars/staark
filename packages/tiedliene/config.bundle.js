import bundle from '../../helpers/bundle.js'

bundle([{
  entryPoints: 'src/index.base.js',
  outfile: 'dst/tiedliene.base.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.base.iife.js',
  outfile: 'dst/tiedliene.base.iife.js',
}, {
  entryPoints: 'src/index.js',
  outfile: 'dst/tiedliene.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.iife.js',
  outfile: 'dst/tiedliene.iife.js',
}])
