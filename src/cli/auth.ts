import commander = require("commander")
import logger = require("./../logger")

const log = logger.create("cli")

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("auth")
    .action(() => {
      log.info("To authenticate, first go to " +
          "https://ferretci.com/auth_tokens and get an All token.")
      log.info()
      log.info("Then:")
      log.info()
      log.info("  ~$ FERRET_TOKEN=token FERRET_PROJECT=my-project ferret a -u")
    })

export = { create }
