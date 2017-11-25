<h3 align="center">
  <p align="center">
    <img width="64" style="background: none" src="https://user-images.githubusercontent.com/93340/32079868-9ab53e9e-ba7a-11e7-817f-c6a46038db63.png" alt="the Vile logo" />
  </p>
  Vile
</h3>
<p align="center">
  A code quality tool for any language or platform.
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

`vile` is a software analysis library and [hosted service](https://vile.io) that
enables developers and organizations to analyze, maintain, and
improve their software projects over time.

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

## Language Support

The core `vile` package comes with a general set of plugins that support basic multi-language analysis.

To analyze your code further, such as tracking outdated RubyGems, plugging in
your favourite linter, tracking code complexity, or checking for vulnerabilities,
you need to install extra [plugins](https://vile.io/plugins) first.

You can also install language specific [meta-plugins](https://docs.vile.io/#language-support) that
provide all the plugins you need to fully analyze your code.

## FAQ

**Why Node.js/TypeScript?**

While JavaScript is certainly not the best language, Node+npm+TypeScript provides a reasonable
and robust (typed) way to write a decently fast, cross-OS analysis library with concurrent plugin execution.

**Can I use Vile without Node.js?**

Not yet. Ideally there will be many language implementations & native plugins that all ascribe to
the same metadata spec that Vile's [web service](https://vile.io) API accepts.

**What are some common use cases for the CLI?**

* Run `vile a` locally to analyze your code and print any issues or data
* Run `vile a -u` on every build server commit to continuously analyze your code
* Run `vile a -d -p lint-plugin my/file.ext` to run a plugin on a specific file
* Run `vile a -d -e -p lint-plugin,security-plugin` to run certain lint checks during a build

## Project Goals

* :rainbow: Provide an open and extensible platform for any type of software analysis
* :seedling: Help maintain and foster an open and inclusive community around code quality
* :vhs: Distill various types of software analysis into a language independent
data format
* :tada: Support and complement existing tooling (linters, complexity tools, etc.)
* :nut_and_bolt: Create new libraries and plugins that backfill language support (ex: [synt](https://github.com/brentlintner/synt))

For more info on why `vile` was created checkout our post on [Medium](https://medium.com/forthright/building-better-habits-for-the-greater-good-6a10de5c679a).

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
