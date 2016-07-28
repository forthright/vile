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
        log.info("  ~$ VILE_API_TOKEN=token VILE_PROJECT=my-project vile p -u")
      })

module.exports = {
  create: create
}
