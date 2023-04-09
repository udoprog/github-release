# udoprog/github-release@tag

Extracts a tag from `${{github.ref}}` and outputs it into the `tag` output.

## Outputs

* `tag`: The tag extracted from `refs/tags/*`.
* `prerelease`: Set to `yes` if tag corresponds to a prerelease. Like
  `1.2.0-beta.1`. Otherwise `no`.

## Examples

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
    # FIXME: Put your build step here that puts artifacts into dist.
    #
    # Variables:
    # - ${{steps.release.outputs.tag}} is set to the current tag, such as `1.2.0`.
    # - ${{steps.release.outputs.prerelease}} is set to yes if the current tag is a prerelease, such as `1.2.0-beta.1`. Otherwise `no`.
    - uses: actions/upload-artifact@v3
      with:
        path: dist
```
