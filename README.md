# udoprog/github-release@v1

Modified to handle releases by overriding a single point release. This differs
from your typical release plugin in that it will forcefully **overwrite** any
existing releases and does things in a very opinionated way.

## Inputs

* `files`: Glob list of files to publish. Such as `dist/*`.
  **required**
* `name`: Name of release to create. `nightly` forces the `nightly` tag to
  update. **required**
* `token`: Set by you to `${{secrets.GITHUB_TOKEN}}`. **required**
* `sha`: The SHA reference that the created release will be pointed to.
  **optional**
* `prerelease`: Set to `yes` or `true` if this is a prerelease. If this is an
  empty string, `null` or `undefined` it will be set to `true` if `name` is
  `nightly`. Any other value counts as `false`. **optional**

## Additional actions in this repo

This repo has two additional actions which aids in setting up releases:
* [`udoprog/github-release@tag`](https://github.com/udoprog/github-release/tree/tag)
  - to extract a tag.
* [`udoprog/github-release@channel`](https://github.com/udoprog/github-release/tree/channel)
  - to build a "channel string" such as the one used for nightly or date-based
  builds. The string used depends on the kind of event which triggered the
  action.

## Examples

If you want to see projects using this:

* [`udoprog/github-release@tag` in udoprog/OxidizeBot](https://github.com/udoprog/OxidizeBot/blob/main/.github/workflows/release.yml).
* [`udoprog/github-release@channel` in udoprog/OxidizeBot](https://github.com/udoprog/OxidizeBot/blob/main/.github/workflows/nightly.yml).

#### Tagged releases

The following shows a workflow which provides tagged releases when tags are
pushed, such as `1.2.0` or `1.2.0-beta.1` (as a *prerelease*).

```yaml
name: Release

on:
  tags:
    - '*'

jobs:
  build:
    runs-on: ${{matrix.os}}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    steps:
    - uses: actions/checkout@v3
    - uses: udoprog/github-release@tag
      id: release
    - uses: dtolnay/rust-toolchain@stable
    - uses: Swatinem/rust-cache@v2
    # FIXME: Put your build step here that puts artifacts into `dist`.
    #
    # Variables:
    # - ${{steps.release.outputs.tag}} is set to the current tag, such as `1.2.0`.
    # - ${{steps.release.outputs.prerelease}} is set to yes if the current tag is a prerelease, such as `1.2.0-beta.1`. Otherwise `no`.
    - uses: actions/upload-artifact@v3
      with:
        name: dist-${{matrix.os}}
        path: dist

  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: udoprog/github-release@tag
      id: release
    - uses: actions/download-artifact@v3
      with: {name: dist-macos-latest, path: dist}
    - uses: actions/download-artifact@v3
      with: {name: dist-windows-latest, path: dist}
    - uses: actions/download-artifact@v3
      with: {name: dist-ubuntu-latest, path: dist}
    - uses: udoprog/github-release@v1
      with:
        files: "dist/*"
        token: ${{secrets.GITHUB_TOKEN}}
        name: ${{steps.release.outputs.tag}}
        prerelease: ${{steps.release.outputs.prerelease}}
```

#### Nightly or dated releases

This is an example workflow I would use to create nightly or dated releases
(when the `date` option is selected for a `workflow_dispatch`):

```yaml
name: Release

# This configuration provides three options for creating releases:
# - A `nightly` release is created every night at 00:00.
# - A *dated release* is created either through a manual dispatch
#   with the `date` option selected, or by pushing to the `release` branch.
on:
  workflow_dispatch:
    inputs:
      channel:
        description: 'kind of release to perform'
        required: true
        default: 'nightly'
        type: choice
        options:
        - nightly
        - date
  schedule:
    - cron: '0 0 * * *'
  push:
    branches:
      - release

jobs:
  build:
    runs-on: ${{matrix.os}}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    steps:
    - uses: actions/checkout@v3
    - uses: udoprog/github-release@channel
      id: release
      with:
        channel: ${{github.event.inputs.channel}}
    - uses: dtolnay/rust-toolchain@stable
    - uses: Swatinem/rust-cache@v2
    # FIXME: Put your build step here that puts artefacts into dist.
    #
    # Variables:
    # - ${{steps.release.outputs.channel}} is either `nightly` or a date like `2023-04-09`.
    - uses: actions/upload-artifact@v3
      with:
        name: dist-${{matrix.os}}
        path: dist

  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: udoprog/github-release@channel
      id: release
      with:
        channel: ${{github.event.inputs.channel}}
    - uses: actions/download-artifact@v3
      with: {name: dist-macos-latest, path: dist}
    - uses: actions/download-artifact@v3
      with: {name: dist-windows-latest, path: dist}
    - uses: actions/download-artifact@v3
      with: {name: dist-ubuntu-latest, path: dist}
    - uses: udoprog/github-release@v1
      with:
        files: "dist/*"
        token: ${{secrets.GITHUB_TOKEN}}
        name: ${{steps.release.outputs.channel}}
```
