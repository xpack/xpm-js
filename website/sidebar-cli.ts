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

const cliSidebar = [
  {
    type: 'category',
    label: 'CLI Reference',
    link: {
      type: 'doc',
      id: 'cli/xpm/index',
    },
    collapsed: false,
    items: [
      {
        type: 'category',
        label: 'xpm',
        link: {
          type: 'doc',
          id: 'cli/xpm/index',
        },
        collapsed: false,
        items: [
          {
            type: 'doc',
            id: 'cli/xpm/init/index',
            label: 'xpm init'
          },
          {
            type: 'doc',
            id: 'cli/xpm/install/index',
            label: 'xpm install'
          },
          {
            type: 'doc',
            id: 'cli/xpm/link/index',
            label: 'xpm link'
          },
          {
            type: 'doc',
            id: 'cli/xpm/list/index',
            label: 'xpm list'
          },
          {
            type: 'doc',
            id: 'cli/xpm/run/index',
            label: 'xpm run'
          },
          {
            type: 'doc',
            id: 'cli/xpm/uninstall/index',
            label: 'xpm uninstall'
          },
        ]
      },
    ],
  }
]

export default cliSidebar;
