# vile [![Circle CI](https://circleci.com/gh/forthright/vile.svg?style=svg&circle-token=76807e9cc864afc2d2af7db4c744a0eae8b9fc00)](https://circleci.com/gh/forthright/vile) [![Build status](https://ci.appveyor.com/api/projects/status/3qu5ih8n3iufpait/branch/master?svg=true)](https://ci.appveyor.com/project/brentlintner/vile/branch/master)

[![score-badge](https://vile.io/brentlintner/vile/badges/score?token=uFywUmzZfbg6UboLzn6R)](https://vile.io/brentlintner/vile) [![security-badge](https://vile.io/brentlintner/vile/badges/security?token=uFywUmzZfbg6UboLzn6R)](https://vile.io/brentlintner/vile) [![coverage-badge](https://vile.io/brentlintner/vile/badges/coverage?token=uFywUmzZfbg6UboLzn6R)](https://vile.io/brentlintner/vile) [![dependency-badge](https://vile.io/brentlintner/vile/badges/dependency?token=uFywUmzZfbg6UboLzn6R)](https://vile.io/brentlintner/vile)

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

#### Node CLI

    npm i -g vile

See usage with:

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

For type definitions for using the library, building
plugins, and creating issues, see [here](https://github.com/forthright/vile/blob/master/src/lib/typings/vile.d.ts).

## Plugins

To actually punish your code, you need to install plugins first.

For a complete list of plugins, see [here](https://vile.io/plugins).

To get started, install a plugin package in your project root:

Example, install the `eslint` plugin:

    cd into_my_project
    # Note: you will always need vile installed (locally) to run plugins
    npm install @forthright/vile --save-dev
    npm install @forthright/vile-eslint --save-dev

Then just run:

    vile p

The CLI will look up any installed plugins and automatically
pull them in and run their checks.

You can also specify a white-list of installed plugins to only run:

    vile punish -p eslint,coffeelint

## Config File

Create a `.vile.yml` file in your project root:

```yaml
vile:
  ignore: ["custom ignore list"]
  allow: ["or a custom allow list"]

some_plugin:
  config: plugin_config
  ignore: plugin_ignore
  allow: plugin_allow
```

Then:

    vile punish

You can also specify a custom list in your config:

```yaml
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

### Allowing Files

The `vile.allow` (and plugin specific) setting specifies paths to
*only* include.

It's util method is `vile.allowed("path", allow_list)`.

Note: Unlike ignore, certain levels will **overwrite** others, when set.

From highest to lowest precedence, they are:

1. Specified via `vile p --gitdiff`
2. Specified via `vile p file dir ...`
3. Specified via `vile.allow`
4. Specified via `my_plugin.allow`

So, say you call `vile p -g` it will ignore plugin/top
level allow lists, and any path arguments provided.

## Publishing

You can publish your project to [vile.io](https://vile.io).

Make an account if you don't have one, then:

    vile auth

Then:

    vile p --upload project_name

## Editor Integration

There are various text editors that have `vile` integrations.

### Syntastic

See [forthright/syntastic](https://github.com/forthright/syntastic) for now.
Just replace the upstream install with the `master` branch.

Current syntax checkers:

* [vile_rubycritic](https://github.com/forthright/syntastic/blob/master/syntax_checkers/ruby/vile.vim)
* [vile_rubocop](https://github.com/forthright/syntastic/blob/master/syntax_checkers/ruby/vile.vim)
* [vile_sass_lint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/sass/vile.vim)
* [vile_slim_lint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/slim/vile.vim)
* [vile_eslint]()
* [vile_jshint]()
* [vile_hlint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/haskell/vile.vim)
* [vile_coffeelint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/coffee/vile.vim)
* [vile_tslint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/typescript/vile.vim)

An example config supporing `slim`, `ruby`, and `sass`, with
passive mode enabled:

```vim
  " Command to toggle syntastic passive mode
  nnoremap <C-w>e :SyntasticCheck<CR>
  nnoremap <C-w>E :SyntasticReset<CR>

  " Recommended statusline (see :help syntastic)
  set statusline+=%#warningmsg#
  set statusline+=%{SyntasticStatuslineFlag()}
  set statusline+=%*

  let g:syntastic_always_populate_loc_list = 1
  let g:syntastic_auto_loc_list = 1
  let g:syntastic_enable_signs = 1
  let g:syntastic_aggregate_errors = 1
  let g:syntastic_check_on_open = 1
  let g:syntastic_auto_jump = 0

  " Put into passive mode, and set desired checkers
  let g:syntastic_mode_map = { "mode": "passive" }
  let g:syntastic_ruby_checkers=["mri", "vile_rubycritic", "vile_rubocop"]
  let g:syntastic_slim_checkers=["vile_slim_lint"]
  let g:syntastic_sass_checkers=["vile_sass_lint"]
```

### Atom

Coming soon...

## Formatting

You can turn on various output formats with the `-f` option.

### JSON

    vile p -f json

### Syntastic

An `emacs` like formatting used in Vile's syntastic plugin.

    vile p -f syntastic

## Logging

You can set the logging level if needed.

    vile p -l warn

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

See [vile.d.ts](src/lib/typings/vile.d.ts) for how Issues are structured.

You can also `require("vile")` in your plugin and use its
API, which provides some helpers.

### Filtering

Plugins are expected to support both the `ignore` and `allow` lists.
There are some helper methods to abstract away the onerous work:

`vile.filter` is great for using with `vile.promise_each`, or in general.

```javascript
let vile = require("vile")

module.exports = {
  punish: (config) => {
    let filtered = vile.filter(config.ignore, config.allow)

    get_some_filepaths()
      .filter((filepath) => filtered(filepath))
      .each(determine_issues)
  }
}

```

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
    npm run tsd
    npm run compile
    npm run compile-dev

To run the CLI locally:

    node bin/vile -h

To run tests:

    npm test

To recompile `src` to `lib`:

    npm run compile

To run compile task with file watch in the background:

    npm run dev


Note: For development, set `VILE_APP=http://localhost:3000 bin/vile ...` so it
does not try to publish to `https://vile.io`.

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
