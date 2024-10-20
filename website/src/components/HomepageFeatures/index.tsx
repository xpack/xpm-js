import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import Link from '@docusaurus/Link';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Multi-configurations, cross-platform',
    Svg: require('@site/static/img/mosaic.svg').default,
    description: (
      <>
        The <b>xPack Framework</b> aims to automate building and testing of <b>multiple configuration</b> projects, and installing <b>multiple versions</b> of packages, across multiple platforms (<b>Windows</b>, <b>macOS</b>, <b>GNU/Linux</b>).
      </>
    ),
  },
  {
    title: 'Easy to Use & Reproducible',
    Svg: require('@site/static/img/check-badge.svg').default,
    description: (
      <>
        Source libraries and binary packages can be added to projects
        as <b>dependencies</b>,
        and conveniently installed with <code>xpm install</code>.
        This feature also ensures reproducibility, which is particularly
        beneficial in <b>CI/CD</b> environments.
      </>
    ),
  },
  {
    title: 'Part of the Node.js ecosystem',
    Svg: require('@site/static/img/globe.svg').default,
    description: (
      <>
        The <b><Link to="https://xpack.github.io/xpm/">xpm</Link></b> CLI tool
        complements <b><Link to="https://docs.npmjs.com/cli/">npm</Link></b> with
        several extra features specific to <b>C/C++ projects</b>.
        This allows source libraries and
        binary packages to nicely integrate into the Node.js ecosystem,
        while still allowing them to be installed manually.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
