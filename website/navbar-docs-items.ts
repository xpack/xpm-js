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

export const customDocsNavbarItem = {
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
            label: 'Package Author\'s Guide',
            to: '/docs/guide'
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
            to: '/docs/project/about'
          }
  ],
}
