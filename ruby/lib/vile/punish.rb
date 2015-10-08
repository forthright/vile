require "manowar"

define Vile

# TODO: need to change cwd now!

module Vile::Punish
  extend self

  # TODO: make into objects (with -f json when written)
  def exec opts, &block
    cmd = [ENV, vile_bin] + cmdline_args(opts)
    IO.popen cmd do |lines|
      lines.each { |line| yield line }
    end
  end

private

  ## TODO: need to install vile to cwd on gem install, vs using bash alias
  def vile_bin
    "vile"
  end

  def cmdline_args opts
    opts.to_hash.keys
      .map { |key| cmdline_arg key, opts[key] }
  end

  # TODO: too complex, gem available?
  # TODO: broken when passing arg values
  def cmdline_arg name, value
    if value == true || value == ""
      "--#{name} "
    elsif value
      if value.respond_to? :split
        list = value.split(",")
        if list.length > 0 && value.respond_to?(:join)
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
