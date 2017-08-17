<p align="center">
<img style="background: none" src="https://user-images.githubusercontent.com/93340/29194760-20c18b1e-7df9-11e7-94aa-47c0302b1b6b.png" alt="Vile Logo">
</p>

<p align="center">A punishing yet easy to use tool for writing insightful code. </p>

<p align="center">
  <a href="https://circleci.com/gh/forthright/vile">
    <img src="https://circleci.com/gh/forthright/vile.svg?style=shield&circle-token=76807e9cc864afc2d2af7db4c744a0eae8b9fc00" alt="Main Linux Builds">
  </a>
  <a href="https://ci.appveyor.com/project/brentlintner/vile/branch/master">
    <img src="https://ci.appveyor.com/api/projects/status/3qu5ih8n3iufpait/branch/master?svg=true" alt="Windows Builds">
  </a>
  <a href="https://travis-ci.org/forthright/vile">
    <img src="https://travis-ci.org/forthright/vile.svg?branch=master" alt="Linux/OSX Builds">
  </a>
  <a href="https://vile.io/~brentlintner/vile">
    <img src="https://vile.io/api/v0/projects/vile/badges/score?token=USryyHar5xQs7cBjNUdZ" alt="code quality score">
  </a>
  <a href="https://vile.io/~brentlintner/vile">
    <img src="https://vile.io/api/v0/projects/vile/badges/coverage?token=USryyHar5xQs7cBjNUdZ" alt="coverage status">
  </a>
  <a href="https://vile.io/~brentlintner/vile">
    <img src="https://vile.io/api/v0/projects/vile/badges/dependency?token=USryyHar5xQs7cBjNUdZ" alt="dependencies status">
  </a>
  <a href="https://www.npmjs.com/package/vile">
    <img src="https://badge.fury.io/js/vile.svg" alt="npm package">
  </a>
</p>

<p align="center">
  <img src="https://user-images.githubusercontent.com/93340/29182233-2204e6f6-7dcc-11e7-93a4-f58b16c706f6.png" alt="Quick Demo Video">
</p>

## Overview

Vile is a general purpose, multi-language code quality tool that you can
run in your terminal, integrate with your code editor, and pair with [vile.io](https://vile.io).

## Features

While [vile.io](https://vile.io) helps you continuously
analyze your software, using this standalone can help you:

* Analyze code complexity
* Check for outdated software packages
* Collect test coverage data
* Identify similar and duplicate code
* Analyze and track vulnerabilities in code and libraries
* Generate file statistics
* Track technical debt
* Enforce style guides
* Calculate churn
* Capture commit data
* Report general warnings and program errors (ex: via existing linters)

## Goals

* Provide an open and extensible platform for any type of software analysis
* Help maintain and foster an open and inclusive community around code quality
* Distill various types of software analysis into a language independent
data format
* Support and complement existing tooling (linters, complexity tools, etc.)
* Create new libraries and plugins that backfill language support (ex: [vile-synt](https://github.com/forthright/vile-synt))

## Installation & Usage

    cd my_project/
    npm i vile
    npx vile init
    npx vile analyze

Please see [docs.vile.io](https://docs.vile.io) for more info.

## Licensing

This project is licensed under the [MPL-2.0](LICENSE) license.

Any contributions made to this project are made under the current license.

## Contributing

Any contributions are welcome and appreciated!

Please see [CONTRIBUTING](CONTRIBUTING.md) for more info.

## Versioning

This project uses [Semver](http://semver.org).

## Maintainers

- Brent Lintner - [@brentlintner](http://github.com/brentlintner)
