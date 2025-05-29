import bundle from '../../.scripts/bundle.js'

bundle([{
  entryPoints: 'src/index.base.js',
  outfile: 'dst/roupn.base.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.base.iife.js',
  outfile: 'dst/roupn.base.iife.js',
}, {
  entryPoints: 'src/index.js',
  outfile: 'dst/roupn.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.iife.js',
  outfile: 'dst/roupn.iife.js',
}, {
  format: 'iife',
  entryPoints: 'exm/client.js',
  outfile: 'exm/client.iife.js',
}])
