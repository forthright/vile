_ = require "lodash"
mimus = require "mimus"
index = mimus.require "./../../lib/index", __dirname, []
plugin = require "./../../lib/plugin"
logger = require "./../../lib/logger"
util = require "./../../lib/util"
chai = require "./../helpers/sinon_chai"
expect = chai.expect

describe "index", ->
  describe "library api", ->
    it "has the plugin module methods", ->
      expect(index).to.contain.all.keys plugin

    it "has the logger module as a property", ->
      expect(index.logger).to.eql logger

    it "has the util module methods", ->
      keys = _.filter(
        _.keys(util),
        (key) -> typeof util[key] == "string" ||
          typeof util[key] == "function")
      _.each keys, (key) ->
        expect(index[key]).to.eql util[key]
