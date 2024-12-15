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

export const customDocsSidebar = [
  {
    type: 'category',
    label: 'Getting Started',
    link: {
      type: 'doc',
      id: 'getting-started/index',
    },
    collapsed: true,
    items: [
      {
        type: 'doc',
        id: 'getting-started/glossary/index',
        label: 'Glossary'
      },
    ]
  },
  {
    type: 'doc',
    id: 'install/index',
    label: 'Install Guide'
  },
  {
    type: 'category',
    label: 'User\'s Guide',
    link: {
      type: 'doc',
      id: 'user/index',
    },
    collapsed: true,
    items: [
      {
        type: 'doc',
        id: 'user/index',
        label: 'How to use'
      },
      {
        type: 'doc',
        id: 'user/folders/index',
        label: 'Folders'
      },
      {
        type: 'doc',
        id: 'user/policies/index',
        label: 'Policies'
      },
    ]
  },
  {
    // Keep this in sync with /docs/guide sections.
    type: 'category',
    label: 'Package Author\'s Guide',
    link: {
      type: 'doc',
      id: 'guide/index',
    },
    collapsed: true,
    items: [
      {
        type: 'doc',
        id: 'guide/concepts/index',
        label: 'Concepts'
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
            id: 'metadata/liquidjs-substitutions/index',
            label: 'LiquidJS Substitutions'
          },
          {
            type: 'doc',
            id: 'metadata/index',
            label: 'xpack'
          },
          {
            type: 'doc',
            id: 'metadata/minimumXpmRequired/index',
            label: 'minimumXpmRequired'
          },
          {
            type: 'doc',
            id: 'metadata/actions/index',
            label: 'actions'
          },
          {
            type: 'doc',
            id: 'metadata/binaries/index',
            label: 'binaries'
          },
          {
            type: 'doc',
            id: 'metadata/buildConfigurations/index',
            label: 'buildConfigurations'
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
            id: 'metadata/executables/index',
            label: 'executables'
          },
          {
            type: 'doc',
            id: 'metadata/properties/index',
            label: 'properties'
          },
        ]
      },
      {
        type: 'category',
        label: 'Files',
        link: {
          type: 'doc',
          id: 'guide/files/index',
        },
        collapsed: true,
        items: [
          {
            type: 'doc',
            id: 'guide/files/package.json/index',
            label: 'package.json'
          },
        ]
      },
      {
        type: 'doc',
        id: 'guide/project-templates/index',
        label: 'Project Templates'
      },
      {
        type: 'doc',
        id: 'guide/new-github-project/index',
        label: 'New GitHub Project'
      },
    ]
  },
  {
    type: 'category',
    label: 'Contributor\'s Guide',
    link: {
      type: 'doc',
      id: 'developer/index',
    },
    collapsed: true,
    items: [
      {
        type: 'doc',
        id: 'developer/windows-symbolic-links/index',
        label: 'Windows symbolic links'
      },
    ]
  },
  {
    type: 'doc',
    id: 'maintainer/index',
    label: 'Maintainer\'s Guide'
  },
  {
    type: 'doc',
    id: 'faq/index',
    label: 'FAQ'
  },
  {
    type: 'doc',
    id: 'support/index',
    label: 'Help Centre'
  },
  {
    type: 'doc',
    id: 'releases/index',
    label: 'Releases'
  },
  {
    type: 'category',
    label: 'Project',
    link: {
      type: 'doc',
      id: 'project/about/index',
    },
    collapsed: false,
    items: [
      {
        type: 'doc',
        id: 'project/about/index',
        label: 'About'
      },
      {
        type: 'doc',
        id: 'project/history/index',
        label: 'History'
      },
      {
        type: 'link',
        label: 'License',
        href: 'https://opensource.org/license/MIT',
      },
    ]
  },
]
