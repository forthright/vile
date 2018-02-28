You can easily configure Ferret and it's plugins via a `.ferret.yml` file.

The file should reside in your project root and look something like this:

```yaml
ferret:
  ignore:
    - foo/bar
  allow:
    - baz

some_plugin:
  config:
    some_opt: "some val"
  ignore: plugin_specific_ignore
  allow: plugin_specific_allow
```

You can also specify **additional** plugins to run:

```yaml
ferret:
  plugins:
    - "tslint"
```

### Ignore Lists

Ferret already ignores known directories and paths
for you, such as `node_modules`, `coverage`, etc.

Setting `ferret.ignore` in your config will ignore paths/files globally.

If `plugin_name.ignore` is set, then it will be merged into
`ferret.ignore` and passed to the respective plugin when it is run.

### Allow Lists

The `ferret.allow` (and plugin specific) setting specifies paths to
*only* include.

Note: Unlike ignore, certain levels will **overwrite** others, when set.

From highest to lowest precedence, they are:

1. Specified via `ferret a --gitdiff`
2. Specified via `ferret a file dir ...`
3. Specified via `ferret.allow`
4. Specified via `my_plugin.allow`

So, say you call `ferret a -g` it will ignore plugin/top
level allow lists, and any path arguments provided.
