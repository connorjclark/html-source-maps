const fs = require('fs').promises;

/**
 * @param {string} text
 */
function parsePath(text) {
  return text.split('.');
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
   * @param {string} templatePath
   * @return {Promise<HtmlMaps.Template>}
   */
  async parse(templatePath) {
    if (this.cache[templatePath]) return this.cache[templatePath];

    const templateText = await fs.readFile(`${this.templateFolder}/${templatePath}`, 'utf-8');

    /** @type {HtmlMaps.Node[]} */
    const rootNodes = [];
    let i = 0;
    let nodes = rootNodes;
    
    /** @type {HtmlMaps.Node[][]} */
    let stack = [];

    /** @type {HtmlMaps.Node[][]} */
    let blockStack = [];

    while (i < templateText.length) {
      const nextOpenBracketIndex = templateText.indexOf('{%', i);
      if (nextOpenBracketIndex === -1) {
        // Done. The rest is a literal.
        nodes.push({
          type: 'literal',
          value: templateText.substr(i),
        });
        break;
      }
      
      const modifier = templateText.charAt(nextOpenBracketIndex + 2);
      if (!validModifiers.includes(modifier) && modifier !== ' ') throw new Error(`unexpected modifier ${modifier}`);

      const nextCloseBracketIndex = templateText.indexOf('%}', nextOpenBracketIndex);
      if (nextCloseBracketIndex === -1) throw new Error('unclosed {%');
      
      nodes.push({
        type: 'literal',
        value: templateText.substr(i, nextOpenBracketIndex - i),
      });

      const internalText = templateText.substr(nextOpenBracketIndex + 3, nextCloseBracketIndex - nextOpenBracketIndex - 3).trim();

      if (modifier === '=') {
        nodes.push({
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
          type: 'template',
          value: {
            templatePath: extendsTemplatePath,
            template: await this.parse(extendsTemplatePath),
          },
        });
      } else if (internalText.startsWith('render ')) {
        const matchResult = internalText.match(/render (.*)/);
        if (!matchResult) throw new Error(`unexpected: ${internalText}`);
        const [_, renderTemplatePath] = matchResult;

        nodes.push({
          type: 'template',
          value: {
            templatePath: renderTemplatePath,
            template: await this.parse(renderTemplatePath),
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

    return this.cache[templatePath] = {
      type: 'fragment',
      value: rootNodes,
    };
  }
}

module.exports = TemplateEngine;
