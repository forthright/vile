# Getting Started

Ferret is different compared to most continuous analysis services.

You will first need to install its CLI and library on your local machine or CI server.

## Installation

### MacOS

    brew tap forthright/ferret
    brew install ferret

### Windows

    choco install ferret

### Ubuntu

    add-apt-repository ....
    apt update
    apt install ferret-code

### Arch Linux

    pacman -S pacaur
    pacaur -S ferret

### Fedora

    ....
    dnf install ferret

### Platform Binaries

There are binary packages available for Linux, Windows and MacOS.

Grab a tarball from the [Releases](https://github.com/forthright/ferret/releases) page.

    echo "SHASUM  ferret-v0.9.2-linux-x86_64.tgz" | sha256sum -c
    tar -xvf ferret-v0.9.2-linux-x86_64.tgz
    cd ferret-v0.9.2-linux-x86_64
    ./ferret -h

Or, similarly, on Windows:

    ferret.exe -h

### Install By "Source"

The main library is written in [TypeScript](https://www.typescriptlang.org) on top of [Node.js](https://nodejs.org) and hosted with [npm](https://www.npmjs.com/).

To install packages manually, or if you are familiar with an npm setup:

    cd my_project/
    npm i @forthright/ferret
    npm i @forthright/ferret-XXXX (whatever plugins and meta packages you want)

For more details on installing via `npm` see [here](/lang/#plugins).

## Checking The Install

To see exactly what plugins and versions are being used, you can run:

    ferret version
