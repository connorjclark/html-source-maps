const fs = require('fs').promises;
const TemplateEngine = require('./templates.js');
const templateEngine = new TemplateEngine({templateFolder: 'views'});

/**
 * @param {string} path
 */
function route(path) {
  if (path === '/') {
    return templateEngine.render('main.tpl');
  }

  if (path === '/posts') {
    return templateEngine.render('posts.tpl', {
      lastUpdated: new Date().toDateString(),
      posts: [
        {name: 'Clickbait title', body: 'filler filler ad ad filler filler filler ad'},
        {name: 'Which character from Pride and Prejudice are you?', body: 'answer: none of them'},
        {name: `A ${'really '.repeat(20)}long title just to stress the word wrapping feature of the visualization`, body: 'lol'},
      ],
    });
  }
}

/**
 * @param {string} path
 */
async function maybeRender(path) {
  // Very simplified. Real solution would need to randomize the name, and know how
  // to save the file in some part of the filesystem, that's served via HTTP over a specific
  // web root path.
  const mapUrl = 'maps/map.html.json';

  templateEngine.setRootContext({
    html_map_url: mapUrl,
  });

  const result = await route(path);
  if (!result) return;

  result.map.url = path;
  result.map.mapUrl = mapUrl;
  await fs.writeFile(mapUrl, JSON.stringify(result.map, null, 2));

  return result;
}

/**
 * @param {string} path
 */
async function render(path) {
  const result = await maybeRender(path);
  if (!result) throw new Error();
  return result;
}

module.exports = {render, maybeRender};
