# Contributing

Current list of [Contributors](https://github.com/forthright/ferret/graphs/contributors).

## Code Of Conduct

By participating in this project you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Submitting Issues

Current issue tracker is on [GitHub](https://github.com/forthright/ferret/issues).

Even if you are uncomfortable with code, an issue or question is welcome.

Note: If you are reporting a bug or feature request
for [ferretci.com](https://ferretci.com) itself, please see [forthright/ferretci.com](https://github.com/forthright/ferretci.com) instead.

## Submitting Patches

All you need to do is submit a [Pull Request](https://github.com/forthright/ferret/pulls).

1. Please consider tests and code quality before submitting.
2. Please try to keep commits clean, atomic and well explained (for others).

Note: If you prefer to submit a `patch` then please [open an issue](https://github.com/forthright/ferret/issues/new) and link to it.

## Development Setup

Ferret is centered around the use of [plugins](https://docs.ferretci.com/#creating-a-plugin) that generate [issues](https://docs.ferretci.com/interfaces/_src__types_index_d_.ferret.issue.html).

A plugin can be written in JavaScript, or easily [shell out](https://docs.ferretci.com/#writing-non-javascript-plugins) to another language.

The core library and cli is written in [TypeScript](http://www.typescriptlang.org).

Test code is written in [CoffeeScript](http://coffeescript.org).

### Requirements

* [Node.js]()
* [Python]()
* [MkDocs]()
* [Git]()
* [zsh/bash](http://zsh.sourceforge.net)

### Getting Started

Clone the repos:

    git clone git@github.com:forthright/ferret.git
    git clone git@github.com:forthright/ferret-docs.git
    cd ferret

Install packages:

    npm i

See all available build commands:

    npm run

Compile from `src` to `lib`:

    npm run -s compile

To run the CLI locally:

    node bin/ferret -h

To run tests:

    npm -s t

To run without system level tests:

    npm run -s test-fast

To run with system level tests:

    npm run -s test-sys

And to run with test coverage:

    npm run -s test-cov

To run compile task with file watch in the background:

    npm run dev

To generate latest docs:

    ./bin/gen-docs
    [server-static] ../ferret-docs/public/index.html
