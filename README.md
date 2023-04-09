# github-release

Modified to handle releases by overriding a single point release.

## Inputs

`files`: Glob list of files to publish.

`name`: Name of release to create. `nightly` forces the `nightly` tag to update.

`token`: Set by you to `${{secrets.GITHUB_TOKEN}}`.

`sha`: The SHA reference that the created release will be pointed to.

## Example workflow

This is an example workflow I would use to create nightly releases:

```yaml
name: Release

on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:
    inputs:
      channel:
        description: 'release to perform'
        required: true
        default: 'nightly'
        type: choice
        options:
        - nightly
        - release
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
    - uses: udoprog/github-release@tag
      id: tag
      with:
        channel: ${{github.event.inputs.channel}}
    - uses: dtolnay/rust-toolchain@stable
    - uses: Swatinem/rust-cache@v2
    # FIXME: put your build step here that puts artefacts into target/upload
    - uses: actions/upload-artifact@v1
      with:
        name: dist-${{matrix.os}}
        path: target/upload

  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: udoprog/github-release@tag
      id: tag
      with:
        channel: ${{github.event.inputs.channel}}
    - uses: actions/download-artifact@v1
      with: {name: dist-macos-latest, path: target/upload}
    - uses: actions/download-artifact@v1
      with: {name: dist-windows-latest, path: target/upload}
    - uses: actions/download-artifact@v1
      with: {name: dist-ubuntu-latest, path: target/upload}
    - uses: udoprog/github-release@v1
      with:
        files: "target/upload/*"
        name: ${{steps.tag.outputs.tag}}
        token: ${{secrets.GITHUB_TOKEN}}
```
