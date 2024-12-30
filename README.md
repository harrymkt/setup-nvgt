# Setup NVGT Action
This action is useful if you want to integrate [NVGT](https://nvgt.gg) scripting language into your GitHub action (GA) workflow.
Currently, this fetches releases from the **nvgtreleases** repository, but it may be changed in the future should the official developer provide its own artifacts.

## Supported OS
The action supports the following operating systems:
- `ubuntu-latest`: Linux.
- `windows-latest`: Windows. This has not been tested yet.

## Usage
```yaml
name: Build NVGT
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup NVGT
        uses: harrymkt/setup-nvgt@main
        with:
          latest: true
      - name: Build
        # Your own build here. Eg:
        run: nvgt -c your_script.nvgt
```

## Inputs
Provide variables with the `with` parameter:
- `latest`(bool) optional: Should the action fetch the latest release as possible? Defaults to `true`.
- `version`(string) optional: The NVGT version you want to install if not latest. Eg, `0.89.1_beta`. Defaults to none.