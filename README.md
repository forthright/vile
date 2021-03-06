<p align="center">
<img style="background: none" src="https://user-images.githubusercontent.com/93340/29194760-20c18b1e-7df9-11e7-94aa-47c0302b1b6b.png" alt="Vile Logo">
</p>

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

## Overview

`vile` is a general purpose code quality tool for any language or
platform that statically analyzes your software project and its dependencies.

Along with its [hosted service](https://vile.io) it provides a highly
flexible platform for continuous software analysis
that integrates directly into your CI process and development workflow.

## Demo

<p align="center">
  <a href="https://asciinema.org/a/137383" target="_blank">
    <img src="https://user-images.githubusercontent.com/93340/30343065-0c55ca06-97ca-11e7-95a8-bd4605f8c452.png"/>
  </a>
</p>

## Features

* :fire: Analyze complexity & churn
* :truck: Check for outdated software packages
* :mag: Identify similar and duplicate code
* :globe_with_meridians: Calculate test coverage
* :closed_lock_with_key: Check for vulnerabilities in libraries and code
* :clipboard: Generate file statistics
* :clock2: Capture commit data
* :wrench: Run traditional linter tools
* :electric_plug: Flexible and easy to use plugin system
* :hearts: Supports Windows, Linux, and MacOS

#### [+ vile.io](https://vile.io)

* :part_alternation_mark: Track code quality and issues over time
* :muscle: Get automated insights and suggestions based on the current state of your project
* :email: Get notified about new issues and insights
* :raising_hand: Collaborate with other users
* :octocat: Set GitHub pull request statuses
* :shower: Schedule routine CI builds for popular services like CircleCI, AppVeyor, and Codeship

## Installation & Usage

The main library requires you at least have [Node.js](https://nodejs.org) installed.

A simple install and setup:

    cd my_project/
    npm i vile
    npx vile init
    npx vile analyze

Please see [docs.vile.io](https://docs.vile.io) for more detailed info.

## Plugins

The core `vile` package comes with a general set of plugins that support basic multi-language analysis.

To analyze your code further, such as tracking outdated RubyGems, plugging in
your favourite linter, tracking code complexity, or checking for vulnerabilities,
you need to install extra [plugins](https://vile.io/plugins) first.

## Common Use Cases

* Run `vile a` locally to analyze your code and print any issues or data
* Run `vile a -u` on every build server commit to continuously analyze your code
* Run `vile a -d -p lint-plugin my/file.ext` to run a plugin on a specific file
* Run `vile a -d -e -p lint-plugin,security-plugin` to run certain lint checks during a build

## Contributing

Any contributions are welcome and appreciated!

Please see [CONTRIBUTING](CONTRIBUTING.md) for more info.

## Licensing

This project is licensed under the [MPL-2.0](LICENSE) license.

Any contributions made to this project are made under the current license.

## Versioning

This project uses [Semver](http://semver.org).

## Maintainers

- Brent Lintner - [@brentlintner](http://github.com/brentlintner)

## Project Goals

* :rainbow: Provide an open and extensible platform for any type of software analysis
* :seedling: Help maintain and foster an open and inclusive community around code quality
* :vhs: Distill various types of software analysis into a language independent
data format
* :tada: Support and complement existing tooling (linters, complexity tools, etc.)
* :nut_and_bolt: Create new libraries and plugins that backfill language support (ex: [synt](https://github.com/brentlintner/synt))

For more info on why `vile` was created checkout our post on [Medium](https://medium.com/forthright/building-better-habits-for-the-greater-good-6a10de5c679a).
