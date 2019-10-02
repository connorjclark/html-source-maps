/**
 * @typedef RenderingContext
 * @property {Map<string, {segment: HtmlMaps.FragmentRenderSegment, containsDefault: boolean}>} blockSegments
 * @property {HtmlMaps.Frame[]} templateStack
 * @property {*} viewContext
 */

const fs = require('fs').promises;
const {FrameMap} = require('./html-maps.js');

const DEBUG = Boolean(process.env.DEBUG);

/**
 * @param {...any} args
 */
function debug(...args) {
  if (DEBUG) console.log(...args);
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
  if (typeof cur === 'undefined') {
    const errorMessage = `Could not find: ${path}`;
    if (DEBUG) throw new Error(errorMessage);
    console.error(errorMessage);
    return '';
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
   * @param {{templateFolder: string}} options
   */
  constructor(options) {
    this.templateFolder = options.templateFolder;
    /** @type {Record<string, HtmlMaps.Template>} */
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

    const frameMap = new FrameMap();
    // Very simplified. Real solution would need to randomize the name, and know how
    // to save the file in some part of the filesystem, that's served via HTTP over a specific
    // web root path.
    const mapUrl = 'maps/map.html.json';
    /** @type {HtmlMaps.HtmlMapJson} */
    const map = {
      url: '/', // TODO
      mapUrl,
      ranges: [],
      frames: frameMap.frames(),
    };
    const position = {line: 0, column: 0};
    let text = '';

    /**
     * @param {HtmlMaps.RenderSegment} segment
     */
    const walk = (segment) => {
      if (segment.type === 'raw') {
        const range = {
          callStack: segment.callStack.map(frame => frameMap.add(frame)),
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

      if (segment.type === 'fragment') {
        segment.segments.map(walk).join('');
        return;
      }
    }

    viewContext.html_map_url = map.mapUrl;

    // Rendering can't be done immediately, since blocks can be appended
    // to from any point in the template tree. So the first step is creating
    // a minimal 'segment' tree, which can be rendered without special logic
    // via a simple DFS.
    const segments = this._render(template.value.nodes, {
      blockSegments: new Map(),
      templateStack: [],
      viewContext,
    });
    debug('====== segments ======');
    debug(JSON.stringify(segments, null, 2));
    segments.forEach(walk);

    debug('====== map ======');
    debug(JSON.stringify(map, null, 2));

    // Tack on the optional HTML property.
    map.html = text;

    await fs.writeFile(mapUrl, JSON.stringify(map, null, 2));

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
    const {blockSegments, templateStack, viewContext} = context;

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
          callStack: [node.source, ...templateStack],
          type: 'raw',
          text: node.value,
        });
        return;
      }

      if (node.type === 'template') {
        templateStack.push(node.source);
        renderSegments.push(...this._render(node.value.nodes, context));
        templateStack.pop();
        return;
      }

      if (node.type === 'block') {
        const nodeSegments = this._render(node.value.nodes, context);
        let blockSegmentData = blockSegments.get(node.value.name);
      
        if (blockSegmentData) {
          if (blockSegmentData.containsDefault) {
            blockSegmentData.containsDefault = false;
            blockSegmentData.segment.segments = [];
          }
          blockSegmentData.segment.segments.push(...nodeSegments);
        } else {
          blockSegmentData = {
            containsDefault: true,
            segment: {
              type: 'fragment',
              segments: nodeSegments,
            },
          };
          blockSegments.set(node.value.name, blockSegmentData);
          renderSegments.push(blockSegmentData.segment);
        }

        return;
      }

      if (node.type === 'placeholder') {
        renderSegments.push({
          callStack: [node.source, ...templateStack],
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
            ...context,
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
    return this.cache[templateName] = {
      source: {file: templateName, line: 0, column: 0},
      type: 'template',
      value: {
        name: templateName,
        nodes: await this._parse(templateName, templateContents),
      },
    };
  }

  /**
   * @param {string} templateName
   * @param {string} templateContents
   * @return {Promise<HtmlMaps.Node[]>}
   */
  async _parse(templateName, templateContents) {
    /** @type {HtmlMaps.Node[]} */
    const rootNodes = [];
    let nodes = rootNodes;
    
    /** @type {HtmlMaps.Node[][]} */
    let stack = [];
    
    /** @type {HtmlMaps.Node[][]} */
    let blockStack = [];
    
    let position = {line: 0, column: 0};
    
    let i = 0;
    while (i < templateContents.length) {
      const nextOpenBracketIndex = templateContents.indexOf('{%', i);
      if (nextOpenBracketIndex === -1) {
        // Done. The rest is a literal.
        nodes.push({
          source: {file: templateName, ...position},
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
      if (literalText.trim()) {
        nodes.push({
          source: {file: templateName, ...position},
          type: 'literal',
          value: templateContents.substr(i, nextOpenBracketIndex - i),
        });
      }

      advancePosition(position, literalText);

      const textWithBrackets = templateContents.substr(nextOpenBracketIndex, nextCloseBracketIndex - nextOpenBracketIndex + 2);

      // Remove the brackets and trim.
      const internalTextMatch = textWithBrackets.match(/{%=?(.*)%}/);
      if (!internalTextMatch) throw new Error(`unexpected: ${internalTextMatch}`);
      const internalText = internalTextMatch[1].trim();

      if (modifier === '=') {
        nodes.push({
          source: {file: templateName, ...position},
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
          source: {file: templateName, ...position},
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
          source: {file: templateName, ...position},
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
          ...await this._getTemplate(extendsTemplatePath),
          source: {file: templateName, ...position},
        });
      } else if (internalText.startsWith('render ')) {
        const matchResult = internalText.match(/render (.*)/);
        if (!matchResult) throw new Error(`unexpected: ${internalText}`);
        const [_, renderTemplatePath] = matchResult;

        nodes.push({
          ...await this._getTemplate(renderTemplatePath),
          source: {file: templateName, ...position},
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
      advancePosition(position, textWithBrackets);
    }

    return rootNodes;
  }
}

module.exports = TemplateEngine;
