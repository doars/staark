import bundle from '../../helpers/bundle.js'

bundle([{
  entryPoints: 'src/index.base.js',
  outfile: 'dst/vroagn.base.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.base.iife.js',
  outfile: 'dst/vroagn.base.iife.js',
}, {
  entryPoints: 'src/index.js',
  outfile: 'dst/vroagn.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.iife.js',
  outfile: 'dst/vroagn.iife.js',
}])
