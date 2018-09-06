#!/usr/bin/env node

import meow = require('meow')
import * as fs from 'fs'
import { join as joinPaths } from 'path'
import readdirRecursive = require('fs-readdir-recursive')
import flatMap = require('lodash.flatmap')
import { convertSfcSource } from './sfc'
import { wrapComponentSourceWithExtend } from './wrap-extend'
import { convertComponentSourceToClass } from './class-component'

const HELP = `
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
`

interface CliOptions {
  style: string
  recursive: boolean
  stdout: boolean
  verbose: boolean
}
const OPTION_KEYS = ['style', 's', 'recursive', 'r', 'stdout', 'verbose', 'v']

type Converter = (source: string, file: string) => string | null

export default class VueConvertCli {
  private cli!: meow.Result
  private converter!: Converter

  get options() {
    return this.cli.flags as CliOptions
  }

  get paths() {
    return this.cli.input
  }

  run() {
    this.cli = meow(HELP, {
      flags: {
        style: {
          alias: 's',
          type: 'string'
        },
        recursive: {
          alias: 'r',
          type: 'boolean'
        },
        stdout: {
          type: 'boolean'
        },
        verbose: {
          alias: 'v',
          type: 'boolean'
        }
      },
      // TODO: PR type for minimist options
      '--': true
    } as meow.Options)

    const hasUnknown = Object.keys(this.options).some(key => OPTION_KEYS.indexOf(key) < 0)
    if (hasUnknown || this.paths.length === 0) {
      this.cli.showHelp()
      process.exit(1)
    }

    this.converter = this.createConverter()

    if (this.options.recursive) {
      this.convertDirs(this.paths)
    } else {
      this.convertPaths(this.paths)
    }
  }

  private createConverter(): Converter {
    const style = this.options.style
    switch (style) {
      case 'extend':
        return wrapComponentSourceWithExtend
      case 'class':
        return convertComponentSourceToClass
    }
    this.cli.showHelp()
    process.exit(1)
    throw '' // See https://github.com/Microsoft/TypeScript/issues/12825
  }

  private convertDirs(dirs: string[]) {
    this.convertPaths(
      flatMap(dirs, dir => {
        try {
          return readdirRecursive(dir, name => name[0] !== '.' && name !== 'node_modules')
            .filter(path => path.endsWith('.vue'))
            .map(path => joinPaths(dir, path))
        } catch (e) {
          const ex: Error = e
          console.error(`${dir}: ${ex.message}`)
          process.exit(1)
          throw '' // See https://github.com/Microsoft/TypeScript/issues/12825
        }
      })
    )
  }

  private convertPaths(paths: string[]) {
    for (const path of paths) {
      let stat: fs.Stats
      try {
        stat = fs.statSync(path)
      } catch (e) {
        const ex: Error = e
        console.error(`${path}: ${ex.message}`)
        process.exit(1)
        throw '' // See https://github.com/Microsoft/TypeScript/issues/12825
      }
      if (stat.isDirectory()) {
        console.error(`${path}: Is directory.`)
        process.exit(1)
      }
      if (!stat.isFile()) {
        console.error(`${path}: Is not regular file.`)
        process.exit(1)
      }
      if (!path.endsWith('.vue')) {
        console.error(`${path}: Is not *.vue file.`)
        process.exit(1)
      }
    }
    this.rewriteSfcFiles(paths)
  }

  private rewriteSfcFiles(files: string[]) {
    let convertedCount = 0

    for (const file of files) {
      if (this.options.verbose) {
        process.stderr.write(file + '\n')
      }

      const source = fs.readFileSync(file).toString()
      let converted: string | null
      try {
        converted = convertSfcSource(source, file, this.converter)
      } catch (e) {
        const ex: Error = e
        console.error(`${file}: ${ex.message}`)
        process.exit(1)
        throw '' // See https://github.com/Microsoft/TypeScript/issues/12825
      }

      if (converted === null) continue

      if (this.options.stdout) {
        process.stdout.write(converted)
      } else {
        fs.writeFileSync(file, converted)
      }

      convertedCount++
    }

    if (!this.options.stdout) {
      console.log(`Converted ${convertedCount} ${convertedCount === 1 ? 'file' : 'files'}.`)
    }
  }
}

new VueConvertCli().run()
