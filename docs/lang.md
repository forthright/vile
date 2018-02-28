The core `ferret` package comes with a variety of plugins that support various languages and frameworks.

You can find a full list of official and unofficial plugins [here](https://ferretci.com/plugins).

## JavaScript

For an everyday JavaScript (or Node.js) project:

    npm i -D ferret ferret-synt ferret-git ferret-escomplex ferret-nsp

### Node.js

### TypeScript

### CoffeeScript

### Flow

There is currently limited support for Flow using non-core plugins.
Some plugins may work, and others (that specifically parse JS) may fail.

For example [ferret-synt](https://github.com/forthright/ferret-synt) currently does not work ([yet](https://github.com/brentlintner/synt/issues/99)).

### JSX

Just like Flow there is limited support.

A good workaround is to ignore all `.jsx` files
and also any `.js` files with JSX code in them.

For example, with a plugin like [ferret-escomplex](https://github.com/forthright/ferret-escomplex):

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

## Ruby

A basic Ruby project example (using [Bundler](http://bundler.io)):

```sh
npm i -D ferret ferret-git ferret-rubycritic ferret-rubocop ferret-sass-lint ferret-bundler-audit ferret-bundler-outdated

# you can also add these to your Gemfile
gem install rubocop rubycritic bundler bundler-audit

# depending on your setup, you may need to use `bundle exec`
bundle exec ferret analyze
```

Note: Some plugins don't support ferret's allow/ignore out of the box.

For example, [ferret-rubycritic](https://github.com/forthright/ferret-rubycritic) requires
you set specific `allow` paths to avoid traversing `node_modules`.

The same goes for [ferret-rubocop](https://github.com/forthright/ferret-rubocop#ignoring-files).

### Rails

For an in depth article about using Rails + ferret checkout [Continuous Analysis For Your Rails Project Using ferret and CircleCI](https://medium.com/forthright/continuous-analysis-for-your-rails-project-using-ferret-and-circleci-4fb077378ab6).

## Haskell

Depending on your setup and if you are using sandboxes, you may need to use `cabal exec`:

```sh
cabal exec -- ferret analyze
```
## PHP

## Python

## Scala
