# Library API

## v0 (beta)

See [src/index](src/index.ts) for the main library exports.

Below are the current methods available.

### ferret.logger

Control logging, or turn it off when using the library itself.

*example:*

    ferret.logger.disable()

### ferret.exec

The main way to execute plugins and run pre/post process routines.

*example:*

```javascript
const ferret = require("ferret")

ferret
  .exec(ferret.config.load())
  .then((issues : ferret.IssueList) => {
    // ...
  })
```

### ferret.config

See [Module.Config](https://github.com/forthright/ferret_temp/blob/master/src/@types/index.d.ts#L325) for details.

### ferret.files/ignore/allow

At the moment, each plugin is expected to support
both the [ignore](config/#ignore-lists) and [allow](config/#allow-lists) config lists (if applicable),
notably when traversing a project's file system.

Along with `allow`, `ignore` and other methods, the `files`
util method is a base for building powerful directory tree walking and
file type and directory matching.

There *are* some helper methods to abstract away some onerous work (ex: see [Module.UtilMethods](https://github.com/forthright/ferret_temp/blob/master/src/@types/index.d.ts#L373)),
but if you are creating a new [plugin](plugins/) it is recommended
to make use of the [file]() plugin method hook which
essentially does the same thing underneath.

```javascript
const ferret = require("ferret")

const allowed = (config) => {
  const ignore_config = _.get(config, "ignore", [])
  const allow_config = _.get(config, "allow", [])
  return (file, is_dir) =>
    is_dir ||
      (vile.allowed(file, allow_config) &&
        !vile.ignored(file, ignore_config))
}

module.exports = {
  exec: (config) => {
    vile.promise_each(
      process.cwd(),
      allowed(config),
      into_stat_issue)
  }
}
```

### ferret.filter

For example: `ferret.filter` is great for using with `ferret.promise_each`, or in general.

```javascript
const ferret = require("ferret")

module.exports = {
  exec: (config) => {
    const filtered = ferret.filter(config.ignore, config.allow)

    return get_some_filepaths_to_check()
      .filter((filepath) => filtered(filepath))
      .each(determine_issues)
  }
}
```

### ferret.{DATA_TYPE}

A list of type constants for each metadata type.

See [Module.UtilKeyTypes](https://github.com/forthright/ferret_temp/blob/master/src/@types/index.d.ts#L347)
