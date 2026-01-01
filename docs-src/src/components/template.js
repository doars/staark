// Import renderer.
import { render as r } from '../utils/RenderUtils.js'

/**
 * Wraps a page's content in a template to create the final document.
 * @param {object} meta Metadata of the template:
 * - {string} image - Meta / preview image of the page.
 * - {string} url - Link of the webpage.
 * @param {...string} children Rendered elements to add as children.
 * @returns {string} Resulting HTML structure.
 */
export default (
  meta = {},
  ...children
) => {
  meta = Object.assign({
    image: 'https://doars.js.org/banner.png',
    url: 'https://doars.js.org',
  }, meta)

  // Render document.
  return '<!DOCTYPE html>' + r('html', {
    lang: 'en',
  }, [
    r('head', [
      // File meta data.
      r('meta', {
        charset: 'UTF-8',
      }),
      r('meta', {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      }),

      // Page meta data.
      r('title', meta.title),
      r('meta', {
        name: 'description',
        content: meta.description,
      }),
      r('meta', {
        name: 'keywords',
        content: typeof (meta.keywords) === 'string' ? meta.keywords : meta.keywords.join(', '),
      }),

      // Open graph meta.
      r('meta', {
        property: 'og:description',
        content: meta.description,
      }),
      r('meta', {
        property: 'og:image',
        content: meta.image,
      }),
      r('meta', {
        name: 'og:title',
        content: meta.title,
      }),
      r('meta', {
        property: 'og:type',
        content: 'article',
      }),
      r('meta', {
        property: 'og:url',
        content: meta.url,
      }),

      // Twitter meta.
      r('meta', {
        name: 'twitter:card',
        content: 'summary_large_image',
      }),
      r('meta', {
        name: 'twitter:description',
        content: meta.description,
      }),
      r('meta', {
        property: 'twitter:image',
        content: meta.image,
      }),
      r('meta', {
        name: 'twitter:title',
        content: meta.title,
      }),

      // Icons.
      r('link', {
        rel: 'icon',
        href: '/icons/128-round.png',
        type: 'image/png',
        sizes: '128x128',
      }),
      r('link', {
        rel: 'icon',
        href: '/icons/256-round.png',
        type: 'image/png',
        sizes: '256x256',
      }),
      r('link', {
        rel: 'icon',
        href: '/icons/512-round.png',
        type: 'image/png',
        sizes: '512x512',
      }),

      r('meta', {
        name: 'theme-color',
        content: '#ffffff',
      }),

      // Style sheets.
      r('link', {
        crossorigin: 'anonymous',
        rel: 'stylesheet',
        href: '/index.css',
      }),
    ]),

    r('body', [
      // Add contents.
      children,

      // Scripts.
      r('script', {
        crossorigin: 'anonymous',
        src: '/index.js',
      }),
    ]),
  ])
}
