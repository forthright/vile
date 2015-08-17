# Vile.rb

[![Gem Version](https://badge.fury.io/rb/vile.svg)](http://badge.fury.io/rb/vile)

This is the Ruby implementation of Vile.

Use it if you want don't want to touch `.js/.coffee/.ts`. :-)

## Requirements

- [ruby](http://nodejs.org)
- [rubygems](http://rubygems.org)
- [nodejs](http://nodejs.org)
- [npm](http://npmjs.org)

## Installation

Currently, this gem is a simple, thin, probably inefficient
way to support a `gem`, so you will need to install the `vile`
npm package as well:

    npm install -g vile
    gem install vile

## CLI

    vile -h

## Library

```ruby
require "vile/punish"

Vile::Punish.exec
```
