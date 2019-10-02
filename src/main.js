const fs = require('fs').promises;
const TemplateEngine = require('./templates.js');
const visualize = require('./html-maps.js').visualize;

const MODE = process.env.MODE || 'source';

async function main() {
  const command = process.argv[2];
  if (!command) {
    const templateEngine = new TemplateEngine({templateFolder: 'views'});
    const {map, text} = await templateEngine.render('posts.tpl', {
      lastUpdated: new Date().toDateString(),
      posts: [
        {name: 'Clickbait title', body: 'filler filler ad ad filler filler filler ad'},
        {name: 'Which character from Pride and Prejudice are you?', body: 'answer: none of them'},
        {name: `A ${'really '.repeat(20)}long title just to stress the word wrapping feature of the visualization`, body: 'lol'},
      ],
    });
    if (MODE !== 'none') return;
    visualize(text, map, {mode: MODE});
  } else if (command === 'load') {
    const map = JSON.parse(await fs.readFile(process.argv[3], 'utf-8'));
    visualize(map.html, map, {mode: MODE});
  } else {
    throw new Error(`unknown command ${command}`);
  }
}

main();
