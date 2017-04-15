import commander = require("commander")
import logger = require("./../logger")

const log = logger.create("cli")

const create = (cli : commander.ICommand) =>
  cli
    .command("auth")
      .alias("a")
      .action(() => {
        log.info("To authenticate, first go to " +
            "https://vile.io and get a user token.")
        log.info()
        log.info("Then:")
        log.info()
        log.info("  ~$ VILE_TOKEN=token VILE_PROJECT=my-project vile p -u")
      })

export = {
  create: create
}
