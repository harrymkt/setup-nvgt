# Setup NVGT Action
This action is useful if you want to integrate [NVGT](https://nvgt.dev) scripting language into your GitHub action (GA) workflow.

## Supported OS
The action supports the following operating systems:
- `windows-latest`: Windows
- `ubuntu-latest`: Linux
- `macos-latest`: Mac OS

## Usage
```yaml
name: Build NVGT
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Setup NVGT
        id: nvgt
        uses: harrymkt/setup-nvgt@v1.0.8
        with:
          latest: true
      - name: Build
        # Your own build here. i.e.
        run: nvgt -c your_script.nvgt
```

## Inputs
Provide variables with the `with` parameter:
- `latest`(bool) optional: Should the action fetch the latest release as possible? Defaults to `true`.
- `version`(string) optional: The NVGT version you want to install if not latest. Eg, `0.89.1_beta`. Defaults to none. This input will be ignored if either `latest` or `dev` is `true`.
- `dev`(bool) optional: Toggles whether it should download latest development version.
- `tools`(string) optional: A list of tools to install, see below. This can install multiple tools by separating them with lines. Each tool can optionally add a tag, i.e. `tool_name@tag_name`, where tag name is one of the following:
	- `latest`: Represents the latest possible release. This is equivalent to just `tool_name` without a tag.
	- `dev`: Represents the bleeding edge development version.
	- Otherwise, the name after the `@` character is considered a version, for example, 1.0.0, v1.0.0 etc.

## Available tools
The following is a list of tools available to install using `tools` input:

| Name | Description |
|---|---|
| `nvgtpm` | The NVGT [package manager](https://github.com/harrymkt/nvgtpm), currently unofficial |
