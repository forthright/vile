<p align="center">
  <img width="64" style="background: none" src="https://user-images.githubusercontent.com/93340/32071529-90f27f60-ba5d-11e7-94ed-84bae82dee2e.png" alt="the JavaScript logo" />
  <p align="center">
    <strong>Vile-JavaScript</strong>
  </p>
  <p align="center">
    A
    <a href="https://github.com/forthright/vile">Vile</a>
    meta plugin for analyzing your JavaScript code and ecosystem.
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/vile-javascript">
      <img src="https://badge.fury.io/js/vile-javascript.svg" alt="npm package">
    </a>
  </p>
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
6. [Flow](#flow)
7. [JSX](#jsx)
8. [Non-Standard JS](#non-standard-js)

## Overview

This package aims to provide a complete set of plugins and documentation
for analyzing your JavaScript projects with [Vile](https://github.com/forthright/vile).

## Requirements

- [Node.js](https://nodejs.org)

## Install

Install base packages:

    npm i -D vile vile-javascript

Setup ESLint if you have not already:

    npx eslint --init

## Usage

    npx vile analyze

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
