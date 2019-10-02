const TemplateEngine = require('./templates.js');
const templateEngine = new TemplateEngine({templateFolder: 'views'});

/**
 * @param {string} path
 * @return {Promise<{text: string, map: HtmlMaps.HtmlMapJson}>=}
 */
function maybeRender(path) {
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

  return;
}

/**
 * @param {string} path
 * @return {Promise<{text: string, map: HtmlMaps.HtmlMapJson}>}
 */
async function render(path) {
  const result = await maybeRender(path);
  if (!result) throw new Error();
  return result;
}

module.exports = {render, maybeRender};
