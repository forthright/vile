![vile_full](https://cloud.githubusercontent.com/assets/93340/23980691/aba34a1a-09d7-11e7-85b2-12d1403b5686.png)

[![Circle CI](https://circleci.com/gh/forthright/vile.svg?style=shield&circle-token=76807e9cc864afc2d2af7db4c744a0eae8b9fc00)](https://circleci.com/gh/forthright/vile) [![Windows Build](https://ci.appveyor.com/api/projects/status/3qu5ih8n3iufpait/branch/master?svg=true)](https://ci.appveyor.com/project/brentlintner/vile/branch/master) [![MacOS/Linux Builds](https://travis-ci.org/forthright/vile.svg?branch=master)](https://travis-ci.org/forthright/vile) [![score-badge](https://vile.io/api/v0/projects/vile/badges/score?token=USryyHar5xQs7cBjNUdZ)](https://vile.io/~brentlintner/vile) [![security-badge](https://vile.io/api/v0/projects/vile/badges/security?token=USryyHar5xQs7cBjNUdZ)](https://vile.io/~brentlintner/vile) [![coverage-badge](https://vile.io/api/v0/projects/vile/badges/coverage?token=USryyHar5xQs7cBjNUdZ)](https://vile.io/~brentlintner/vile) [![dependency-badge](https://vile.io/api/v0/projects/vile/badges/dependency?token=USryyHar5xQs7cBjNUdZ)](https://vile.io/~brentlintner/vile) [![npm version](https://badge.fury.io/js/vile.svg)](https://badge.fury.io/js/vile)

A punishing yet easy to use tool for writing insightful code.

## TL;DR

This is the official [cli](src/cli) and [core lib](src/) for [vile.io](https://vile.io).

Standalone it can be used to run all kinds of [static analysis](#architecture)
for multiple languages and OSes, all via one top level package.

## Installation & Usage

Please see the [docs](https://docs.vile.io) site.

## Versioning

This project ascribes to [semantic versioning](http://semver.org).

## Licensing

This project is licensed under the [MPL-2.0](LICENSE) license.

Any contributions made to this project are made under the current license.

## Contributions

Current list of [Contributors](https://github.com/forthright/vile/graphs/contributors).

Any contributions are welcome and appreciated!

All you need to do is submit a [Pull Request](https://github.com/forthright/vile/pulls).

1. Please consider tests and code quality before submitting.
2. Please try to keep commits clean, atomic and well explained (for others).

### Issues

Current issue tracker is on [GitHub](https://github.com/forthright/vile/issues).

Even if you are uncomfortable with code, an issue or question is welcome.

### Code Of Conduct

This project ascribes to [contributor-covenant.org](http://contributor-covenant.org).

By participating in this project you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

### Maintainers

- Brent Lintner - [@brentlintner](http://github.com/brentlintner)

## Hacking

See [HACKING.md](HACKING.md).

## Architecture

Vile is centered around the use of [Plugins](https://docs.vile.io/#creating-a-plugin) that generate [Issues](https://docs.vile.io/interfaces/_src__types_index_d_.vile.issue.html).

A plugin is primarily written in JS, but you can
easily [shell out](https://docs.vile.io/#writing-non-javascript-plugins) to another script.

The core library and CLI is written in `~ES6` Style [TypeScript](http://www.typescriptlang.org), on top of [Babel](http://babeljs.io).

The test code is written in [CoffeeScript](http://coffeescript.org).

### Directory Structure

- `src` - typescript lib
- `lib` - compiled js
- `test` - any test related code, written in coffeescript

### Why NodeJS?

Node has, in the creator's humble opinion at this time of creation (2015), the
ideal balance of nix/windows support, barrier to entry, quality and
size of community and tooling, and the relative, per project requirements
of data manipulation and speed needed at this point in time.

However, Vile as a project, overall, should not be considered to be
written in (mainly) one language. It is open ended how/when the project
should make use of other, possibly better suited languages/tooling, and
how to coordinate it.
