import bundle from '../helpers/bundle.js'

bundle([{
  entrypoints: 'src/libraries/hyperapp.js',
  outfile: 'dst/hyperapp.js',
}, {
  entrypoints: 'src/libraries/incremental-dom.js',
  outfile: 'dst/incremental-dom.js',
}, {
  entrypoints: 'src/libraries/mithril.js',
  outfile: 'dst/mithril.js',
}, {
  entrypoints: 'src/libraries/snabbdom.js',
  outfile: 'dst/snabbdom.js',
}, {
  entrypoints: 'src/libraries/staark-patch.js',
  outfile: 'dst/staark-patch.js',
}, {
  entrypoints: 'src/libraries/staark.js',
  outfile: 'dst/staark.js',
}, {
  entrypoints: 'src/libraries/superfine.js',
  outfile: 'dst/superfine.js',
}])
