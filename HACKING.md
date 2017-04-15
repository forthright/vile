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
