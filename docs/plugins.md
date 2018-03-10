# Creating a Plugin

Ferret is centred around plugins that generate various types of data for different
types of languages and frameworks.

You can find a full list of official, binary bundled plugins [here](https://ferretci.com/plugins).

## Quick Start

**TODO: just make a demo repo and post that, because it's way easier, and
can have it at @fortright/ferret-plugin-demo**

A plugin itself should be an [npm package](https://docs.npmjs.com/getting-started/creating-node-modules) prefixed
with `ferret-` and have a [main module](https://docs.npmjs.com/files/package.json#main).

First, create a new plugin shell:

    mkdir -p my_plugin/lib && cd my_plugin
    touch lib/index.js
    npm init -y
    npm i --save @forthright/ferret

Note: Unless you need an explicit or frozen version for `ferret`,
it is **highly** recommend you add ferret to `peerDependencies` instead of `dependencies`,
as there will always be a library instance available to every plugin.

## Creating a simple plugin

A simple `lib/index.js` that generates a single warning:
```javascript
const ferret = require("@forthright/ferret")

module.exports = {
  exec: (ferret_config) => {
    return ferret.data({
      type: ferret.WARN,
      path: "lib/index.js",
      message: "Oh no!"
    })
  }
}
```
You can run plugin easily

## Plugin API

Here are the methods defs.

### exports.context

This is a property that provides a declarative way for plugins to signal
things like what languages and frameworks they support.

Unless you are doing language agnostic analysis or
hand rolling your own file system traveral, you should if possible
set the appropriate contexts for your plugin.

An example for a plugin that supports generic
Ruby projects and also Rails projects:

```javascript
module.exports = {
  contexts: [
    "ruby",
    "rails"
  ]
}
```

If you wanted to exclusively run a plugin for Rails apps, omit the `ruby` context.

### exports.file

This property must be a method that is called for every valid file path
that matches the plugin's allow/ignore config and file type contexts.

If you want dead simple file traversal and type matching support (through context
setting), this is your friend.

If you really want to see any example of doing custom file traversal
using the `exec` hook, see (show pre-routine or something?).

### exports.exec

This is the method hook to use if you are not doing much with file
system traversing such as dependency release or package security checks.

The property must be method that returns an array of metadata,
or a promise that resolves into one:
```javascript
module.exports = {
  exec: (plugin_config) =>
    [ metadata ] || a_promise_that_resolves_to_array_of_metadata
}
```
## API Docs

However, you can also [require("@forthright/ferret")](library/) in your plugin and use its
API, which also provides some helpers.

## Writing Non-JavaScript Plugins

As long as you have a shim `index.js` file, you can use any lang to generate issue
data.

For now, [ferret.spawn](interfaces/_src__types_index_d_.ferret.lib.util.html#spawn) is your best bet for running external commands.

For an example, see something like [ferret-hlint](https://github.com/forthright/ferret-hlint).

## Writing In TypeScript

Checkout [ferret-rubycritic](https://github.com/forthright/ferret-rubycritic) for an example of how to pull in and use Ferret's typings.

## Windows/Unix Paths

Plugins should stick to using unix style paths in issues and where
ever else. Library utilities such as ignore and allow attempt to auto convert
windows style paths, but not necessarily from things like config lists.

## Files Without Issues

Any files that are not ignored globally via `ferret.ignore` and have no
issues are sent along with any reported issues.

Currently, you can disable this with the `--dont-post-process` option.
