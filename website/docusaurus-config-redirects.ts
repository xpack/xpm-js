/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2024 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/licenses/MIT/.
 */

// import logger from '@docusaurus/logger';

export const redirects = {
  // fromExtensions: ['html', 'htm'], // /myPage.html -> /myPage
  // toExtensions: ['exe', 'zip'], // /myAsset -> /myAsset.zip (if latter exists)
  redirects: [
    //   // /docs/oldDoc -> /docs/newDoc
    //   {
    //     from: '/docs/oldDoc',
    //     to: '/docs/newDoc',
    //   },
    //   // Redirect from multiple old paths to the new path
    //   {
    //     from: ['/docs/oldDocFrom2019', '/docs/legacyDocFrom2016'],
    //     to: '/docs/newDoc2',
    //   },
    { from: '/cli', to: '/docs/cli/xpm' },
    { from: '/cli/init', to: '/docs/cli/xpm/init' },
    { from: '/cli/install', to: '/docs/cli/xpm/install' },
    { from: '/cli/link', to: '/docs/cli/xpm/link' },
    { from: '/cli/list', to: '/docs/cli/xpm/list' },
    { from: '/cli/run-script', to: '/docs/cli/xpm/run' },
    { from: '/cli/run', to: '/docs/cli/xpm/run' },
    { from: '/cli/uninstall', to: '/docs/cli/xpm/uninstall' },
    { from: '/faq', to: '/docs/faq' },
    { from: '/files', to: '/docs/guide/files' },
    { from: '/files/folders', to: '/docs/user/folders' },
    { from: '/files/package.json', to: '/docs/guide/files/package.json' },
    { from: '/folders', to: '/docs/user/folders' },
    { from: '/install', to: '/docs/install' },
    { from: '/policies', to: '/docs/user/policies' },
    { from: '/policies/0001', to: '/docs/user/policies/0001' },
    { from: '/support', to: '/docs/support' },
  ],
  createRedirects(existingPath) {
    // logger.info(existingPath);
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
