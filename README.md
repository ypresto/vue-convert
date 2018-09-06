# vue-class-component

> Convert Vue components into TypeScript-friendly style.

## Installation

    npm i -g vue-convert

## Usage

    Usage
      $ vue-convert -s <style> <file> [...]
      $ vue-convert -s <style> -r <dir> [...]

      Converts *.vue files into TypeScript-friendly style.

    Options
      --style, -s <style>   Component style in 'extend' or 'class'. (Required)

                              extend:
                                Just wraps all components with Vue.extend(...) .
                                Component objects will gain type information with such
                                a small change to their code.
                                See https://medium.com/the-vue-point/upcoming-typescript-changes-in-vue-2-5-e9bd7e2ecf08

                              class:
                                Converts object-based components into ES6 class using
                                vue-property-decorator library. It is the classical
                                way to gain TypeScript power in Vue.
                                See https://vuejs.org/v2/guide/typescript.html#Class-Style-Vue-Components

      --recursive, -r       Recursively converts all *.vue files in specified dirs.
      --stdout              Write to stdout instead of to replace files.
      --verbose, -v         Show file path before each file is converted.

      --help                Show this help.
      --version             Show version.

## Examples

- --style extend : https://github.com/ypresto/vue-hackernews-2.0/pull/1/files
- --style class : https://github.com/ypresto/vue-hackernews-2.0/pull/2/files
