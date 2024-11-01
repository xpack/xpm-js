import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import logger from '@docusaurus/logger';

// The node.js modules cannot be used in modules imported in browser code:
// webpack < 5 used to include polyfills for node.js core modules by default.
// so the entire initialisation code must be in this file, that is
// not processed by webpack.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// ----------------------------------------------------------------------------

function getCustomFields() {
  const pwd = fileURLToPath(import.meta.url);
  // logger.info(pwd);

  // First get the version from the top package.json.
  const topFilePath = path.join(path.dirname(path.dirname(pwd)), 'package.json');
  // logger.info(filePath);
  const topFileContent = fs.readFileSync(topFilePath);

  const topPackageJson = JSON.parse(topFileContent.toString());
  const npmVersion = topPackageJson.version.replace(/[.-]pre/, '');

  logger.info(`package version: ${topPackageJson.version}`);

  const customFields = {}

  return {
    npmVersion,
    docusaurusVersion: require('@docusaurus/core/package.json').version,
    buildTime: new Date().getTime(),
    ...customFields,
  }
}

// ----------------------------------------------------------------------------

const customFields = getCustomFields();
logger.info(customFields);

// ----------------------------------------------------------------------------

const config: Config = {
  title: 'xpm - The xPack Project Manager',
  tagline: 'A tool to automate builds, tests and manage C/C++ dependencies, inspired by npm',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://xpack.github.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/xpm/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'xpack', // Usually your GitHub org/user name.
  projectName: 'xpm-js', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  // Useful for the sitemap.xml, to avoid redirects, since
  // GitHub redirects all to trailing slash.
  trailingSlash: true,

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },


  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'docs',
        path: './docs',
        routeBasePath: 'docs',
        sidebarPath: './sidebars.ts',
        // Remove this to remove the "edit this page" links.
        editUrl: 'https://github.com/xpack/xpm-js/edit/master/website/',
        // showLastUpdateAuthor: true,
        showLastUpdateTime: true,
      },
    ],
    [
      // https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-blog
      '@docusaurus/plugin-content-blog',
      {
        showReadingTime: true,
        feedOptions: {
          type: ['rss', 'atom'],
          xslt: true,
        },
        // Remove this to remove the "edit this page" links.
        editUrl:
          'https://github.com/xpack/xpm-js/edit/master/website/',
        // Useful options to enforce blogging best practices
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'warn',
        showLastUpdateTime: true,
        blogSidebarCount: 8,
        authorsMapPath: '../authors.yml',
      },
    ],
    [
      '@docusaurus/plugin-content-pages',
      {}
    ],
    [
      // https://docusaurus.io/docs/next/api/plugins/@docusaurus/plugin-client-redirects#redirects
      '@docusaurus/plugin-client-redirects',
      {
        // fromExtensions: ['html', 'htm'], // /myPage.html -> /myPage
        // toExtensions: ['exe', 'zip'], // /myAsset -> /myAsset.zip (if latter exists)
        redirects: [
          //   // /docs/oldDoc -> /docs/newDoc
          //   {
          //     to: '/docs/newDoc',
          //     from: '/docs/oldDoc',
          //   },
          //   // Redirect from multiple old paths to the new path
          //   {
          //     to: '/docs/newDoc2',
          //     from: ['/docs/oldDocFrom2019', '/docs/legacyDocFrom2016'],
          //   },
        ],
        createRedirects(existingPath) {
          logger.info(existingPath);
          //   if (existingPath.includes('/evenimente')) {
          //     // logger.info(`to ${existingPath} from ${existingPath.replace('/evenimente', '/events')}`);
          //     // Redirect from /events/X to /evenimente/X
          //     return [
          //       existingPath.replace('/evenimente', '/events')
          //     ];
          //   } else if (existingPath.includes('/amintiri')) {
          //     // logger.info(`to ${existingPath} from ${existingPath.replace('/amintiri', '/blog')}`);
          //     // Redirect from /blog/Z to /amintiri/X
          //     return [
          //       existingPath.replace('/amintiri', '/blog')
          //     ];
          //   }
          //   return undefined; // Return a falsy value: no redirect created
          //   },
        }
      }
    ],
    [
      // https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-google-gtag
      // https://tagassistant.google.com
      '@docusaurus/plugin-google-gtag',
      {
        trackingID: 'G-T50NMR8JZ1',
        anonymizeIP: false,
      }
    ],
    [
      // https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-sitemap
      // https://cronica-it.github.io/sitemap.xml
      '@docusaurus/plugin-sitemap',
      {
        changefreq: 'weekly',
        priority: 0.5,
        // ignorePatterns: ['/tags/**'],
        filename: 'sitemap.xml',
      }
    ],
    [
      '@docusaurus/plugin-ideal-image',
      {
        quality: 70,
        max: 1030, // max resized image's size.
        min: 640, // min resized image's size. if original is lower, use that size.
        steps: 2, // the max number of images generated between min and max (inclusive)
        disableInDev: false,
      },
    ],
    // Local plugins.
    './src/plugins/SelectReleasesPlugin',
  ],

  // https://docusaurus.io/docs/api/docusaurus-config#headTags
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        href: '/xpm/favicons/favicon-48x48.png',
        sizes: '48x48'
      }
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/xpm/favicons/favicon.svg'
      }
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'shortcut icon',
        href: '/xpm/favicons/favicon.ico'
      }
    },
    {
      // This might also go to themeConfig.metadata.
      tagName: 'meta',
      attributes: {
        name: 'apple-mobile-web-app-title',
        content: 'xPack'
      }
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'manifest',
        href: '{{baseUrl}}favicons/site.webmanifest'
      }
    }
  ],

  themes: [
    [
      '@docusaurus/theme-classic',
      {
        customCss: './src/css/custom.css',
      }
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    // image: 'img/docusaurus-social-card.jpg',

    metadata: [
      {
        name: 'keywords',
        content: 'xpm, xpack, build, test, dependencies, npm, reproducibility'
      }
    ],

    navbar: {
      // Overriden by i18n/en/docusaurus-theme-classic.
      title: 'The xPack Project',

      logo: {
        alt: 'xPack Logo',
        src: 'img/components-256.png',
        href: 'https://xpack.github.io/',
      },
      items: [
        {
          to: '/',
          // label: 'Home',
          className: 'header-home-link',
          position: 'left'
        },
        {
          type: 'dropdown',
          label: 'Documentation',
          to: 'docs/getting-started',
          position: 'left',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started'
            },
            {
              label: 'Install Guide',
              to: '/docs/install'
            },
            {
              label: 'User Information',
              to: '/docs/user'
            },
            {
              label: 'Help Centre',
              to: '/docs/support'
            },
            {
              label: 'Releases',
              to: '/docs/releases'
            },
            {
              label: 'About',
              to: '/docs/about'
            }
          ],
        },
        {
          type: 'dropdown',
          label: 'CLI Reference',
          to: '/docs/cli/xpm',
          position: 'left',
          items: [
            {
              label: 'xpm',
              to: '/docs/cli/xpm'
            },
            {
              label: 'xpm init',
              to: '/docs/cli/xpm/init'
            },
            {
              label: 'xpm install',
              to: '/docs/cli/xpm/install'
            },
            {
              label: 'xpm link',
              to: '/docs/cli/xpm/link'
            },
            {
              label: 'xpm list',
              to: '/docs/cli/xpm/list'
            },
            {
              label: 'xpm run',
              to: '/docs/cli/xpm/run'
            },
            {
              label: 'xpm uninstall',
              to: '/docs/cli/xpm/uninstall'
            },
          ],
        },
        {
          to: '/docs/api',
          label: 'API Reference',
          position: 'left',
        },
        {
          type: 'dropdown',
          to: '/blog',
          label: 'Blog',
          position: 'left',
          items: [
            {
              label: 'Recent',
              to: '/blog'
            },
            {
              label: 'Archive',
              to: '/blog/archive'
            },
            {
              label: 'Tags',
              to: '/blog/tags'
            },
          ]
        },
        {
          href: 'https://github.com/xpack/xpm-js/',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
        {
          label: `v${customFields.npmVersion}`,
          position: 'right',
          href: `https://www.npmjs.com/package/xpm/v/${customFields.npmVersion}`,
        },
        {
          href: 'https://github.com/xpack/',
          label: 'xpack',
          position: 'right',
        },
        {
          href: 'https://github.com/xpack-dev-tools/',
          label: 'xpack-dev-tools',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Pages',
          items: [
            {
              label: 'Install',
              to: '/docs/install',
            },
            {
              label: 'Support',
              to: '/docs/support',
            },
            {
              label: 'Releases',
              to: '/docs/releases',
            },
            {
              label: 'Blog',
              to: '/blog',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/xpack/xpm-js/discussions',
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/xpack',
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/kbzWaJerFG',
            },
            {
              label: 'X/Twitter',
              href: 'https://twitter.com/xpack_project',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Donate via PayPal',
              href: 'https://www.paypal.com/donate/?hosted_button_id=5MFRG9ZRBETQ8',
            },
            {
              label: 'GitHub xpm-js',
              href: 'https://github.com/xpack/xpm-js/',
            },
            {
              label: 'GitHub xpack',
              href: 'https://github.com/xpack/',
            },
            {
              label: 'GitHub xpack-dev-tools',
              href: 'https://github.com/xpack-dev-tools/',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Liviu Ionescu. Built with Docusaurus v${customFields.docusaurusVersion} on ${new Date(customFields.buildTime).toDateString()}.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  customFields: customFields,
};

export default config;
