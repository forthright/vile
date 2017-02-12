# vile [![Circle CI](https://circleci.com/gh/forthright/vile.svg?style=svg&circle-token=76807e9cc864afc2d2af7db4c744a0eae8b9fc00)](https://circleci.com/gh/forthright/vile) [![Build status](https://ci.appveyor.com/api/projects/status/3qu5ih8n3iufpait/branch/master?svg=true)](https://ci.appveyor.com/project/brentlintner/vile/branch/master)

[![score-badge](https://vile.io/api/v0/projects/vile/badges/score?token=USryyHar5xQs7cBjNUdZ)](https://vile.io/~brentlintner/vile) [![security-badge](https://vile.io/api/v0/projects/vile/badges/security?token=USryyHar5xQs7cBjNUdZ)](https://vile.io/~brentlintner/vile) [![coverage-badge](https://vile.io/api/v0/projects/vile/badges/coverage?token=USryyHar5xQs7cBjNUdZ)](https://vile.io/~brentlintner/vile) [![dependency-badge](https://vile.io/api/v0/projects/vile/badges/dependency?token=USryyHar5xQs7cBjNUdZ)](https://vile.io/~brentlintner/vile)

A punishing yet easy to use tool for writing insightful code.

## Documentation

See the [docs](https://vile-docs.herokuapp.com) site.

## Versioning

This project ascribes to [semantic versioning](http://semver.org).

## Licensing

This project is licensed under the [MPL-2.0](https://www.mozilla.org/MPL/2.0) license.

Any contributions made to this project are made under the current license.

## Contributions

Current list of [Contributors](https://github.com/brentlintner/vile/graphs/contributors).

Any contributions are welcome and appreciated!

All you need to do is submit a [Pull Request](https://github.com/forthright/vile/pulls).

1. Please consider tests and code quality before submitting.
2. Please try to keep commits clean, atomic and well explained (for others).

### Issues

Current issue tracker is on [GitHub](https://github.com/forthright/vile/issues).

Even if you are uncomfortable with code, an issue or question is welcome.

### Code Of Conduct

This project ascribes to CoralineAda's [Contributor Covenant](https://github.com/CoralineAda/contributor_covenant).

### Maintainers

- Brent Lintner - [@brentlintner](http://github.com/brentlintner)

## Hacking

    git clone git@github.com:forthright/vile.git
    git clone git@github.com:forthright/vile-docs.git
    cd vile
    npm i
    npm run compile
    npm run compile-dev

To run the CLI locally:

    node bin/vile -h

To run tests:

    npm -s t

To recompile `src` to `lib`:

    npm run compile

To run compile task with file watch in the background:

    npm run dev

To generate latest docs:

    npm run -s gen-docs
    [browser] ../vile-docs/public/index.html

## Architecture

The core of vile is written in `~ES6` Style [TypeScript](http://www.typescriptlang.org),
on top of [Babel](http://babeljs.io).

The test code is written in [CoffeeScript](http://coffeescript.org).

### Why NodeJS?

Node has, in the creator's humble opinion at this time of creation, the
ideal balance of nix/windows support, barrier to entry, quality and
size of community and tooling, and the relative, per project requirements
of data manipulation and speed needed at this point in time.

However, Vile as a project, overall, should not be considered to be
written in (mainly) one language. It is open ended how/when the project
should make use of other, possibly better suited languages/tooling, and
how to coordinate it.

### Directory Structure

- `src` - typescript lib
- `lib` - compiled js
- `test` - any test related code, written in coffeescript
