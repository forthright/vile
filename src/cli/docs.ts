import opn = require("opn")
import commander = require("commander")

const VILE_DOCS_URL = "https://docs.vile.io"

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("docs")
    .action(() => {
      opn(VILE_DOCS_URL)
    })

export = { create }
