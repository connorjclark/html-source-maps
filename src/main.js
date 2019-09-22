const TemplateEngine = require('./templates.js');
const HtmlMaps = require('./html-maps.js');

async function main() {
  const templateEngine = new TemplateEngine({templateFolder: 'views'});
  const {map, text} = await templateEngine.render('posts.tpl', {
    lastUpdated: new Date().toDateString(),
    posts: [
      {name: 'Clickbait title', body: 'filler filler ad ad filler filler filler ad'},
      {name: 'Which character from Pride and Prejudice are you?', body: 'answer: none of them'},
    ],
  });

  if (process.env.MODE === 'none') {
    console.log(text);
  } else {
    HtmlMaps.visualize(text, map, {mode: process.env.MODE || 'source'});
  }
}

main();
