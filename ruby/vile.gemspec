lib = File.expand_path("../lib", __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require "vile"

Gem::Specification.new do |spec|
  spec.name          = "vile"
  spec.version       = Vile::VERSION
  spec.authors       = ["Brent Lintner"]
  spec.email         = ["brent.lintner@gmail.com"]
  spec.summary       = "Punish your code."
  spec.description   = "A punishing, yet easy to use tool for writing insightful code. Requires NodeJS."
  spec.homepage      = "https://github.com/brentlintner/vile"
  spec.license       = "MPL-2.0"

  spec.files         = `git ls-files`.split("\n")
  spec.executables   = ["vile"]
  spec.test_files    = spec.files.grep(/^(test|spec|features)\//)
  spec.require_paths = ["lib"]

  spec.required_ruby_version = ">= 2.0"

  spec.add_runtime_dependency "manowar", "~> 0.0.1"
  spec.add_runtime_dependency "slop", "~> 4.2.0"
  spec.add_runtime_dependency "spinning_cursor", "~> 0.3.0"
  spec.add_runtime_dependency "colorize", "~> 0.7.7"

  spec.add_development_dependency "bundler", "~> 1.10.6"
  spec.add_development_dependency "awesome_print"
  spec.add_development_dependency "rspec", "~> 3.3.0"
  spec.add_development_dependency "simplecov"
  spec.add_development_dependency "simplecov-lcov"
end
