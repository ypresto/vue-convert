declare module 'recast' {
  // import ASTTypes = require('ast-types')

  import * as ESPrima from 'esprima'
  // export const types: ASTTypes

  /**
   * Parse a string of code into an augmented syntax tree suitable for
   * arbitrary modification and reprinting.
   */
  function parse<AST = { program: ESPrima.Program }>(source: string, options?: { parser?: { parse(source: string): AST } }): AST

  /**
   * Traverse and potentially modify an abstract syntax tree using a
   * convenient visitor syntax:
   *
   *   recast.visit(ast, {
   *     names: [],
   *     visitIdentifier: function(path) {
   *       var node = path.value;
   *       this.visitor.names.push(node.name);
   *       this.traverse(path);
   *     }
   *   });
   */
  // visit: {
  //     enumerable: true,
  //     value: types.visit
  // },

  /**
   * Reprint a modified syntax tree using as much of the original source
   * code as possible.
   */
  function print(node: object, options?: object): { code: string, map: any }

  /**
   * Print without attempting to reuse any original source code.
   */
  // prettyPrint: {
  //     enumerable: false,
  //     value: prettyPrint
  // },

  /**
   * Customized version of require("ast-types").
   */
  // types: {
  //   enumerable: false,
  //   value: types
  // },

  /**
   * Convenient command-line interface (see e.g. example/add-braces).
   */
  // run: {
  //     enumerable: false,
  //     value: run
  // }
}


declare module 'recast/parsers/babylon' {
  import * as parser from '@babel/parser'
  export { parser }
  export { parse } from '@babel/parser'
}
