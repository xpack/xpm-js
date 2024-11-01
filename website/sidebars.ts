import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // But you can create a sidebar manually
  docsSidebar: [
    {
      type: 'doc',
      id: 'getting-started/index',
      label: 'Getting Started'
    },
    {
      type: 'doc',
      id: 'install/index',
      label: 'Install Guide'
    },
    {
      type: 'doc',
      id: 'user/index',
      label: 'User Information'
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
      type: 'doc',
      id: 'about/index',
      label: 'About'
    }, /*
    {
      type: 'doc',
      id: 'developer/index',
      label: 'Developer Information'
    },
    {
      type: 'doc',
      id: 'maintainer/index',
      label: 'Maintainer Information'
    }, */
  ],
  cliSidebar: [
    {
      type: 'doc',
      id: 'cli/xpm/index',
      label: 'xpm'
    },
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
  ],
  apiSidebar: [
    {
      type: 'doc',
      id: 'api/index',
      label: 'API Reference (TypeDoc)'
    },
  ]
};

export default sidebars;
