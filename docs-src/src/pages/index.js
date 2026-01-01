// Import from node.
import { readFileSync } from 'fs';

// Import components.
import card from '../components/card.js'
import carousel from '../components/carousel.js'
import code from '../components/code.js'
import logo from '../components/logo.js'
import section from '../components/section.js'
import template from '../components/template.js'
import window from '../components/window.js'

// Import renderer.
import { render as r } from '../utils/RenderUtils.js'

// Import icon components.
const iconCopy = readFileSync('src/icons/copy-outline.svg')
const iconGithub = readFileSync('src/icons/logo-github.svg')

export default (
) => {
  return template(
    // Meta data.
    {
      description: 'A set of teeny-tiny libraries for building web apps with minimal concepts and tiny sizes.',
      keywords: ['staark', 'javascript', 'minimal', 'modular', 'small', 'declarative', 'reactive', 'front-end', 'framework'],
      title: 'Staark | A set of teeny-tiny libraries for building web apps',
    },

    // Page content.
    r('main', [
      section([
        r('div', {
          class: 'logo'
        }, logo()),

        r('h1', 'A set of teeny-tiny libraries for building web apps.'),
        r('p', 'The goal of this toolkit is minimal amount of concepts to learn, making the system incredibly easy to reason with, and comes in at a miniscule size when compressed.'),

        r('div', {
          class: 'bar',
        }, [
          r('a', {
            class: 'button',
            href: 'https://github.com/doars/doars#readme',
            target: '_blank',
          }, iconGithub),

          r('button', {
            class: 'flex-grow md:flex-grow-0',
            'onclick': () => {
              window.copyToClipboard('npm i @doars/staark')
            },
          }, [
            '&#160;',
            r('code', 'npm i @doars/staark'),
            '&#160;&#160;',
            iconCopy,
          ]),

          r('button', {
            class: 'flex-grow md:flex-grow-0',
            'onclick': () => {
              window.copyToClipboard('https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.iife.js')
            },
          }, [
            '&#160;',
            r('code', 'https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.iife.js'),
            '&#160;&#160;',
            iconCopy,
          ]),
        ]),

        r('div', {
          class: 'branch branch-reverse',
        }, [
          window({}, [
            '<div id="app"></div>',
            '',
            '<script type="module">',
            '  import { mount, node as n } from \'https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.js\'',
            '',
            '  mount(',
            '    document.getElementById(\'app\'),',
            '    (state) => n(\'div\', [',
            '      n(\'div\', \'List\'),',
            '      n(\'ol\', state.todos.map((todo) => n(\'li\', todo))),',
            '      n(\'input\', {',
            '        value: state.input,',
            '        input: (event) => state.input = event.target.value,',
            '      }),',
            '      n(\'button\', {',
            '        click: () => {',
            '          if (state.input.trim()) {',
            '            state.todos.push(state.input.trim());',
            '            state.input = \'\';',
            '          }',
            '        },',
            '      }, \'Add\')',
            '    ]),',
            '    { todos: [\'Hello there.\', \'General Kenobi.\'], input: \'\' },',
            '  )',
            '</script>',
          ]),

          r('div', {
            class: 'transform -rotate-2 -mt-1.5 card-example ml-auto mr-3 md:-mr-1.25',
            id: 'example-app',
          }),
        ]),
      ]),

      section([
        r('h2', 'Comes in at a tiny size.'),
        r('p', 'Due to the minimal philosophy and simple concepts, the libraries are compressed to just a few kilobytes, with staark at 1.5kB.'),
      ]),

      section([
        r('h2', 'Efficient diffing algorithms.'),
        r('p', 'The node tree is morphed quickly from old to new with minimal overhead, ensuring fast updates.'),
      ]),

      section([
        r('h2', 'Minimal amount of concepts to learn.'),
        r('p', 'The system is incredibly easy to reason with because you only need to learn a few core functions to build web apps. Simply mount the app and create nodes with the node function, then change the state to update the app, There are more functions available, but these are all optional.'),
      ]),

      r('div', {
        class: 'mb-6 -mt-4',
      }, [
        carousel({
          alignOnHover: true,
        }, [
          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#mount',
          }, 'mount', 'Attach the application to the document, providing a view function and initial state.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#node',
          }, 'node', 'Create an abstract representation of a document element that staark uses to manipulate the actual document.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#memo',
          }, 'memo', 'Optimize time-costly operations by memoizing view functions based on state changes.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#conditional',
          }, 'conditional', 'Add branching to rendering by conditionally returning different nodes.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#match',
          }, 'match', 'Select and return nodes based on matching keys in an object.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#factory',
          }, 'factory', 'Simplify node creation with pre-configured functions for common elements.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#fctory',
          }, 'fctory', 'Combine factory and nde for creating nodes from query selectors.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#nde',
          }, 'nde', 'Create nodes using a query selector instead of element type and attributes.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#update',
          }, 'update', 'Force a re-rendering of the application (returned by mount).'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#unmount',
          }, 'unmount', 'Terminate and remove the application from the page (returned by mount).'),
        ]),
      ]),



      section([
        r('h2', 'Easy to add to your project.'),
        // r('p', ''),
      ]),

      r('div', {
        class: 'mb-6 -mt-4',
      }, [
        carousel({}, [
          card({}, 'From NPM', 'Install the package from NPM, then import and enable the library in your build.',
            r('button', {
              'onclick': () => {
                window.copyToClipboard('npm i @doars/doars')
              },
            }, [
              '&#160;',
              r('code', 'npm i @doars/doars'),
              '&#160;&#160;',
              iconCopy,
            ]),

            r('div', {
              class: 'code-wrapper',
            }, [
              code({
                language: 'javascript',
              }, [
                '// Import library.',
                'import { mount, node as n } from \'@doars/staark\'',
                '',
                '// Mount the app.',
                'mount(document.body, (state) => n(\'div\', \'Hello\'), {})',
              ]),
            ]),
          ),

          card({}, 'ESM build from jsDelivr', 'Import the ESM build from for example the jsDelivr CDN and enable the library.',
            r('div', {
              class: 'code-wrapper',
            }, [
              code({}, [
                '<script type="module">',
                '  // Import library.',
                '  import { mount, node as n } from \'https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.js\'',
                '',
                '  // Mount the app.',
                '  mount(document.body, (state) => n(\'div\', \'Hello\'), {})',
                '</script>',
              ]),
            ]),
          ),

          card({}, 'IIFE build from jsDelivr', 'Add the IFFE build to the page from for example the jsDelivr CDN and enable the library.',
            r('div', {
              class: 'code-wrapper',
            }, [
              code({}, [
                '<!-- Import library. -->',
                '<script src="https://cdn.jsdelivr.net/npm/@doars/staark@1/dst/staark.iife.js"></script>',
                '<script>',
                '  const { mount, node } = window.staark',
                '  mount(document.body, (state) => node(\'div\', \'Hello\'), {})',
                '</script>',
              ]),
            ]),
          ),
        ]),
      ]),

      section([
        r('h2', 'Explore the packages!'),
        r('p', 'The staark toolkit includes multiple libraries for state management, networking, real-time synchronization, and more.'),
      ]),

      r('div', {
        class: 'mb-6 -mt-4',
      }, [
        carousel({
          alignOnHover: true,
        }, [
          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark#readme',
          }, '@doars/staark', 'A teeny-tiny framework for building web apps.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark-patch#readme',
          }, '@doars/staark-patch', 'A teeny-tiny stateless framework for building web apps.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/staark-isomorphic#readme',
          }, '@doars/staark-isomorphic', 'A server side rendering library for staark.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/tiedliene#readme',
          }, '@doars/tiedliene', 'A teensy-tiny yet powerful state management utility.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/vroagn#readme',
          }, '@doars/vroagn', 'A teensy-tiny library for managing network requests.'),

          card({
            href: 'https://github.com/doars/staark/tree/main/packages/roupn#readme',
          }, '@doars/roupn', 'Synchronise application state between users in real-time via end-to-end encrypted messages.'),
        ]),
      ]),

      section([
        r('h2', 'In the wild'),
        r('p', 'See staark in action in these projects:'),
        r('p', r('a', { href: 'https://github.com/RedKenrok/webapp-toaln#readme', target: '_blank' }, 'Toaln'), ' is a simple language learning app which utilises the power of Large Language Models to practise'),
        r('p', r('a', { href: 'https://rondekker.nl/en-gb/tools/', target: '_blank' }, 'Tools by Ron Dekker'), ' are a set of widgets whose functions range from colour conversion to text analysis.'),
      ]),

      section([
        r('h2', 'Comparisons'),
        r('p', 'Curious how staark compares to other libraries? Check out the ', r('a', { href: 'https://github.com/doars/staark/tree/main/performance#readme', target: '_blank' }, 'performance comparisons'), ' for build size, runtime performance, and memory usage.'),
      ]),

    ]),
    r('footer', [
      section([
        r('div', {
          class: 'branch',
        }, [
          r('div', {
            class: 'logo'
          }, logo()),
          r('ul', [
            r('li', [
              r('a', {
                href: 'https://github.com/doars/staark#readme',
                target: '_blank',
              }, 'GitHub'),
            ]),
            r('li', [
              r('a', {
                href: 'https://npmjs.com/org/doars/',
                target: '_blank',
              }, 'NPM'),
            ]),
            r('li', [
              r('a', {
                href: 'https://rondekker.nl/en-gb/',
                target: '_blank',
              }, 'From Ron Dekker'),
            ]),
            r('li', [
              r('a', {
                href: 'https://rondekker.nl/',
                target: '_blank',
              }, 'Van Ron Dekker'),
            ]),
          ]),
        ]),
      ]),
    ])
  )
}
