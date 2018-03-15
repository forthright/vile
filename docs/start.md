# Getting Started

Ferret is different compared to most continuous analysis services.

You will first need to install its CLI and library on your local machine or CI server.

## Installation

The recommended way to install and update Ferret is through your favourite OS's
package manager. Many GNU/Linux distros and package formats are supported,
along with Windows and MacOS.

### Package Manager

#### MacOS

Using [Homebrew](https://brew.sh):

    brew tap forthright/ferret
    brew install ferret

#### Windows

Using [Chocolatey](https://chocolatey.org/):

    cinst ferret

#### Ubuntu

(unless we just use build.opensuse.org?)

Using a custom [PPA](https://launchpad.net/~brentlintner/+archive/ubuntu/ferret-code):

    add-apt-repository ....
    apt update
    apt install ferret-code

#### Debian

Use [build.opensuse.org](https://build.opensuse.org/).

#### Arch Linux

Using an [AUR](https://aur.archlinux.org/packages/ferret) package:

    pacman -S pacaur
    pacaur -S ferret

#### openSUSE

Using an [build.opensuse.org](https://build.opensuse.org/):

    ....
    yast install ferret

#### Fedora

Using an [build.opensuse.org](https://build.opensuse.org/):

    ....
    dnf install ferret

#### CentOS

Using an [build.opensuse.org](https://build.opensuse.org/):

    yum-....
    yum install ferret

#### Other Distros

See [build.opensuse.org](https://build.opensuse.org/).

### Platform Binaries

There are binary packages available for Linux, Windows and MacOS.

Grab a tarball from the [Releases](https://github.com/forthright/ferret/releases) page.

    echo "SHASUM  ferret-v0.9.2-linux-x86_64.tgz" | sha256sum -c
    tar -xvf ferret-v0.9.2-linux-x86_64.tgz
    cd ferret-v0.9.2-linux-x86_64
    ./ferret -h

Or, similarly, on Windows:

    ferret.cmd -h

### Install By "Source"

The main library is written in [TypeScript](https://www.typescriptlang.org) on top of [Node.js](https://nodejs.org) and hosted with [npm](https://www.npmjs.com/).

To install packages manually, or if you are familiar with an npm setup:

    cd my_project/
    npm i --save-dev @forthright/ferret
    npm i --save-dev @forthright/ferret-coverage
    npm i --save-dev @forthright/ferret-stat
    npm i --save-dev @forthright/ferret-comment
    npm i --save-dev @forthright/ferret-typescript
    npm i --save-dev @forthright/ferret-....
    npx ferret analyze

### Installing Custom Plugins

To install custom plugins on top of a binary or package manager install:

    cd my_project/
    npm i --save-dev @forthright/ferret
    npm i --save-dev ferret-my-plugin
    ferret analyze -p my-plugin

Note: If you use something like `npx ferret` in this case,
it will *not* be able to run globally installed plugins.

## Checking The Install

To see exactly what plugins and versions are being used, you can run:

    ferret version
