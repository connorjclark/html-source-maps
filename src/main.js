const templates = require('./templates.js');

async function main() {
  const template = await templates.parse('./views/index.tpl');
  console.log(JSON.stringify(template, null, 2));
  const html = render(template, {
    price: 100,
    names: ['connor', 'clark'],
    items: [1, 2],
  });
  console.log(html);
}

/**
 * @param {*} context 
 * @param {string[]} path
 */
function getValue(context, path) {
  let cur = context;
  for (const pathComponent of path) {
    cur = context[pathComponent];
  }
  return cur;
}

/**
 * @param {HtmlMaps.Template} template
 * @param {*} context
 */
function render(template, context) {
  let output = '';

  /**
   * @param {HtmlMaps.Node} node
   */
  function walk(node) {
    if (node.type === 'literal') {
      output += node.value;
      return;
    }

    if (node.type === 'placeholder') {
      output += getValue(context, node.value);
      return;
    }

    if (node.type === 'loop') {
      const iterable = getValue(context, node.value.iterablePath);
      const childContext = {...context};
      for (const boundValue of iterable) {
        childContext[node.value.bindingName] = boundValue;
        output += render(node.value.nodes, childContext);
      }
      return;
    }
  }

  template.forEach(walk);

  return output;
}

main();
