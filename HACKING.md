# Hacking

    git clone git@github.com:forthright/vile.git
    git clone git@github.com:forthright/vile-docs.git
    cd vile
    npm i
    npm run compile
    npm run compile-dev

To run the CLI locally:

    node bin/vile -h

To run tests:

    npm -s t

To recompile `src` to `lib`:

    npm run compile

To run compile task with file watch in the background:

    npm run dev

To generate latest docs:

    npm run -s gen-docs
    [browser] ../vile-docs/public/index.html
