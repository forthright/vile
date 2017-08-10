![vile_full](https://cloud.githubusercontent.com/assets/93340/23980691/aba34a1a-09d7-11e7-85b2-12d1403b5686.png)

A punishing yet easy to use tool for writing insightful code.

## Requirements

- [Node.js](http://nodejs.org)

## Installation

    npm i -g vile

## Configuration

    cd my_project_src/
    vile init

Note: If you don't like installing vile's CLI globally, you can easily
access the locally installed CLI using something like [npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b).

## Analyzing Your Project

1. Make an account on [vile.io](https://vile.io).

2. Create a [New Project](https://vile.io/new_project).

3. Grab an [API Token](https://vile.io/auth_tokens).

4. Upload your first commit:

```sh
export VILE_TOKEN=my-all-token
export VILE_PROJECT=my-project-name

vile analyze -u
```

## Setting Up Continuous Analysis

Vile is most helpful when you integrate it into your CI/CD process
and run it right after your build and test steps.

See below for some popular examples.

*Note: don't forget to set `VILE_TOKEN` and `VILE_PROJECT` on your build server!*

### CircleCI

Example `circle.yml`:

```yaml
machine:
  node:
    version: 6.10.1

# see: https://github.com/forthright/vile-git#cicd-issues
checkout:
  post:
    - "[[ ! -s \"$(git rev-parse --git-dir)/shallow\" ]] || git fetch --unshallow"
    - git checkout -f $CIRCLE_BRANCH

test:
  post:
    - vile a -u -n
```

### AppVeyor

Example `appveyor.yml`:

```yaml
cache:
  - node_modules -> package.json

environment:
  matrix:
    - nodejs_version: 6
      npm_version: 4.x.x

platform:
  - x86
  - x64

# if you are using unix style line endings
init:
  - git config --global core.autocrlf input

# might need higher value for better churn calculation
clone_depth: 10

build: off

install:
  - ps: Install-Product node $env:nodejs_version
  - ps: npm install -g npm@$env:npm_version
  - npm install

test_script:
  - # run tests here
  - vile a -u -n
```

### TravisCI

Example `.travis.yml`:

```yaml
os:
  - linux

language: node_js

node_js:
  - "6"

cache:
  directories:
    - node_modules

env:
  - NPM_VER=4.x.x

before_install:
  - npm install -g npm@$NPM_VER

git:
  depth: 10

script:
  - # run tests here
  - vile a -u -n
```

### Codeship

If you run into issues reporting `churn` or generating `git` data, you may need to do this
prior to analyzing:

    git checkout -f $CI_BRANCH

## Language Support

Vile itself comes with a general set of plugins that support basic multi language analysis.

To analyze your code further, such as tracking outdated RubyGems, plugging in
your favourite linter, tracking code complexity, or checking for vulnerabilities,
you need to install extra plugins first.

While there is a full list of plugins available [here](https://vile.io/plugins), please
see below for tips and known caveats for various languages and frameworks.

### JavaScript

For an everyday JavaScript (or Node.js) project:

    npm i -D vile vile-synt vile-git vile-escomplex vile-nsp

### Flow

There is currently limited support for Flow using non-core plugins.
Some plugins may work, and others (that specifically parse JS) may fail.

For example [vile-synt](https://github.com/forthright/vile-synt) currently does not work ([yet](https://github.com/brentlintner/synt/issues/99)).

### JSX

Just like Flow there is limited support.

A good workaround is to ignore all `.jsx` files
and also any `.js` files with JSX code in them.

For example, with a plugin like [vile-escomplex](https://github.com/forthright/vile-escomplex):

```yaml
escomplex:
  ignore:
    - "*.jsx"
    - path/to/jsx
```

### Non-Standard JS

If you are using EMCAScript Stage-3 and below proposals,
some plugins might not work out of the box or just yet.

A good workaround is to map `lib` data to `src` using the CLI's
`-x src:lib` option, while also ignoring `src` for the specific plugins:

```yaml
synt:
  ignore: src
escomplex:
  ignore: src
```

### Ruby

A basic Ruby project example (using [Bundler](http://bundler.io)):

```sh
    npm i -D vile vile-git vile-sass-lint vile-bundler-audit vile-bundler-outdated

    # you can also add these to your Gemfile
    gem install rubocop rubycritic bundler bundler-audit

    # depending on your setup, you may need to use `bundle exec`
    bundle exec vile analyze
```

Note: Some plugins don't support Vile's allow/ignore out of the box.

For example, [vile-rubycritic](https://github.com/forthright/vile-rubycritic) requires
you set specific `allow` paths to avoid traversing `node_modules`.

### Rails

For an in depth article about using Rails + Vile checkout [Continuous Analysis For Your Rails Project Using Vile and CircleCI](https://medium.com/forthright/continuous-analysis-for-your-rails-project-using-vile-and-circleci-4fb077378ab6).

### Haskell

Depending on your setup and if you are using sandboxes, you may need to use `cabal exec`:

    cabal exec -- vile analyze

## Config

You can easily configure Vile and it's plugins via a `.vile.yml` file.

The file should reside in your project root and look something like this:

```yaml
vile:
  ignore:
    - foo/bar
  allow:
    - baz

some_plugin:
  config:
    some_opt: "some val"
  ignore: plugin_specific_ignore
  allow: plugin_specific_allow
```

You can also specify a custom plugin list in your config:

```yaml
vile:
  plugins:
    - "tslint"
```

### Ignore Lists

Vile already ignores known directories and paths
for you, such as `node_modules`, `coverage`, etc.

Setting `vile.ignore` in your config will ignore paths/files globally.

If `plugin_name.ignore` is set, then it will be merged into
`vile.ignore` and passed to the respective plugin when it is run.

### Allow Lists

The `vile.allow` (and plugin specific) setting specifies paths to
*only* include.

Note: Unlike ignore, certain levels will **overwrite** others, when set.

From highest to lowest precedence, they are:

1. Specified via `vile a --gitdiff`
2. Specified via `vile a file dir ...`
3. Specified via `vile.allow`
4. Specified via `my_plugin.allow`

So, say you call `vile a -g` it will ignore plugin/top
level allow lists, and any path arguments provided.

## Getting New Releases

    cd my_project_src/
    npx npm-check-updates -u
    npm install
    git commit package.json -m "Updated some vile packages."

For a global install:

    npx npm-check-updates -g -f vile
    npm install -g vile

## Editor Integration

You *should* be able to integrate vile into any text editor (ex: via the `-f syntastic` flag).

### Vim

Via [syntastic](https://github.com/scrooloose/syntastic).

See [forthright/syntastic](https://github.com/forthright/syntastic) for now.
Just replace the upstream install with the `master` branch.

Note: There is a lot of overlap with current syntax checkers that
already exist. For the most part they are faster (ex: hlint),
so check those out first.

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

## Library Integration

*install:*

    npm i vile

*analyze:*

```javascript
const vile = require("vile")

vile.logger.disable()

vile
  .exec(vile.config.load())
  .then((issues : vile.IssueList) => {
    // ...
  })
```

See [src/index](modules/_src_index_.html) for the full API.

## Creating A Plugin

A plugin itself should be an [npm package](https://docs.npmjs.com/getting-started/creating-node-modules) prefixed
with `vile-`, and have a [main module](https://docs.npmjs.com/files/package.json#main) that
exports a `punish` method.

The `punish` method should return an array of issues,
or a promise that resolves into one:

```javascript
module.exports = {
  punish: (plugin_config) =>
    [issues] || a_promise_that_resolves_to_array_of_issues
}
```

You can also [require("vile")](https://docs.vile.io/interfaces/_src__types_index_d_.vile.module.index.html) in your plugin and use its
API, which provides some helpers.

See [vile.Issue](https://docs.vile.io/interfaces/_src__types_index_d_.vile.issue.html) for how Issues are structured.

### Writing Non-JavaScript Plugins

As long as you have a shim `index.js` file, you can use any lang to generate issue
data.

For now, [vile.spawn](interfaces/_src__types_index_d_.vile.lib.util.html#spawn) is your best bet for running external commands.

For an example, see something like [vile-hlint](https://github.com/forthright/vile-hlint).

### Writing In TypeScript

Checkout [vile-rubycritic](https://github.com/forthright/vile-rubycritic) for an example of how to pull in and use Vile's typings.

### Filtering

At the moment, each plugin is expected to support
both the `ignore` and `allow` lists (if applicable).

#### Ignore Lists

You can use the `vile.ignored("path", ignore_list)` library
method help with matching.

For reference, [node-ignore](https://www.npmjs.com/package/ignore) is currently used for matching.

#### Allow Lists

Similarily, you can use `vile.allowed("path", allow_list)`.

#### Helpers

There are also some helper methods to abstract away some onerous work.

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

Currently, you can disable this with the `--dont-post-process` option.
