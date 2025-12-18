import bundle from '../../helpers/bundle.js'

bundle([{
  entrypoints: 'src/index.js',
  outfile: 'dst/staark-isomorphic.js',
}, {
  format: 'iife',
  entrypoints: 'src/index.iife.js',
  outfile: 'dst/staark-isomorphic.iife.js',
}])
