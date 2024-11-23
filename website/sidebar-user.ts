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

export const userSidebarCategory = {
  type: 'category',
  label: 'User Information',
  collapsed: false,
  items: [
    {
      type: 'doc',
      id: 'user/index',
      label: 'How to use'
    },
    {
      type: 'category',
      label: 'Metadata',
      link: {
        type: 'doc',
        id: 'metadata/index',
      },
      collapsed: true,
      "items": [
        {
          type: 'doc',
          id: 'metadata/index',
          label: 'xpack'
        },
        {
          type: 'doc',
          id: 'metadata/liquidjs-substitutions/index',
          label: 'LiquidJS Substitutions'
        },
        {
          type: 'doc',
          id: 'metadata/dependencies/index',
          label: 'dependencies'
        },
        {
          type: 'doc',
          id: 'metadata/devDependencies/index',
          label: 'devDependencies'
        },
        {
          type: 'doc',
          id: 'metadata/binaries/index',
          label: 'binaries'
        },
        {
          type: 'doc',
          id: 'metadata/properties/index',
          label: 'properties'
        },
        {
          type: 'doc',
          id: 'metadata/actions/index',
          label: 'actions'
        },
        {
          type: 'doc',
          id: 'metadata/buildConfigurations/index',
          label: 'buildConfigurations'
        },
      ]
    },
    {
      type: 'doc',
      id: 'user/folders/index',
      label: 'Folders'
    },
    {
      type: 'category',
      label: 'Files',
      link: {
        type: 'doc',
        id: 'user/files/index',
      },
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'user/files/package.json/index',
          label: 'package.json'
        },
      ]
    },
    {
      type: 'doc',
      id: 'user/policies/index',
      label: 'Policies'
    },
  ]
}
