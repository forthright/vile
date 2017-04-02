mimus = require "mimus"
chai = require "./../../helpers/sinon_chai"
expect = chai.expect
cli_docs = mimus.require(
  "./../../../lib/cli/docs", __dirname, [])

opn = undefined
commander = undefined

describe "cli/docs", ->
  before ->
    opn = mimus.stub()
    mimus.set cli_docs, "opn", opn
    commander = {}
    commander.command = mimus.stub()
    commander.command.returns commander
    commander.alias = mimus.stub()
    commander.alias.returns commander
    commander.action = mimus.stub()
    commander.action.returns commander
    commander.action.callsArgWith(0, commander)

  afterEach -> mimus.reset()

  after -> mimus.restore()

  describe ".create", ->
    beforeEach ->
      cli_docs.create commander

    it "opens the docs url in the user's browser", ->
      expect(opn).to.have.been
        .calledWith "https://docs.vile.io"
