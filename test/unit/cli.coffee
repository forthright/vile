mimus = require "mimus"
sinon = require "sinon"
chai = require "./../helpers/sinon_chai"
expect = chai.expect
cli = mimus.require "./../../lib/cli", __dirname, []
cli_pkg = mimus.get cli, "pkg"
commander = mimus.get cli, "cli"
argv = undefined
sub_modules = [
  "cli_punish",
  "cli_auth",
  "cli_init"
]

interpret = ->
  mimus.stub console, "log"
  mimus.stub process.stdout, "write"
  mimus.stub process.stderr, "write"
  mimus.stub process, "exit"
  cli.interpret argv
  process.stdout.write.restore()
  process.stderr.write.restore()
  console.log.restore()

describe "cli", ->
  afterEach mimus.reset

  beforeEach ->
    argv = [ "node", "script" ]
    mimus.stub commander, "outputHelp"
    mimus.stub commander, "version"
    mimus.stub commander, "on"

    sub_modules.forEach (mod) ->
      mimus.stub mimus.get(cli, mod), "create"

  describe ".interpret", ->
    describe "setting the version", ->
      beforeEach -> interpret()

      it "sets it to the package verison", ->
        expect(commander.version).to.have.been
          .calledWith cli_pkg.version

    describe "help", ->
      describe "with no args", ->
        beforeEach -> interpret()

        it "mentions command specific help args on help", ->
          log_help = mimus.get cli, "log_additional_help"
          mimus.stub console, "log"
          log_help()
          expect(console.log).to.have.been
            .calledWith "  Command specific help:"
          expect(commander.on).to.have.been
            .calledWith "--help", log_help
          console.log.restore()

        it "outputs help", ->
          expect(commander.outputHelp).to.have.been.called

      describe "with args", ->
        before ->
          argv = argv.concat "auth"
          interpret()

        it "does not output help", ->
          expect(commander.outputHelp).to.have.been.called

    sub_modules.forEach (mod) ->
      beforeEach -> interpret()

      it "binds the #{mod} module", ->
        expect(mimus.get(cli, mod).create).to.have.been
          .calledWith(commander)
