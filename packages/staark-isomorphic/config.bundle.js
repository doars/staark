import bundle from '../../.scripts/bundle.js'

bundle([{
  entryPoints: 'src/index.js',
  outfile: 'dst/staark-isomorphic.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.iife.js',
  outfile: 'dst/staark-isomorphic.iife.js',
}])
