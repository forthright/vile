/// <reference path="../../lib/typings/index.d.ts" />

var fs = require("fs")
var child_process = require("child_process")
var yaml = require("js-yaml")
var inquirer = require("inquirer")
var _ = require("lodash")
var Bluebird : typeof bluebird.Promise = require("bluebird")
var logger : Vile.Lib.Logger = require("./../../logger")
var plugin_map = require("./map")
var log = logger.create("cli")

var confirm_vile_config_is_ok = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> => {
  console.log()
  console.log(config)
  console.log()
  return inquirer.prompt([
    {
      type: "confirm",
      name: "ok_to_continue",
      message: "Look good?",
      default: true
    }
  ]).then((answers : any) => {
    if (answers.ok_to_continue) {
      return Bluebird.resolve(config)
    } else {
      process.exit(0)
    }
  })
}

var create_config = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> => {
  let config_without_plugins = _.cloneDeep(config)
  delete config_without_plugins.vile.plugins

  return fs.writeFileAsync(
    ".vile.yml",
    new Buffer(yaml.safeDump(config_without_plugins))
  ).then((err : NodeJS.ErrnoException) => {
    if (err) {
      return Bluebird.reject(err)
    } else {
      log.info("Created: .vile.yml")
      return Bluebird.resolve(config)
    }
  })
}

var install_plugin_args = (plugins : string[]) =>
  _.concat(
    "install",
    "--save-dev",
    "@forthright/vile",
    // TODO: when public, shoule not have @forthright prefix
    _.reduce(plugins, (cmd : string[], plugin : string) => {
      cmd.push(`@forthright/vile-${plugin}`)
      return cmd
    }, []))

var install_plugins = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> =>
  new Bluebird((resolve, reject) => {
    let args = install_plugin_args(config.vile.plugins)

    log.info("Installing plugins... this could take a while.")
    log.info("npm", args.join(" "))

    child_process
      .spawn("npm", args, { stdio: [0, 1, 2] })
      .on("close", (code : number) => {
        if (code != 0) {
          reject("Exit code was " + code)
        } else {
          log.info("Updated: package.json")
          resolve(config)
        }
      })
  })

var install_peer_and_alt_lang_dependencies = (
  config : Vile.YMLConfig
) : bluebird.Promise<Vile.YMLConfig> => {
  // TODO: move to method
  let by_bin = _.reduce(
    plugin_map.peer,
    (bins : any, deps_def : any, plugin : string) => {
      _.each(deps_def, (deps : any, bin : string) => {
        if (!_.some(config.vile.plugins, (p : string) => p == plugin)) {
          return bins
        }
        if (typeof deps == "string") deps = [ deps ]
        if (!bins[bin]) bins[bin] = []
        bins[bin] = _.uniq(_.concat(bins[bin], deps))
      }, {})
      return bins
    },
    {})

  if (_.isEmpty(by_bin)) return Bluebird.resolve(config)

  return inquirer.prompt([
    {
      type: "confirm",
      name: "ok_to_continue",
      message: "Install required plugin peer dependencies? " +
        `(requires ${Object.keys(by_bin).join(",")})`,
      default: true
    }
  ]).then((answers : any) => {
    if (!answers.ok_to_continue) return Bluebird.resolve(config)

    let deps = _.map(by_bin, (deps : any, bin : string) => [ bin, deps ])

    log.info("Installing peer dependencies... this could take a while.")

    return (<any>Bluebird).each(deps, (info : any[]) => {
      let [ bin, deps] = info
      let args = bin == "npm" ?
        _.concat("install", "--save-dev", deps) :
        _.concat("install", deps)

      log.info(bin, args.join(" "))

      return new (<any>Bluebird)((resolve, reject) => {
        child_process
          .spawn(bin, args, { stdio: [0, 1, 2] })
          .on("close", (code : number) => {
            if (code != 0) {
              let msg = `${bin} died with code: ${code}`
              reject(msg)
            } else {
              log.info(bin, "finished installing dependencies")
              resolve()
            }
          })
      })
      }
    ).then(() => config)
  })
}

var ready_to_punish = (config : Vile.YMLConfig) => {
  log.info()
  log.info("Looks like we are good to go!")
  log.info()
  log.info("Tips:")
  log.info("  1. Run all plugins:")
  log.info("    ~$ vile p")
  log.info()
  log.info("  2. Authenticate with vile.io:")
  log.info("    ~$ vile auth")
  log.info()
  log.info("  3. Upload your first commit:")
  log.info(
    "    ~$ VILE_API_TOKEN=XXXXXXX vile p " +
    "-u project_name")
  log.info()
  log.info(
    "  4. Routinely punish your code by " +
    "integrating vile into your CI/CD build process.")
  log.info()
  log.info(
    "Also, be sure to read up on your installed " +
    "plugins, and any extra requirements they might have:")
  log.info("  https://vile.io/plugins")
  log.info()
  log.info("Happy punishing!")
}

module.exports = {
  init: (config : Vile.YMLConfig) =>
    confirm_vile_config_is_ok(config)
      .then(create_config)
      .then(install_peer_and_alt_lang_dependencies)
      .then(install_plugins)
      .then(ready_to_punish)
}
