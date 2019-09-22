const TemplateEngine = require('./templates.js');

async function main() {
  const templateEngine = new TemplateEngine('views');
  const html = await templateEngine.render('posts.tpl', {
    lastUpdated: new Date().toDateString(),
    posts: [
      {name: 'Clickbait title', body: 'filler filler ad ad filler filler filler ad'},
      {name: 'Which character from Pride and Prejudice are you?', body: 'answer: none of them'},
    ],
  });
  console.log(html);
}

main();
