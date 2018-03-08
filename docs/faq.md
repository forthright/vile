# FAQ

## Can I use Ferret without installing Node.js?

As long as you use the [pre-compiled binaries](start/#platform-binaries) or
[install from a package manager](start/#installation), you
don't need to have anything related to Node.js installed or configured.

## Can I use Ferret in my preferred programming language?

Currently, no. Ideally there will be many language implementations & native plugins that all ascribe to
the same metadata spec that Ferret's [web service](https://ferretci.com) API accepts.

## Can I use Ferret without creating an account?

Of course! Ferret will **ONLY** upload data or interact with Ferret's web
API with your knowledge and consent, for example: when you
run something like `ferret analyze --commit`.

On its own you can use Ferret to statically analyze your projects,
view and manipulate metadata and issues locally,
and even run [traditional linter tools](editor/).

## Why Node.js / TypeScript?

While JavaScript is certainly not the best language, Node+npm+TypeScript provides a reasonable
and robust (typed) way to write a decently fast, cross-OS analysis library with concurrent plugin execution.

## Ferret is (F)OSS, but not FerretCI?

Currently the code behind [ferretci.com](https://ferretci.com) is closed source.

As a project, the most vital goal for Ferret is to fund
it properly and with enough margin so that there can be an actively paid team of developers and other
professionals supporting and growing the project.

Given this, the tried and tested way of providing a pay-for-private SaaS model (ex: GitHub)
seemed like an ideal one at the start. However, Ferret started out as a passion project
that I would rather have free and open compared to closed and purely for profit.

Other mechanisms of managing a "company" of contributors and maintainers (ideally in a decentralized way
such as with [Open Collective](https://opencollective.com)) are definitely on the radar as well, and if enough users like the idea then
I believe it behooves the maintainers/creators to do so.

## Didn't this project used to be called something else?

Yes. It was originally called Vile, and started out a software library, CLI and
local web report for JS/Ruby based projects. From there it just outgrew its name as well as the
connotations its name conveyed, resulting in some pretty noticeable brand dissonance.

In the end a name like Ferret was much more appropriate for the project as a whole.
