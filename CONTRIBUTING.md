# Contributing

Current list of [Contributors](https://github.com/forthright/vile/graphs/contributors).

## Code Of Conduct

By participating in this project you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Issues

Current issue tracker is on [GitHub](https://github.com/forthright/vile/issues).

Even if you are uncomfortable with code, an issue or question is welcome.

Note: If you are reporting a bug or feature request
for [vile.io](https://vile.io) itself, please see [forthright/vile.io](https://github.com/forthright/vile.io) instead.

## Patches

All you need to do is submit a [Pull Request](https://github.com/forthright/vile/pulls).

1. Please consider tests and code quality before submitting.
2. Please try to keep commits clean, atomic and well explained (for others).

Note: If you prefer to submit a `patch` then please [open an issue](https://github.com/forthright/vile/issues/new) and link to it.

## Developing

Vile is centered around the use of [plugins](https://docs.vile.io/#creating-a-plugin) that generate [issues](https://docs.vile.io/interfaces/_src__types_index_d_.vile.issue.html).

A plugin can be written in JavaScript, or easily [shell out](https://docs.vile.io/#writing-non-javascript-plugins) to another language.

The core library and cli is written in [TypeScript](http://www.typescriptlang.org).

Test code is written in [CoffeeScript](http://coffeescript.org).

### Getting Started

Clone the repos:

    git clone git@github.com:forthright/vile.git
    git clone git@github.com:forthright/vile-docs.git
    cd vile

Install packages:

    npm i

See all available build commands:

    npm run

Compile from `src` to `lib`:

    npm run -s compile

To run the CLI locally:

    node bin/vile -h

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

    npm run -s gen-docs
    [browser] ../vile-docs/public/index.html
