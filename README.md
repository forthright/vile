# vile [![Circle CI](https://circleci.com/gh/brentlintner/vile.svg?style=svg&circle-token=76807e9cc864afc2d2af7db4c744a0eae8b9fc00)](https://circleci.com/gh/brentlintner/vile)

[![score-badge](http://joffrey-baratheon.herokuapp.com/brentlintner/vile/badges/score?token=4_y-Kus1bunceBtsraA7)](http://joffrey-baratheon.herokuapp.com/brentlintner/vile) [![security-badge](http://joffrey-baratheon.herokuapp.com/brentlintner/vile/badges/security?token=4_y-Kus1bunceBtsraA7)](http://joffrey-baratheon.herokuapp.com/brentlintner/vile) [![coverage-badge](http://joffrey-baratheon.herokuapp.com/brentlintner/vile/badges/coverage?token=4_y-Kus1bunceBtsraA7)](http://joffrey-baratheon.herokuapp.com/brentlintner/vile) [![dependency-badge](http://joffrey-baratheon.herokuapp.com/brentlintner/vile/badges/dependency?token=4_y-Kus1bunceBtsraA7)](http://joffrey-baratheon.herokuapp.com/brentlintner/vile)

A punishing, yet easy to use tool for writing insightful code.

It can be used to run all types of analysis and checks via one top level package.

## Goal

`build -> test -> analyze`

The goal of the project is not to compete with or replace existing
analysis tools, but to support them unobstrusively as possible,
and even complement them, while presenting the information in
a unified, project focused context.

## Requirements

- [NodeJS](http://nodejs.org)

## Installation

Since Vile's core is written in JS, the main project
is distributed via [npm](http://npmjs.org).

There is also a ruby [gem](ruby/) you can install manually (for now).

#### Node CLI

    npm install -g @forthright/vile
    vile --help

#### Node API

```javascript
require("vile")
  .exec()
  .then((issues) => {...})
```

You can also do more complex things:

```javascript
let vile_config = { } // your .vile.yml
require("vile")
  .exec(null, vile_config)
  .then((issues) => { })
```

Until API docs are a thing.. look more into the [src](src/)
to find out more about the main library. The
[cli](src/cli.ts) module is a good starting place,
along with the [main library](src/index.ts) module.

## Plugins

To actually punish your code, you need to install plugins first.

For a complete list of plugins, see [here](http://joffrey-baratheon.herokuapp.com/plugins);

To get started, install a plugin package in your project root:

Example, install the `eslint` plugin:

    cd into_my_project
    npm install @forthright/vile-eslint

Then just run:

    vile -p

The CLI will look up any installed plugins and automatically
pull them in and run their checks.

You can also specify a white-list of installed plugins to only run:

    vile -p eslint,coffeelint

## Config File

Create a `.vile.yml` file in your project root:

```yml
vile:
  ignore: ["custom ignore list"]

some_plugin:
  config: plugin_config
  ignore: plugin_ignore
```

Then include it when punishing:

    vile --config --punish

Or, more tersely:

    vile -cp

You can also run specific plugins with your config:

    vile -cp eslint

Or specify a list in your config:


```yml
vile:
  plugins: [ "eslint" ]
```

### Ignoring Files

The `vile.ignore` (and plugin specific) setting is a list of items to ignore.

If a plugin specifies its own `ignore` list, then it will be merged into
`vile.ignore` and passed to the respective plugin when it is run.

At the moment, each plugin is responsible for matching against
the provided ignore list.

However, you can use the `vile.ignored("path", ignore_list)` library
method to do the matching for you.

For reference, [ignore-file](https://github.com/mafintosh/ignore-file) is currently used for matching.

## Publishing

You can publish your project to [vile.io](http://vile.io).

Make an account if you don't have one, then:

    vile --authenticate

Then:

    vile -cp --deploy

## Formatting

You can turn on various output formats with the `-f` option.

### JSON

    vile -pc -f json

## Logging

You can set the logging level if needed.

    vile -pc -l warn

## Creating A Plugin

A plugin should be prefixed with `vile-`, and
have a `commonjs` module that exports a `punish` method,
which should return an array of issues,
or a promise that resolves into one.

```javascript
module.exports = {
  punish: (plugin_config) =>
    [issues] || a_promise_that_resolves_to_array_of_issues
}
```

See the [docs](http://vile.io/docs) page for how Issues are structured.

You can also `require("vile")` in your plugin and use its
API, which provides some helpers.

### Files Without Issues

Any files that are not ignored globally via `vile.ignore` and have no
issues are sent along with any reported issues.

## Versioning

This project ascribes to [semantic versioning](http://semver.org).

## Licensing

This project is licensed under the [MPL](https://www.mozilla.org/MPL/2.0) license.

Any contributions made to this project are made under the current license.

## Contributions

Current list of [Contributors](https://github.com/brentlintner/vile/graphs/contributors).

Any contributions are welcome and appreciated!

All you need to do is submit a [Pull Request](https://github.com/brentlintner/vile/pulls).

1. Please consider tests and code quality before submitting.
2. Please try to keep commits clean, atomic and well explained (for others).

### Issues

Current issue tracker is on [GitHub](https://github.com/brentlintner/vile/issues).

Even if you are uncomfortable with code, an issue or question is welcome.

### Code Of Conduct

This project ascribes to CoralineAda's [Contributor Covenant](https://github.com/CoralineAda/contributor_covenant).

### Maintainers

- Brent Lintner - [@brentlintner](http://github.com/brentlintner)

## Hacking

    git clone git@github.com:brentlintner/vile.git
    cd vile
    npm i
    npm run dev-setup

To run the CLI locally:

    node bin/cli -h

Note: You can also create an alias in your `~/.bashrc`.

    alias vile="/home/me/src/vile/bin/cli"

To run tests:

    npm test

To recompile `src` to `lib`:

    npm run compile

To run compile task with file watch in the background:

    npm run dev


Note: For development, set `VILE_APP=http://localhost:3000 bin/vile ...` so it
does not try to publish to `http://vile.io`.

## Architecture

The core of vile is written in `~ES6` Style [TypeScript](http://www.typescriptlang.org),
on top of [Babel](http://babeljs.io).

The test code is written in [CoffeeScript](http://coffeescript.org).

### Directory Structure

- `src` - typescript lib
- `lib` - compiled js
- `ruby` - any ruby wrapper related code
- `test` - any test related code, written in coffeescript
