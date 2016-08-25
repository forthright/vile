path = require "path"
child_process = require "child_process"
chai = require "chai"
expect = chai.expect

SYSTEM_TESTS = path.join(
  __dirname, "..", "..", "test", "fixtures", "system")

VILE_BIN = path.join(__dirname, "..", "..", "bin", "vile")
NYC_BIN = path.resolve(path.join(
  __dirname, "..", "..", "node_modules", ".bin", "nyc"))

CWD       = process.cwd()
SYNC_DIR  = path.resolve(path.join(SYSTEM_TESTS, "sync"))
ASYNC_DIR = path.resolve(path.join(SYSTEM_TESTS, "async"))

sys_test_count = 0

exec = (args, cb) ->
  cli_bin = VILE_BIN
  cmd = undefined
  sys_test_count += 1
  cov_dir = path.join CWD, "coverage", "system-#{sys_test_count}"

  if process.env.TEST_COV == "1"
    cmd = "-r json --report-dir #{cov_dir} #{VILE_BIN} #{args}"
    cli_bin = NYC_BIN
  else
    cmd = args

  cli_args = cmd.split(" ").concat("--nodecorations")

  proc = child_process.spawn cli_bin, cli_args, env: process.env

  out = ""
  err = ""
  error = undefined

  proc.stdout.on "data", (d) -> out += d
  proc.stderr.on "data", (d) -> err += d

  proc.on "error", (e) -> throw e

  proc.on "close", (code) ->
    expect(err).to.be.falsy
    console.log(err) if err
    cb new Buffer(out).toString("utf-8")

describe "cli blackbox testing", ->
  afterEach -> process.chdir CWD

  it "can list help", (done) ->
    process.chdir SYNC_DIR
    exec "-h", (stdout) ->
      expect(stdout).to.match /Usage\: vile \[options\] \[command\]/i
      process.chdir CWD
      done()

  describe "sync plugins", ->
    beforeEach -> process.chdir SYNC_DIR

    it "seems to run the plugin successfully", (done) ->
      exec "p", (stdout) ->
        expect(stdout).to.match /test\-sync\-plugin\:start/i
        expect(stdout).to.match /test\-sync\-plugin\:finish/i
        done()

    it "returns a list of issues", (done) ->
      exec "p -f json", (stdout) ->
        expect(stdout).to.eql JSON.stringify([
          { type: "ok", path:".vile.yml" }
          {
            type: "test",
            signature: "sync",
            plugin: "test-sync-plugin"
          }
        ])
        done()

    describe "without post processing", ->
      it "does not include any ok issues", (done) ->
        exec "p -d -f json", (stdout) ->
          expect(stdout).to.eql JSON.stringify([
            {
              type: "test",
              signature: "sync",
              plugin: "test-sync-plugin"
            }
          ])
          done()

  describe "async plugins", ->
    beforeEach -> process.chdir ASYNC_DIR

    it "seems to run the plugin successfully", (done) ->
      exec "p", (stdout) ->
        expect(stdout).to.match /test\-async\-plugin\:start/i
        expect(stdout).to.match /test\-async\-plugin\:finish/i
        done()

    it "returns a list of issues", (done) ->
      exec "p -f json", (stdout) ->
        expect(stdout).to.eql JSON.stringify([
          { type: "ok", path:".vile.yml" }
          {
            type: "test",
            signature: "async",
            plugin: "test-async-plugin"
          }
        ])
        done()

    describe "without post processing", ->
      it "does not include any ok issues", (done) ->
        exec "p -d -f json", (stdout) ->
          expect(stdout).to.eql JSON.stringify([
            {
              type: "test",
              signature: "async",
              plugin: "test-async-plugin"
            }
          ])
          done()
