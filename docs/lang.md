# Language Support

If you are installing Ferret [by "source"](start/#install-by-source) then this section
will be helpful. If you are using the pre-compiled binary which
comes loaded with all available official plugins, you only need to
really worry about [configuring your project](/analyze/#configure-your-project).

Below are all the [meta plugins](/plugins/#meta-plugins) that are
bundled with Ferret's binaries.

## JavaScript

Provided via [ferret-javascript](https://github.com/forthright/ferret/tree/master/meta/javascript).

<table>
  <tr>
    <th width="300">Metadata Type</th>
    <th width="600">Provided By</th>
  </tr>
  <tr>
    <td>Coverage</td>
    <td>
      <a id="coverage" href="https://github.com/forthright/vile-coverage">vile-coverage</a>
    </td>
  </tr>
  <tr>
    <td id="complexity">Complexity</td>
    <td>
      <a href="https://github.com/forthright/vile-rubycritic">vile-rubycritic</a>
    </td>
  </tr>
  <tr>
    <td id="churn">Churn</td>
    <td>
      <a href="https://github.com/forthright/vile-rubycritic">vile-rubycritic</a>
    </td>
  </tr>
  <tr>
    <td id="dependencies">Dependencies</td>
    <td>
      <a href="https://github.com/forthright/vile-bundler-outdated">vile-bundler-outdated</a>
    </td>
  </tr>
  <tr>
    <td id="duplicate">Duplicate</td>
    <td>
      <a href="https://github.com/forthright/vile-rubycritic">vile-rubycritic</a>
    </td>
  </tr>
  <tr>
    <td id="security">Security</td>
    <td>
      <a href="https://github.com/forthright/vile-bundler-audit">vile-bundler-audit</a>
    </td>
  </tr>
  <tr>
    <td id="file-statistics">File Statistics</td>
    <td>
      <a href="https://github.com/forthright/vile-stat">vile-stat</a>
    </td>
  </tr>
  <tr>
    <td id="commit-info">Commit Info</td>
    <td>
      <a href="https://github.com/forthright/vile-git">vile-git</a>
    </td>
  </tr>
  <tr>
    <td id="lint-tools">Lint Tools</td>
    <td>
      <p>Included:</p>
      <ul>
        <li>
          <a href="https://github.com/forthright/vile-rubocop">vile-rubocop</a>
        </li>
        <li>
          <a href="https://github.com/forthright/vile-rubycritic">vile-rubycritic</a>
        </li>
      </ul>
      <p>User installable:</p>
      <ul>
        <li>
          <a href="https://github.com/forthright/vile-brakeman">vile-brakeman</a>
        </li>
        <li>
          <a href="https://github.com/forthright/vile-rails-best-practices">vile-rails-best-practices</a>
        </li>
        <li>
          <a href="https://github.com/forthright/vile-reek">vile-reek</a>
        </li>
        <li>
          <a href="https://github.com/forthright/vile-sass-lint">vile-sass-lint</a>
        </li>
        <li>
          <a href="https://github.com/forthright/vile-scsslint">vile-scsslint</a>
        </li>
        <li>
          <a href="https://github.com/forthright/vile-slim-lint">vile-slim-lint</a>
        </li>
      </ul>
    </td>
  </tr>
</table>

### Node.js

See [ferret-node](https://github.com/forthright/ferret/tree/master/meta/node).

### TypeScript

See [ferret-typescript](https://github.com/forthright/ferret/tree/master/meta/node).

### CoffeeScript

See [ferret-coffeescript](https://github.com/forthright/ferret/tree/master/meta/node).

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
