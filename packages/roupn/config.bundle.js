import bundle from '../../helpers/bundle.js'

bundle([{
  entrypoints: 'src/index.base.js',
  outfile: 'dst/roupn.base.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.base.iife.js',
  outfile: 'dst/roupn.base.iife.js',
}, {
  entrypoints: 'src/index.js',
  outfile: 'dst/roupn.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.iife.js',
  outfile: 'dst/roupn.iife.js',
}, {
  format: 'iife',
  entrypoints: 'exm/client.js',
  outfile: 'exm/client.iife.js',
}])
