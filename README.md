# vile

[![Circle CI](https://circleci.com/gh/brentlintner/vile.svg?style=svg&circle-token=76807e9cc864afc2d2af7db4c744a0eae8b9fc00)](https://circleci.com/gh/brentlintner/vile)

A punishing, yet easy to use tool for writing insightful code.

It can be used to run all types of analysis and checks via one top level package.

## Goal

The goal of the project is not to compete with or replace existing
analysis tools, but to support them unobstrusively as possible,
and even compliment them, while presenting the information in
a unified, project focused context.

## Requirements

- [NodeJS](http://nodejs.org)
- [Pygments](http://pygments.org) (for web reports)

## Installation

Since Vile's core is written in JS, the main project
is distributed via [npm](http://npmjs.org):

    npm install vile

There is also a ruby [gem](ruby/):

    gem install vile

#### Node CLI

    npm install -g vile
    vile --help

#### Node API

```javascript
require("vile")
  .exec()
  .then((issues) => { })
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
[cli](src/cli.coffee) module is a good starting place,
along with the [main library](src/index.coffee) module.

## Plugins

To actually punish your code, you need to install plugins first.

For a complete list of plugins, see [here](http://github.com/brentlintner/vile-plugins);

**STOP!!!** Currently, the `npm install` method below does not work,
until they are actually published.

Instead:

    git clone git@github.com:brentlintner/vile-plugins.git
    git clone git@github.com:brentlintner/vile.git
    cd vile
    for pkg in ../vile-plugins/vile-*; do npm link $pkg; done

Then you can add a `plugins: []` entry to `.vile.yml`, or just use the
CLI to specify a custom set, ex: `vile -p rubocop,reek`.

----------------

To get started, install a plugin package in your project root:

Example:

    cd into_my_project
    npm install vile-eslint

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
  plugins: ["custom_list"]
  ignore: ["custom ignore list"]

some_plugin:
  config: plugin_config
  ignore: plugin_ignore
```

Then include it when punishing:

    vile --punish --config

Or, more tersely:

    vile -pc

### Ignoring Files

The `vile.ignore` (and plugin specific) setting is a list of items to ignore.

At the moment, each plugin is responsible for matching.
Most make use of [ignore-file](https://github.com/mafintosh/ignore-file).

## Scoring

    vile -pc -s

This prints all file scores to the console.

### Only Print Summary

    vile -pcS

### Printing Percents As Grades

    vile -pcsg

## Formatting

You can turn on various output formats with the `-f` option.

### File View

    vile -pc -f web

With this mode, you can bring up a simple directory view of
all your checked directories and files, and the issues for each file.

## Logging

You can set the logging level if needed.

    vile -pc -l error

## Creating A Plugin

A plugin should be prefixed with `vile-`, and
have a `commonjs` module that exports a `punish` method.

```javascript
module.exports = {
  punish: function (plugin_config) {
    return [issues] || a_promise_that_resolves_to_array_of_issues;
  }
}
```

Issues are structured as such:

```javascript
{
  type: vile.ERROR|vile.WARNING|vile.INFO,
  file: "filepath",
  msg: "issue details",
  where: {
    start: { line: 10, character: 40 },
    end: { line: 10, character: 40 }
  }
}
```
You can also `require("vile")` in your plugin and use its
API, which provides some helpers.

### Files Without Issues

For optimal data analysis, a plugin should return a single issue to indicate
the file was checked, if it can.

Example:

``` javascript
  vile.issue(vile.OK, "filepath")
```

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

## Architecture

The core of vile is written in `~ES6` Style [TypeScript](http://www.typescriptlang.org),
on top of [Babel](http://babeljs.io).

The test code is written in [CoffeeScript](http://coffeescript.org).

### Directory Structure

- `ruby` - any ruby wrapper related code
- `src` - typescript lib
- `lib` - output
