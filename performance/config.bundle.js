import bundle from '../.scripts/bundle.js'

bundle([{
  entryPoints: 'src/libraries/hyperapp.js',
  outfile: 'dst/hyperapp.js',
}, {
  entryPoints: 'src/libraries/incremental-dom.js',
  outfile: 'dst/incremental-dom.js',
}, {
  entryPoints: 'src/libraries/mithril.js',
  outfile: 'dst/mithril.js',
}, {
  entryPoints: 'src/libraries/snabbdom.js',
  outfile: 'dst/snabbdom.js',
}, {
  entryPoints: 'src/libraries/staark-patch.js',
  outfile: 'dst/staark-patch.js',
}, {
  entryPoints: 'src/libraries/staark.js',
  outfile: 'dst/staark.js',
}, {
  entryPoints: 'src/libraries/superfine.js',
  outfile: 'dst/superfine.js',
}])
