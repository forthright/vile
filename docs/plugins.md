# Creating a Plugin

Ferret is centred around plugins that generate various types of data for different
types of languages and frameworks.

You can find a full list of official, binary bundled plugins [here](https://ferretci.com/plugins).

## Meta Plugins

There are also various [meta plugins](meta/) that provide a full set of plugins
for a specific language or framework.

## Quick Start

A plugin itself should be an [npm package](https://docs.npmjs.com/getting-started/creating-node-modules) prefixed
with `ferret-` and have a [main module](https://docs.npmjs.com/files/package.json#main).

First, create a new plugin shell:

    mkdir -p my_plugin/lib && cd my_plugin
    touch lib/index.js
    npm init -y
    npm i --save @forthright/ferret

## Plugin API

### exports.exec

The `exec` property must be method that returns an array of metadata,
or a promise that resolves into one:
```javascript
module.exports = {
  exec: (plugin_config) =>
    [ metadata ] || a_promise_that_resolves_to_array_of_metadata
}
```
### exports.context

This is a property that provides a declarative way for plugins to signal
things like what languages and frameworks they support.

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

#### Helper methods

The `exec` method is the default way to hook into Ferret's analysis calls,
and provides a very barebones way to pass metadata.

However, you can also [require("@forthright/ferret")](library/) in your plugin and use its
API, which also provides some helpers.

## API Docs

You can also [require("ferret")](library/) in your plugin and use its
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
