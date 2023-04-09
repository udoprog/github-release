# udoprog/github-release@channel

This action is used to build a "channel string" such as the one used for nightly
or date-based builds. The string used depends on the kind of event which
triggered the action.

The produced `channel` depends on which `github.event_name` is being dispatched:
* For `github.event_name == 'push'` we use the current date, as provided by `$(date --iso -u)`.
* For `github.event_name == 'schedule'` we use the value of the `channel` input, which defaults to `nightly`.
* For `github.event_name == 'workflow_dispatch'` we use the value of the `channel` input, which defaults to `nightly`.

## Inputs

* `channel`: Describes the channel being built. Can curently be `nightly` or
  `date`. If `nightly` is used and the appropriate event is triggered this will
  result in a `channel` of `nightly`. If set to `date` the current date will be
  used instead such as `2023-04-09`.

  For `github.event_name == 'push'` this option is ignored, and a dated release
  is used.

## Outputs
* `channel`: The channel being built.

## Examples

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
    # FIXME: Put your build step here that puts artifacts into dist.
    #
    # Variables:
    # - ${{steps.release.outputs.channel}} is either `nightly` or a date like `2023-04-09`.
    - uses: actions/upload-artifact@v3
      with:
        path: dist
```
