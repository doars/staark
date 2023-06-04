import build from '../../.scripts/postcss.js'

const files = [{
  from: 'src/index.css',
  to: 'dst/components.css',
}]

for (const file of files) {
  await build(file)
}
