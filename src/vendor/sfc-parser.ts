/*
 * Copied from vue, removed deindent code and translated to ts.
 * See https://github.com/vuejs/vue/pull/8724
 */
/* @flow */

import { parseHTML } from './html-parser'
import { SFCDescriptor, SFCBlock } from '@vue/component-compiler-utils'
import { VueTemplateCompilerParseOptions } from '@vue/component-compiler-utils/dist/types';

const splitRE = /\r?\n/g
const replaceRE = /./g
const isSpecialTag = function (tag: string): tag is ('script' | 'style' | 'template') {
  switch (tag) {
    case 'script':
    case 'style':
    case 'template':
      return true;
  }
  return false;
};

type Attribute = {
  name: string,
  value: string
};

/**
 * Parse a single-file component (*.vue) file into an SFC Descriptor Object.
 */
export function parseComponent (
  content: string,
  options: VueTemplateCompilerParseOptions
): SFCDescriptor {
  const sfc: SFCDescriptor = {
    // XXX: Originally these are null. But typings of @vue/component-compiler-utils is undefined.
    // https://github.com/vuejs/component-compiler-utils/pull/29
    template: undefined,
    script: undefined,
    styles: [],
    customBlocks: []
  }
  let depth = 0
  let currentBlock: SFCBlock | null = null

  function start (
    tag: string,
    attrs: Array<Attribute>,
    unary: boolean,
    start: number,
    end: number
  ) {
    if (depth === 0) {
      currentBlock = {
        type: tag,
        content: '',
        start: end,
        attrs: attrs.reduce<{ [key: string]: string | true }>((cumulated, { name, value }) => {
          cumulated[name] = value || true
          return cumulated
        }, {})
      } as SFCBlock
      if (isSpecialTag(tag)) {
        checkAttrs(currentBlock, attrs)
        if (tag === 'style') {
          sfc.styles.push(currentBlock)
        } else {
          sfc[tag] = currentBlock
        }
      } else { // custom blocks
        sfc.customBlocks.push(currentBlock)
      }
    }
    if (!unary) {
      depth++
    }
  }

  function checkAttrs (block: SFCBlock, attrs: Array<Attribute>) {
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i]
      if (attr.name === 'lang') {
        block.lang = attr.value
      }
      if (attr.name === 'scoped') {
        block.scoped = true
      }
      if (attr.name === 'module') {
        block.module = attr.value || true
      }
      if (attr.name === 'src') {
        block.src = attr.value
      }
    }
  }

  function end (tag: string, start: number, end: number) {
    if (depth === 1 && currentBlock) {
      currentBlock.end = start
      let text = content.slice(currentBlock.start, currentBlock.end)
      // pad content so that linters and pre-processors can output correct
      // line numbers in errors and warnings
      if (currentBlock.type !== 'template' && options.pad) {
        text = padContent(currentBlock, options.pad) + text
      }
      currentBlock.content = text
      currentBlock = null
    }
    depth--
  }

  function padContent (block: SFCBlock, pad: true | "line" | "space") {
    if (pad === 'space') {
      return content.slice(0, block.start).replace(replaceRE, ' ')
    } else {
      const offset = content.slice(0, block.start).split(splitRE).length
      const padChar = block.type === 'script' && !block.lang
        ? '//\n'
        : '\n'
      return Array(offset).join(padChar)
    }
  }

  parseHTML(content, {
    start,
    end
  })

  return sfc
}
