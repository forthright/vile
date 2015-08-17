require "manowar"

define Vile

module Vile::Punish
  extend self

  # TODO: make into objects (with -f json when written)
  def exec opts, &block
    cmd = [ENV] + vile_bin + cmdline_args(opts)
    IO.popen cmd do |lines|
      lines.each { |line| yield line }
    end
  end

private

  ## TODO: need to install vile to cwd on gem install, vs using bash alias
  def vile_bin
    [ "bash", "-ci", "vile", "-h" ]
  end

  def node_js_bin
    "node"
  end

  def cmdline_args opts
    opts.to_hash.keys
      .map { |key| cmdline_arg key, opts[key] }
  end

  # TODO: too complex, gem available?
  def cmdline_arg name, value
    if value == true || value == ""
      "--#{name} "
    elsif value
      if value.respond_to? :split
        list = value.split(",")
        if list.length > 0
          "--#{name} #{value.join(",")} "
        else
          "--#{name} "
        end
      else
        "--#{name} #{value} "
      end
    else
      ""
    end
  end
end
