The web API for Ferret is used primarily by
its analysis library to upload and digest metadata.

However, as long as you have an [auth token](https://ferretci.com/auth_tokens) you can easily call any
API command with something like `curl`.

The current version (while in Beta) is `v0`.

## POST v0/projects/{project_name}/commits

Create an analysis snapshot for :project_name:.

Example:

    curl ...

## GET v0/projects/{project_name}/commits/{commit_id}/status

Get the status of a commit.

Example:

    curl ...
