# Hacking

Clone the repos:

    git clone git@github.com:forthright/vile.git
    git clone git@github.com:forthright/vile-docs.git
    cd vile

We use `yarn` for development (for speed):

    npm i -g yarn
    yarn

However, `npm` should work just as well:

    npm i

See all available build commands:

    npm run

To build all:

    npm run -s compile
    npm run -s compile-dev

To run the CLI locally:

    node bin/vile -h

To run tests:

    npm -s t

To recompile `src` to `lib`:

    npm run -s compile

To run compile task with file watch in the background:

    npm run dev

To generate latest docs:

    npm run -s gen-docs
    [browser] ../vile-docs/public/index.html

## Architecture

Vile is centered around the use of [Plugins](https://docs.vile.io/#creating-a-plugin) that generate [Issues](https://docs.vile.io/interfaces/_src__types_index_d_.vile.issue.html).

A plugin is primarily written in JS, but you can
easily [shell out](https://docs.vile.io/#writing-non-javascript-plugins) to another script.

The core library and cli is written in [TypeScript](http://www.typescriptlang.org).

Test code is written in [CoffeeScript](http://coffeescript.org).

### Why NodeJS?

Node has, in the creator's humble opinion at this time of creation (2015), the
ideal balance of nix/windows support, barrier to entry, quality and
size of community and tooling, and the relative, per project requirements
of data manipulation and speed needed at this point in time.

However, Vile as a project, overall, should not be considered to be
written in (mainly) one language. It is open ended how/when the project
should make use of other, possibly better suited languages/tooling, and
how to coordinate it.
