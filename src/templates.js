/**
 * @typedef RenderingContext
 * @property {Map<string, HtmlMaps.BlockRenderSegment>} blockSegments
 * @property {*} viewContext
 */

const fs = require('fs').promises;

/**
 * @param {...any} args
 */
function debug(...args) {
  if (process.env.DEBUG) console.log(...args);
}

/**
 * @param {*} context 
 * @param {string[]} path
 */
function getValue(context, path) {
  let cur = context;
  for (const pathComponent of path) {
    cur = cur[pathComponent];
  }
  return cur;
}

/**
 * @param {string} text
 */
function parsePath(text) {
  return text.split('.');
}

/**
 * @param {{line: number, column: number}} position
 * @param {string} text
 */
function advancePosition(position, text) {
  const numLines = (text.match(/\n/g) || []).length;
  if (numLines) {
    position.line += numLines;
    position.column = text.length - text.lastIndexOf('\n');
  } else {
    position.column += text.length;
  }
}

const validModifiers = [
  // output
  '=',
];

class TemplateEngine {
  /**
   * @param {string} templateFolder
   */
  constructor(templateFolder) {
    this.templateFolder = templateFolder;
    /** @type {Record<string, HtmlMaps.FragmentNode>} */
    this.cache = {};
  }

  /**
   * @param {string} templateName
   * @param {*} viewContext
   */
  async render(templateName, viewContext) {
    const template = await this._getTemplate(templateName);

    debug('====== template ======');
    debug(JSON.stringify(template, null, 2));

    /** @type {HtmlMaps.HtmlMap} */
    const map = {
      ranges: [],
      frames: [],
    };
    
    let text = '';
    const position = {line: 0, column: 0};

    /**
     * @param {HtmlMaps.RenderSegment} segment
     */
    const walk = (segment) => {
      if (segment.type === 'raw') {
        const range = {
          callStack: [segment.source],
          startLine: position.line,
          startColumn: position.column,
          endLine: 0,
          endColumn: 0,
          // ...
          length: segment.text.length,
          text: segment.text,
        }
        advancePosition(position, segment.text);
        range.endLine = position.line;
        range.endColumn = position.column;        
        map.ranges.push(range);

        text += segment.text;
        return;
      }

      // TODO: rename `fragment`.
      if (segment.type === 'block') {
        segment.segments.map(walk).join('');
        return;
      }
    }

    // Rendering can't be done immediately, since blocks can be appended
    // to from any point in the template tree. So the first step is creating
    // a minimal 'segment' tree, which can be rendered without special logic
    // via a simple DFS.
    const segments = this._render(template.value, {
      blockSegments: new Map(),
      viewContext,
    });
    debug('====== segments ======');
    debug(JSON.stringify(segments, null, 2));
    segments.forEach(walk);

    debug('====== map ======');
    debug(JSON.stringify(map, null, 2));

    return {
      text,
      map,
    };
  }

  /**
   * @param {HtmlMaps.Node[]} nodes
   * @param {RenderingContext} context
   * @return {HtmlMaps.RenderSegment[]}
   */
  _render(nodes, context) {
    const {blockSegments, viewContext} = context;

    /** @type {HtmlMaps.RenderSegment[]} */
    const renderSegments = [];

    /**
     * @param {HtmlMaps.Node} node
     */
    const walk = (node) => {
      if (node.type === 'fragment') {
        node.value.forEach(walk);
        return;
      }

      if (node.type === 'literal') {
        renderSegments.push({
          source: node.source,
          type: 'raw',
          text: node.value,
        });
        return;
      }

      if (node.type === 'template') {
        renderSegments.push(...this._render([node.value.template], context));
        return;
      }

      if (node.type === 'block') {
        const nodeSegments = this._render(node.value.nodes, context);
        let blockSegment = blockSegments.get(node.value.name);
      
        if (blockSegment) {
          if (blockSegment.containsDefault) {
            blockSegment.containsDefault = false;
            blockSegment.segments = [];
          }
          blockSegment.segments.push(...nodeSegments);
        } else {
          blockSegment = { type: 'block', containsDefault: true, segments: nodeSegments };
          blockSegments.set(node.value.name, blockSegment);
          renderSegments.push(blockSegment);
        }

        return;
      }

      if (node.type === 'placeholder') {
        renderSegments.push({
          source: node.source,
          type: 'raw',
          text: getValue(viewContext, node.value),
        });
        return;
      }

      if (node.type === 'loop') {
        const iterable = getValue(viewContext, node.value.iterablePath);
        const childViewContext = {...viewContext};
        for (const boundValue of iterable) {
          childViewContext[node.value.bindingName] = boundValue;
          const loopRenderContext = {
            renderSegments,
            blockSegments,
            viewContext: childViewContext,
          };
          renderSegments.push(...this._render(node.value.nodes, loopRenderContext));
        }
        return;
      }
    }

    nodes.forEach(walk);
    return renderSegments;
  }

  /**
   * @param {string} templateName
   * @return {Promise<HtmlMaps.Template>}
   */
  async _getTemplate(templateName) {
    if (this.cache[templateName]) return this.cache[templateName];
    const templateContents = await fs.readFile(`${this.templateFolder}/${templateName}`, 'utf-8');
    return this.cache[templateName] = await this._parse(templateContents);
  }

  /**
   * @param {string} templateContents
   * @return {Promise<HtmlMaps.Template>}
   */
  async _parse(templateContents) {
    /** @type {HtmlMaps.Node[]} */
    const rootNodes = [];
    let i = 0;
    let nodes = rootNodes;
    
    /** @type {HtmlMaps.Node[][]} */
    let stack = [];

    /** @type {HtmlMaps.Node[][]} */
    let blockStack = [];

    let position = {line: 0, column: 0};

    while (i < templateContents.length) {
      const nextOpenBracketIndex = templateContents.indexOf('{%', i);
      if (nextOpenBracketIndex === -1) {
        // Done. The rest is a literal.
        nodes.push({
          source: {...position},
          type: 'literal',
          value: templateContents.substr(i),
        });
        break;
      }
      
      const modifier = templateContents.charAt(nextOpenBracketIndex + 2);
      if (!validModifiers.includes(modifier) && modifier !== ' ') throw new Error(`unexpected modifier ${modifier}`);

      const nextCloseBracketIndex = templateContents.indexOf('%}', nextOpenBracketIndex);
      if (nextCloseBracketIndex === -1) throw new Error('unclosed {%');
      
      const literalText = templateContents.substr(i, nextOpenBracketIndex - i);
      if (literalText) {
        nodes.push({
          source: {...position},
          type: 'literal',
          value: templateContents.substr(i, nextOpenBracketIndex - i),
        });
      }

      advancePosition(position, literalText);

      const internalText = templateContents.substr(nextOpenBracketIndex + 3, nextCloseBracketIndex - nextOpenBracketIndex - 3).trim();

      if (modifier === '=') {
        nodes.push({
          source: {...position},
          type: 'placeholder',
          value: parsePath(internalText),
        });
      } else if (internalText.startsWith('for ')) {
        const matchResult = internalText.match(/for (.*) in (.*)/);
        if (!matchResult) throw new Error(`unexpected: ${internalText}`);
        const [_, bindingName, iterablePath] = matchResult;

        /** @type {HtmlMaps.Node[]} */
        const childNodes = [];
        nodes.push({
          source: {...position},
          type: 'loop',
          value: {
            bindingName,
            iterablePath: parsePath(iterablePath),
            nodes: childNodes,
          },
        });
        stack.push(nodes);
        nodes = childNodes;
      } else if (internalText.startsWith('block ')) {
        const matchResult = internalText.match(/block (.*)/);
        if (!matchResult) throw new Error(`unexpected: ${internalText}`);
        const [_, blockName] = matchResult;

        /** @type {HtmlMaps.Node[]} */
        const childNodes = [];
        nodes.push({
          source: {...position},
          type: 'block',
          value: {
            name: blockName,
            nodes: childNodes,
          },
        });
        blockStack.push(nodes);
        nodes = childNodes;
      } else if (internalText.startsWith('extends ')) {
        if (i > 0) throw new Error('extends must be used in the beginning of a template');

        const matchResult = internalText.match(/extends (.*)/);
        if (!matchResult) throw new Error(`unexpected: ${internalText}`);
        const [_, extendsTemplatePath] = matchResult;

        nodes.push({
          source: {...position},
          type: 'template',
          value: {
            templatePath: extendsTemplatePath,
            template: await this._getTemplate(extendsTemplatePath),
          },
        });
      } else if (internalText.startsWith('render ')) {
        const matchResult = internalText.match(/render (.*)/);
        if (!matchResult) throw new Error(`unexpected: ${internalText}`);
        const [_, renderTemplatePath] = matchResult;

        nodes.push({
          source: {...position},
          type: 'template',
          value: {
            templatePath: renderTemplatePath,
            template: await this._getTemplate(renderTemplatePath),
          },
        });
      } else if (internalText === 'end') {
        // @ts-ignore
        nodes = stack.pop();
      } else if (internalText === 'endblock') {
        // @ts-ignore
        nodes = blockStack.pop();
      } else {
        console.warn('unknown code', internalText);
      }

      i = nextCloseBracketIndex + 2;
    }

    return {
      source: {line: 0, column: 0},
      type: 'fragment',
      value: rootNodes,
    };
  }
}

module.exports = TemplateEngine;
