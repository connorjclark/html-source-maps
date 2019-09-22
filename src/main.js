const TemplateEngine = require('./templates.js');

/**
 * @param  {...any} args
 */
function debug(...args) {
  if (process.env.DEBUG) console.log(...args);
}

async function main() {
  const templateEngine = new TemplateEngine('views');
  const template = await templateEngine.parse('posts.tpl');
  debug('====== template ======');
  debug(JSON.stringify(template, null, 2));
  const html = render(template.value, {
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
 * @typedef RenderingContext
 * @property {Map<string, HtmlMaps.BlockRenderSegment>} blockSegments
 * @property {*} viewContext
 */

/**
 * @param {HtmlMaps.Node[]} nodes
 * @param {RenderingContext} context
 */
function _render(nodes, context) {
  const {blockSegments, viewContext} = context;

  /** @type {HtmlMaps.RenderSegment[]} */
  const renderSegments = [];

  /**
   * @param {HtmlMaps.Node} node
   */
  function walk(node) {
    if (node.type === 'fragment') {
      node.value.forEach(walk);
      return;
    }

    if (node.type === 'literal') {
      renderSegments.push({
        type: 'raw',
        text: node.value,
      });
      return;
    }

    if (node.type === 'extends') {
      renderSegments.push(..._render([node.value.template], context));
      return;
    }

    if (node.type === 'block') {
      const nodeSegments = _render(node.value.nodes, context);
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
        renderSegments.push(..._render(node.value.nodes, loopRenderContext));
      }
      return;
    }
  }

  nodes.forEach(walk);
  return renderSegments;
}

/**
 * @param {HtmlMaps.Node[]} nodes
 * @param {*} viewContext
 */
function render(nodes, viewContext) {
  // Rendering can't be done immediately, since blocks can be appended
  // to from any point in the template tree. So the first step is creating
  // a minimal 'segment' tree, which can be rendered without special logic
  // via a simple DFS.
  let output = '';

  /**
   * @param {HtmlMaps.RenderSegment} segment
   */
  function walk(segment) {
    if (segment.type === 'raw') {
      output += segment.text;
      return;
    }

    if (segment.type === 'block') {
      segment.segments.map(walk).join('');
      return;
    }
  }

  const segments = _render(nodes, {
    blockSegments: new Map(),
    viewContext,
  });
  debug('====== segments ======');
  debug(JSON.stringify(segments, null, 2));
  segments.forEach(walk);
  return output;
}

main();
