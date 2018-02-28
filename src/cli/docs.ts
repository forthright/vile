import opn = require("opn")
import commander = require("commander")

const FERRET_DOCS_URL = "https://docs.ferretci.com"

const create = (cli : commander.CommanderStatic) =>
  cli
    .command("docs")
    .action(() => {
      opn(FERRET_DOCS_URL)
    })

export = { create }
