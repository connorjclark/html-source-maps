const fs = require('fs').promises;

/**
 * @param {string} text
 */
function parsePath(text) {
  return text.split('.');
}

class Templates {
  /**
   * @param {string} templatePath
   * @return {Promise<HtmlMaps.Template>}
   */
  static async parse(templatePath) {
    const templateText = await fs.readFile(templatePath, 'utf-8');

    /** @type {HtmlMaps.Node[]} */
    const rootNodes = [];
    let i = 0;
    let nodes = rootNodes;
    /** @type {HtmlMaps.Node[][]} */
    let stack = [];
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
      if (modifier !== '=' && modifier !== ' ') throw new Error(`unexpected modifier ${modifier}`);

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
        const [_, bindingName, iterablePath] = internalText.match(/for (.*) in (.*)/);
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
      } else if (internalText === 'end') {
        // @ts-ignore
        nodes = stack.pop();
      } else {
        console.warn('unknown code', internalText);
      }

      i = nextCloseBracketIndex + 2;
    }

    return rootNodes;
  }
}

module.exports = Templates;
