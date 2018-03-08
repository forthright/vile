# Analyzing Your Code

## Configure Your Project

By default, Ferret will auto detect your languages and frameworks
and run any appropriate plugins.

However, various non-native languages require additional config
files and settings, so it is recommended you run the `configure` command first:

    cd my_project/
    ferret configure

This will run the auto detect routine, copy any appropriate config
files to your project's root, and let you know about anything else worth knowing about.

## Authenticate Your Machine

Authenticating with Ferret is pretty straightforward if a bit manual (at the moment).

First, create an account on [FerretCI](https://ferretci.com) if you haven't,
and complete the authentication setup with:

    ferret auth

*([Don't want to create an account?](faq/#can-i-use-ferret-without-creating-an-account))*

## Upload Your First Commit

Now we can analyze our project locally and upload our first analysis snapshot
using Ferret's web service API.

    ferret analyze --commit

*Note: If you are using a plugin like `ferret-git`, uploading snapshots
on both master and non-master branches (force push away!) will reflect in
your commits list and provide out of the box support for integrations like
GitHub PR request statuses.*

## Track Your Code Quality

While you can use the web interface at [ferretci.com](https://ferretci.com) to fully
manage and view your project, you don't have the
leave the console if you don't want to.

### Overview

    ferret overview

### Files

    ferret files

Shows all your files and their stats and scores.

### Dependencies

    ferret deps

Lists all your outdated software dependencies.

### Issues

    ferret issues

Browse through all your issues found during `ferret analyze`.

### Insights

    ferret insights

View all insights and suggestions based on the current state of your project

### Commits

    ferret commits

See all your `ferret analyze` snapshots and their associated commit info.

## Integrate With Your Build Server

Ferret is most helpful when you integrate it into your CI/CD process
and run it right after your build and test steps.

See below for some popular examples.

*Note: don't forget to set `FERRET_TOKEN` and
(optionally) `FERRET_PROJECT` on your build server!*

### CircleCI

Example `circle.yml`:

```yaml
machine:
  node:
    version: 6.10.1

# see: https://github.com/forthright/ferret-git#cicd-issues
checkout:
  post:
    - "[[ ! -s \"$(git rev-parse --git-dir)/shallow\" ]] || git fetch --unshallow"
    - git checkout -f $CIRCLE_BRANCH

test:
  post:
    - ferret a -u -n
```

### AppVeyor

Example `appveyor.yml`:

```yaml
cache:
  - node_modules -> package.json

environment:
  matrix:
    - nodejs_version: 6
      npm_version: 4.x.x

platform:
  - x86
  - x64

# if you are using unix style line endings
init:
  - git config --global core.autocrlf input

# might need higher value for better churn calculation
clone_depth: 10

build: off

install:
  - ps: Install-Product node $env:nodejs_version
  - ps: npm install -g npm@$env:npm_version
  - npm install

test_script:
  - # run tests here
  - ferret a -u -n
```

### TravisCI

Example `.travis.yml`:

```yaml
os:
  - linux

language: node_js

node_js:
  - "6"

cache:
  directories:
    - node_modules

env:
  - NPM_VER=4.x.x

before_install:
  - npm install -g npm@$NPM_VER

git:
  depth: 10

script:
  - # run tests here
  - ferret a -u -n
```

### Codeship

If you run into issues reporting `churn` or generating `git` data, you may need to do this
prior to analyzing:

    git checkout -f $CI_BRANCH

