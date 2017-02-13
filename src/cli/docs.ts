import opn = require("opn")
import commander = require("commander")

const VILE_DOCS_URL = "https://vile-docs.herokuapp.com"

const create = (cli : commander.ICommand) =>
  cli
    .command("docs")
      .alias("d")
      .action(() => {
        opn(VILE_DOCS_URL)
      })

export = {
  create: create
}
