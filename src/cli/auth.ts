/// <reference path="../lib/typings/index.d.ts" />

var logger  : Vile.Lib.Logger  = require("./../logger")
var log = logger.create("cli")

// TODO: any is Commander.js
var create = (cli : any) =>
  cli
    .command("auth")
      .alias("a")
      .action(() => {
        log.info("To authenticate, first go to " +
            "https://vile.io and get a user token.")
        log.info()
        log.info("Then:")
        log.info()
        log.info("  ~$ export VILE_API_TOKEN=project_auth_token")
      })

module.exports = {
  create: create
}
