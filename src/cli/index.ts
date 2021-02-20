#! /usr/bin/env node

import fs from 'fs'
import path from 'path'
import * as stream from 'stream'
import { promisify } from 'util'

import mkdirp from 'mkdirp'
import debug from 'debug'

import { optionParser } from './options'
import * as utils from './utils'

import { parse, transformFile } from '..'

// const pipeline = promisify(stream.pipeline)
const writeFile = fs.promises ? fs.promises.writeFile : promisify(fs.writeFile)

const createStream = (...strs: Array<string>) => {
  const readable = new stream.Readable()
  strs.forEach((str) => readable.push(str))
  readable.push(null)

  return readable
}

async function main() {
  const opts = optionParser.argv
  const shouldOutputToFile = !!opts.d

  if (opts.debug === true) {
    debug.enable('vaceline:*')
  } else if (typeof opts.debug === 'string') {
    debug.enable(`vaceline:${opts.debug}:*`)
  }

  const inputPaths = opts.source
    ? fs.statSync(opts.source).isDirectory()
      ? utils.readdirr(opts.source)
      : [opts.source]
    : ['/dev/stdin']

  const writings: Array<Promise<void>> = []

  if (shouldOutputToFile && !fs.existsSync(opts.d)) mkdirp.sync(opts.d)

  for (const filePath of inputPaths) {
    const readablePath =
      filePath === '/dev/stdin'
        ? 'stdin'
        : path.relative(path.resolve(), filePath)

    console.time(readablePath)

    const output = opts.ast
      ? JSON.stringify(parse(fs.readFileSync(filePath, 'utf8')), null, 2)
      : transformFile(filePath).code

    console.timeEnd(readablePath)

    if (shouldOutputToFile) {
      const additionalExt = opts.ast ? '.json' : ''

      const outputPath =
        path.join(
          opts.d,
          opts.source
            ? path.join(
                opts.source === filePath
                  ? // input source is a file
                    path.basename(filePath)
                  : // input source is a directory, keep nested structure
                    path.relative(opts.source, filePath)
              )
            : // input is from stdin so we cannot determine the filename
              'index.vcl'
        ) + additionalExt

      writings.push(writeFile(outputPath, output))

      continue
    }

    await new Promise((resolve) =>
      createStream(output, '\n').pipe(
        fs
          .createWriteStream('/dev/stderr')
          .addListener('unpipe', () => resolve())
      )
    )
  }

  await Promise.all(writings)

  console.log(`Successfully compiled ${writings.length} files with Vaceline.`)
}

const logError = (err: Error) => console.error(err.stack)
// eslint-disable-next-line
// @ts-ignore wrong type info for `process.on` in node/global.d.ts
process.on('unhandledRejection', logError)
process.on('uncaughtException', logError)

main()
