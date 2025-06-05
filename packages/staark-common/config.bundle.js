import bundle from '../../helpers/bundle.js'

bundle([{
  entryPoints: 'src/index.js',
  outfile: 'dst/staark-common.js',
}, {
  format: 'iife',
  entryPoints: 'src/index.iife.js',
  outfile: 'dst/staark-common.iife.js',
}])
