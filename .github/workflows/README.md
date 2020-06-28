# GitHub Workflows

Workflows represent a GitHub integrated solution to CI/CD, able to replace
the traditional Travis/AppVeyor tests.

## Links

- https://help.github.com/en/actions
- https://github.com/actions
- https://github.com/actions/checkout
- https://github.com/actions/setup-node

## Notes

### ^8.16.x

This explicit semver was used instead of `8.x`, as suggested by the
documentation, as an workaround to a GitHub configuration problem
that offered an older version node on Windows.

- https://github.com/actions/setup-node/issues/27

For consistency, the other versions were updated to this syntax too.
