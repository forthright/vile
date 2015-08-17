require "manowar"
require "slop"
require_relative "../vile"

module Vile::CLI
  extend self

  # TODO: don't dupe cli def in js/rb
  def parse
    Slop.parse(&API)
  end

private

  API = proc do |o|
    o.banner = "usage: vile [options]"

    o.string "-p", "--punish",
             "ex: vile -p reek,rubocop (`vile -p` looks in "\
             "node_modules, unless config file specifies them)",
             suppress_errors: true

    o.string "-c", "--config",
             "specify a config file, else look for one in the cwd",
             suppress_errors: true

    o.bool   "-s", "--scores",
             "print all file scores"

    o.bool   "-S", "--summary",
             "print just a summary of scores"

    o.bool   "-g", "--grades",
             "print all file scores as A-F grades"

    o.string "-f", "--format",
             "specify output format (web,console,json,yml)"

    o.string "-l", "--log",
             "specify the log level (info|warn|error|debug)"

    o.bool   "-q", "--quiet",
             "be wvery wvery quiet"

    o.bool   "-v", "--verbose",
             "log all the things"

    o.on     "-V", "--version", "print the version" do
      puts Vile::VERSION
    end

    o.on     "-h", "--help", "show this help text" do
      puts o
    end
  end
end

