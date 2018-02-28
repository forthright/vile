<h3 align="center">
  <p align="center">
    <img width="64" style="background: none" src="https://user-images.githubusercontent.com/93340/30883744-2f236bc6-a2db-11e7-8b29-d65ebd1afde2.png" alt="the Ruby logo" />
  </p>
  Vile-Ruby
</h3>
<p align="center">
  A
  <a href="https://github.com/forthright/vile">Vile</a>
  meta plugin for analyzing your Ruby code and ecosystem.
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/vile-ruby">
    <img src="https://badge.fury.io/js/vile-ruby.svg" alt="npm package">
  </a>
</p>

## Table Of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Plugins](#plugins)
    * [Complexity](#complexity)
    * [Churn](#churn)
    * [Dependencies](#dependencies)
    * [Duplicate](#duplicate)
    * [Security](#security)
    * [File Statistics](#file-statistics)
    * [Commit Info](#commit-info)
    * [Lint Tools](#lint-tools)
6. [Frameworks](#frameworks)
    * [Rails](#rails)
7. [Caveats](#caveats)

## Overview

This package aims to provide a complete set of plugins and documentation
for analyzing your Ruby projects with [Vile](https://github.com/forthright/vile).

## Requirements

- [Node.js](https://nodejs.org)
- [Ruby](https://www.ruby-lang.org)
- [Bundler](https://bundler.io)

## Installation

    npm i -D vile vile-ruby

    # Add these to your Gemfile
    gem install rubocop rubycritic bundler bundler-audit

Note: Some plugins don't support Vile's allow/ignore out of the box

For example, [vile-rubycritic](https://github.com/forthright/vile-rubycritic#ignore) requires
you set specific `allow` paths to avoid traversing `node_modules`.

The same goes for [vile-rubocop](https://github.com/forthright/vile-rubocop#ignoring-files).

To fix this, first make a `.vile.yml` in your project root like this:

```yaml
rubycritic:
  allow:
    - app
    - lib
```

And also add a `.rubcocop.yml` file like this:

```yaml
AllCops:
  Exclude:
    - 'node_modules/**/*'
    - 'vendor/**/*'
    - 'tmp/**/*'
    - 'bin/**/*'
```

## Usage

Depending on your `gem` setup, you may need to do this:

    bundle exec vile analyze

## Plugins

<table>
  <tr>
    <th width="300">Analysis Types</th>
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

## Frameworks

There are a number of plugins not included in the meta package that support various
ruby based frameworks.

#### Rails

An everyday Rails project example using [Sass](http://sass-lang.com):

    npm i -D vile vile-ruby vile-brakeman vile-rails-best-practices vile-sass-lint
    gem install rubocop rubycritic bundler bundler-audit brakeman rails-best-practices

For an in-depth article checkout our post: [Continuous Analysis For Your Rails Project Using Vile and CircleCI](https://medium.com/forthright/continuous-analysis-for-your-rails-project-using-vile-and-circleci-4fb077378ab6).

## Caveats

**Plugins won't install properly with npm v2 and below**

First check the packages got installed [flatly](https://docs.npmjs.com/how-npm-works/npm3):

    ls -l node_modules/* | grep vile

If not, you can also just pick and choose the [plugins](package.json) this package specifices.

For example, for a basic Ruby (using [Bundler](http://bundler.io)):

    npm i -D vile vile-git vile-rubycritic vile-rubocop vile-sass-lint vile-bundler-audit vile-bundler-outdated
