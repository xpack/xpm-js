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
  cliSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'xpm'
    },
    {
      type: 'doc',
      id: 'init/index',
      label: 'xpm init'
    },
    {
      type: 'doc',
      id: 'install/index',
      label: 'xpm install'
    },
    {
      type: 'doc',
      id: 'link/index',
      label: 'xpm link'
    },
    {
      type: 'doc',
      id: 'list/index',
      label: 'xpm list'
    },
    {
      type: 'doc',
      id: 'run/index',
      label: 'xpm run'
    },
    {
      type: 'doc',
      id: 'uninstall/index',
      label: 'xpm uninstall'
    },
  ]
};

export default sidebars;
