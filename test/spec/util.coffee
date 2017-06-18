_ = require "lodash"
mimus = require "mimus"
path = require "path"
extend = require "extend"
npm_run_path = require "npm-run-path"
util = mimus.require "./../../lib/util", __dirname, []
chai = require "./../helpers/sinon_chai"
expect = chai.expect

describe "util", ->
  describe "spawn", ->
    bin = "foo"
    new_env = undefined
    cross_spawn_stub = undefined

    afterEach -> mimus.restore()

    beforeEach ->
      new_env = extend({}, process.env)
      cross_spawn_stub = mimus.stub()
      on_stub = mimus.stub().callsArgWith(1, 0)
      cross_spawn_stub.returns(
        stdout: { on: mimus.stub() }
        stderr: { on: mimus.stub() }
        on: on_stub)
      mimus.set util, "cross_spawn", cross_spawn_stub

    describe "PATH", ->
      node_bin_dir = path.dirname process.execPath

      beforeEach ->
        new_env.PATH = npm_run_path(
          cwd: process.cwd(), path: process.env.PATH)
        a = _.filter(
          _.split(new_env.PATH, path.delimiter),
          (p) -> p != node_bin_dir)
        a.push(node_bin_dir)
        new_env.PATH = _.uniq(a).join(path.delimiter)
        util.spawn bin
        return

      it "includes entire env with npm run paths", ->
        spawned_env = cross_spawn_stub.args[0][2].env
        expect(cross_spawn_stub).to.have.been.calledWith bin
        expect(spawned_env)
          .to.eql extend({}, new_env, { Path: new_env.PATH })

      describe "because of a weird failing behavious seen on windows", ->
        it "sets both Path and PATH to", ->
          spawned_env = cross_spawn_stub.args[0][2].env
          expect(spawned_env.Path).to.eql new_env.PATH
          expect(spawned_env.PATH).to.eql new_env.PATH

      describe "to avoid shims issue like rbenv", ->
        node_bin_dir = path.dirname process.execPath

        it "moves npm run path's node bin dir entry to end", ->
          run_paths = _.split(
            cross_spawn_stub.args[0][2].env.PATH, path.delimiter)
          idx = _.findIndex(run_paths, (bin) -> bin == node_bin_dir)
          expect(idx).to.eql (run_paths.length - 1)

  describe "constants", ->
    it "are defined", ->
      expect(util.OK).to.eql "ok"

      expect(util.displayable_issues).to.eql [
        "warning"
        "style"
        "maintainability"
        "duplicate",
        "error"
        "security"
        "dependency"
      ]

      expect(util.WARN).to.eql "warning"
      expect(util.STYL).to.eql "style"
      expect(util.MAIN).to.eql "maintainability"
      expect(util.COMP).to.eql "complexity"
      expect(util.CHURN).to.eql "churn"
      expect(util.DUPE).to.eql "duplicate"
      expect(util.DEP).to.eql "dependency"

      expect(util.warnings).to.eql [
        "warning"
        "style"
        "maintainability"
        "complexity"
        "churn"
        "duplicate"
        "dependency"
      ],

      expect(util.ERR).to.eql "error"

      expect(util.errors).to.eql [
        "error"
        "security"
      ]

      expect(util.STAT).to.eql "stat"
      expect(util.SCM).to.eql "scm"
      expect(util.LANG).to.eql "lang"
      expect(util.COV).to.eql "cov"

      expect(util.infos).to.eql [
        "stat"
        "scm"
        "lang"
        "cov"
      ]
