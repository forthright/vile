# Vile

A punishing yet easy to use tool for writing insightful code.

## Goal

Vile can be used to run all types of analysis and checks
via one top level package, and ultimately aims to provide:

* A simple and robust API
* A powerful plugin system
* Multi language/OS support
* A unified data spec

## Requirements

- [NodeJS](http://nodejs.org)

## Installation

Since Vile's core is written in [TypeScript](https://www.typescriptlang.org),
the main project is distributed via [npm](http://npmjs.org).

**CLI**

*install*

```sh
npm i -g vile
```

*help*

```sh
vile -h
```

*authenticate*

```sh
vile auth
```

*fast setup*

```sh
vile init
```

*upload*

```sh
export VILE_API_TOKEN=my-all-token
vile p -si -u project_name
```

**API**

*install*

    npm i vile

*use*

```javascript
const vile = require("vile")

vile
  .exec()
  .then((issues) => { })
```

See [src/index](modules/_src_index_.html) for the full API.

## Plugins

To actually punish your code, you need to install plugins first.

For a complete list of plugins, see [here](https://vile.io/plugins).

To get started, install a plugin package in your project root:

*for example, install the `tslint` plugin*

```sh
cd into_my_project
npm install -D @forthright/vile @forthright/vile-tslint
```

*then run*

```sh
vile punish
```

*or, more tersely*

```sh
vile p
```

Note: If you don't also have `vile` installed globally, you can access
the locally installed CLI via:

```sh
node node_modules/.bin/vile p
```

Or, if you add `"vile": "vile"` to your `package.json` scripts section, you can
run:

```sh
npm run -s vile -- p
```

After calling `vile p`, the CLI will look up any installed plugins and automatically
pull them in and run their checks.

You can also specify a white-list of installed plugins to only run:

```sh
vile p -p tslint,coffeelint
```

## Config File

A config file is named `.vile.yml` and should reside in your project root.

*looks something like this*

```yaml
vile:
  ignore: ["custom ignore list"]
  allow: ["or a custom allow list"]

some_plugin:
  config: plugin_config
  ignore: plugin_ignore
  allow: plugin_allow
```

You can also specify a custom plugin list in your config:

```yaml
vile:
  plugins:
    - "tslint"
```

### Ignore Lists

The `vile.ignore` (and plugin specific) setting is a list of items to ignore.

If a plugin specifies its own `ignore` list, then it will be merged into
`vile.ignore` and passed to the respective plugin when it is run.

At the moment, each plugin is responsible for matching against
the provided ignore list.

However, you can use the `vile.ignored("path", ignore_list)` library
method to do the matching for you.

For reference, [ignore-file](https://github.com/mafintosh/ignore-file) is currently used for matching.

### Allow Lists

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

### Combining File Data

If you want to map a `src` build directory to a `lib` output directory:

```sh
vile p -x src:lib
```

Or, in the case of this project's code:

```sh
vile p -x src.ts:lib.js
```

## Publishing

If you like, you can routinely publish and further analyze your
project on [vile.io](https://vile.io).

*create a user account, then*

```sh
vile auth
```

*then*

```sh
vile p -u project_name
```

## Editor Integration

There are various text editors that have `vile` integrations.

### Vim

Via [syntastic](https://github.com/scrooloose/syntastic).

See [forthright/syntastic](https://github.com/forthright/syntastic) for now.
Just replace the upstream install with the `master` branch.

Note: There is a lot of overlap with current syntax checkers that
do the same, and in many ways, faster, so be sure check them out too.

Current syntax checkers:

* [vile_rubycritic](https://github.com/forthright/syntastic/blob/master/syntax_checkers/ruby/vile.vim)
* [vile_rubocop](https://github.com/forthright/syntastic/blob/master/syntax_checkers/ruby/vile.vim)
* [vile_rails_best_practices](https://github.com/forthright/syntastic/blob/master/syntax_checkers/ruby/vile.vim)
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
  let g:syntastic_aggregate_errors = 0
  let g:syntastic_check_on_open = 1
  let g:syntastic_auto_jump = 0

  " Put into passive mode, and set desired checkers
  let g:syntastic_mode_map = { "mode": "passive" }
  let g:syntastic_ruby_checkers=["mri", "vile_rubycritic", "vile_rubocop", "vile_rails_best_practices"]
  let g:syntastic_slim_checkers=["vile_slim_lint", "vile_rails_best_practices"]
  let g:syntastic_sass_checkers=["vile_sass_lint"]
```

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

You can also [require("vile")](interfaces/_src__types_index_d_.vile.vile.html) in your plugin and use its
API, which provides some helpers.

See [vile.Issue](https://vile-docs.herokuapp.com/interfaces/_src__types_index_d_.vile.issue.html) for how Issues are structured.

### Writing Non-JavaScript Plugins

As long as you have a shim `index.js` file, you can use any lang to generate issue
data.

For now, [vile.spawn](interfaces/_src__types_index_d_.vile.lib.util.html#spawn) is your best bet for running external commands.

For an example, see something like [vile-hlint](https://github.com/forthright/vile-hlint).

### Writing In TypeScript

Checkout [vile-rubycritic](https://github.com/forthright/vile-rubycritic) for an example of how to pull in and use Vile's typings.

### Filtering

Plugins are expected to support both the `ignore` and `allow` lists.
There are some helper methods to abstract away the onerous work.

For example: `vile.filter` is great for using with `vile.promise_each`, or in general.

```javascript
let vile = require("vile")

module.exports = {
  punish: (config) => {
    let filtered = vile.filter(config.ignore, config.allow)

    return get_some_filepaths_to_check()
      .filter((filepath) => filtered(filepath))
      .each(determine_issues)
  }
}
```
### Windows/Unix Paths

Plugins should stick to using unix style paths in issues and where
ever else. Library utilities such as ignore and allow attempt to auto convert
windows style paths, but not necessarily from things like config lists.

### Files Without Issues

Any files that are not ignored globally via `vile.ignore` and have no
issues are sent along with any reported issues.

You can disable this with the `--dontpostprocess` option. Currently,
this does not post process anything, including code snippets.
