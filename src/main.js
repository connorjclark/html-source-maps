const chalk = require('chalk').default;
const TemplateEngine = require('./templates.js');

async function main() {
  const templateEngine = new TemplateEngine('views');
  const {map, text} = await templateEngine.render('posts.tpl', {
    lastUpdated: new Date().toDateString(),
    posts: [
      {name: 'Clickbait title', body: 'filler filler ad ad filler filler filler ad'},
      {name: 'Which character from Pride and Prejudice are you?', body: 'answer: none of them'},
    ],
  });

  if (process.env.DEBUG) {
    let index = 0;
    let visualization = '';
    for (let i = 0; i < map.ranges.length; i++) {
      const range = map.ranges[i];
      const partial = text.substr(index, range.length);
      index += range.length;

      if (i % 2 === 0) {
        visualization += chalk.black.bgHex('#FF6347').white.bold(`${i}`);
        visualization += chalk.black.bgHex('#FF6347')(partial);
      } else {
        visualization += chalk.black.bgHex('#2E8B57').white.bold(`${i}`);
        visualization += chalk.black.bgHex('#2E8B57')(partial);
      }
    }

    visualization = visualization.split('\n').map((line, i, lines) => {
      const paddingNeeded = String(`${lines.length}`).length - String(i).length;
      return ' '.repeat(paddingNeeded) + chalk.white(`${i}`) + chalk.gray('|') + line;
    }).join('\n');

    console.log(visualization);
    for (let i = 0; i < map.ranges.length; i++) {
      const range = map.ranges[i];
      console.log(chalk.bold.white(`${i}`), `${range.startLine}:${range.startColumn} -> ${range.endLine}:${range.endColumn}`);
    }
  } else {
    console.log(text);
  }

}

main();
