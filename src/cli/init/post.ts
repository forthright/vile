import fs = require("fs")
import yaml = require("js-yaml")
import _ = require("lodash")
import Bluebird = require("bluebird")

// HACK: types fail lookup when using import
const chalk = require("chalk")

// HACK: type defs not right?
const fs_writeFile : any = Bluebird.promisify(fs.writeFile)

const plugin_map = require("./map")

const create_config = (
  config : ferret.YMLConfig
) : Bluebird<ferret.YMLConfig> => {
  const config_without_plugins = _.cloneDeep(config)
  delete config_without_plugins.ferret.plugins
  config_without_plugins.ferret.ignore = _.sortBy(
    config_without_plugins.ferret.ignore)

  return fs_writeFile(
    ".ferret.yml",
    new Buffer(yaml.safeDump(config_without_plugins))
  ).then((err : NodeJS.ErrnoException) => {
    if (err) {
      return Bluebird.reject(err)
    } else {
      return Bluebird.resolve(config)
    }
  })
}

const install_plugin_args = (plugins : string[]) =>
  _.concat(
    "install",
    "--save-dev",
    "ferret",
    _.reduce(plugins, (cmd : string[], plugin : string) => {
      cmd.push(`ferret-${plugin}`)
      return cmd
    }, []))

const install_plugins_instructions = (
  config : ferret.YMLConfig
) : Bluebird<ferret.YMLConfig> => {
  // TODO: move to method
  const by_bin = _.reduce(
    plugin_map.peer,
    (bins : any, peer_deps : any, plugin : string) => {
      _.each(peer_deps, (peer_dep : any, bin : string) => {
        if (!_.some(config.ferret.plugins, (p : string) => p == plugin)) {
          return bins
        }
        peer_dep = _.concat([], peer_dep)
        if (!bins[bin]) bins[bin] = []
        bins[bin] = _.uniq(_.concat(bins[bin], peer_dep))
      })
      return bins
    },
    {})

  const args = install_plugin_args(config.ferret.plugins)

  console.log()
  console.log(
    chalk.green("created:"),
    chalk.gray("package.json"))
  console.log(
    chalk.green("created:"),
    chalk.gray(".ferret.yml"))
  console.log()
  console.log(chalk.bold("Final Steps:"))
  console.log()
  console.log(
    chalk.green("#1"),
    chalk.gray("Install required packages:"))
  console.log()

  console.log("  ", "npm", args.join(" "))

  const deps = _.map(
    by_bin,
    (dep_list : string[], bin : string) => [ bin, dep_list ])

  return Bluebird.each(deps, (info : any[]) => {
    const [ bin, dep_list] = info
    const install_args = bin == "npm" ?
      _.concat("install", "--save-dev", dep_list) :
      _.concat("install", dep_list)

    console.log("  ", bin, install_args.join(" "))
  })
  .then(() => config)
}

const ready_to_analyze = (config : ferret.YMLConfig) => {
  console.log()
  console.log(
    chalk.green("#2"),
    chalk.gray("Commit ferret's config and package defs to source:"))
  console.log()
  console.log("  ~$ git add .ferret.yml package.json")
  console.log("  ~$ git commit -m 'Added ferret to my project.'")
  console.log()
  console.log(chalk.green("#3"), chalk.gray("Analyze some code:"))
  console.log()
  console.log("  * Run ferret locally:")
  console.log("    ~$ ferret analyze")
  console.log()
  console.log("  * Learn how to upload data to ferret.io:")
  console.log("    https://docs.ferret.io/#analyzing-your-project")
  console.log()
  console.log("  * Choose and configure more advanced plugins" +
    " and meta-packages:")
  console.log("    https://docs.ferretci.com/lang")
  console.log()
  console.log(chalk.green("Happy Punishing!"))
}

export = {
  init: (config : ferret.YMLConfig) =>
    create_config(config)
      .then(install_plugins_instructions)
      .then(ready_to_analyze)
}
