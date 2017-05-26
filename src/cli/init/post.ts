import fs = require("fs")
import child_process = require("child_process")
import yaml = require("js-yaml")
import inquirer = require("inquirer")
import _ = require("lodash")
import Bluebird = require("bluebird")
import logger = require("./../../logger")

const plugin_map = require("./map")

const log = logger.create("cli")

const confirm_vile_config_is_ok = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> => {
  console.log()
  console.log(config)
  console.log()
  return (inquirer as any).prompt([
    {
      default: true,
      message: "Look good?",
      name: "ok_to_continue",
      type: "confirm"
    }
  ]).then((answers : any) => {
    if (answers.ok_to_continue) {
      return Bluebird.resolve(config)
    } else {
      return Bluebird.resolve(process.exit(0))
    }
  })
}

const create_config = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> => {
  const config_without_plugins = _.cloneDeep(config)
  delete config_without_plugins.vile.plugins

  return (fs as any).writeFileAsync(
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

const install_plugin_args = (plugins : string[]) =>
  _.concat(
    "install",
    "--save-dev",
    "vile",
    _.reduce(plugins, (cmd : string[], plugin : string) => {
      cmd.push(`vile-${plugin}`)
      return cmd
    }, []))

const install_plugins = (
  config : vile.YMLConfig
) : Bluebird<vile.YMLConfig> => {
  // TODO: move to method
  const by_bin = _.reduce(
    plugin_map.peer,
    (bins : any, deps_def : any, plugin : string) => {
      _.each(deps_def, (deps : any, bin : string) => {
        if (!_.some(config.vile.plugins, (p : string) => p == plugin)) {
          return bins
        }
        if (typeof deps == "string") deps = [ deps ]
        if (!bins[bin]) bins[bin] = []
        bins[bin] = _.uniq(_.concat(bins[bin], deps))
      })
      return bins
    },
    {})

  if (_.isEmpty(by_bin)) return Bluebird.resolve(config)

  return (inquirer as any).prompt([
    {
      default: false,
      message: "Install required plugins and their peer dependencies? " +
        `(requires ${Object.keys(by_bin).join(",")})`,
      name: "ok_to_continue",
      type: "confirm"
    }
  ]).then((answers : any) => {
    const install = answers.ok_to_continue

    const deps = _.map(
      by_bin,
      (dep_list : string[], bin : string) => [ bin, dep_list ])

    if (install) {
      log.info("Installing peer dependencies... this could take a while.")
    }

    return Bluebird.each(deps, (info : any[]) => {
      const [ bin, dep_list] = info
      const args = bin == "npm" ?
        _.concat("install", "--save-dev", dep_list) :
        _.concat("install", dep_list)

      if (!install) {
        log.warn("skipping:", bin, args.join(" "))
        return Bluebird.resolve(config)
      } else {
        log.info(bin, args.join(" "))

        return new Bluebird((
          resolve : () => void,
          reject : (err : string) => void
        ) => {
          child_process
            .spawn(bin, args, { stdio: [0, 1, 2] })
            .on("close", (code : number) => {
              if (code != 0) {
                const msg = `${bin} died with code: ${code}`
                reject(msg)
              } else {
                log.info(bin, "finished installing dependencies")
                resolve()
              }
            })
        })
      }
    })
    .then(() =>
      new Bluebird((resolve, reject) => {
        const args = install_plugin_args(config.vile.plugins)

        if (install) {
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
        } else {
          log.warn("skipping:", "npm", args.join(" "))
          resolve(config)
        }
      }))
  })
}

const ready_to_punish = (config : vile.YMLConfig) => {
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
    "    ~$ VILE_TOKEN=XXXXXXX vile p " +
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

export = {
  init: (config : vile.YMLConfig) =>
    confirm_vile_config_is_ok(config)
      .then(create_config)
      .then(install_plugins)
      .then(ready_to_punish)
}
