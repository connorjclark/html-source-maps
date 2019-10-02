const fs = require('fs').promises;
const app = require('./app.js');
const visualize = require('./html-maps.js').visualize;

const MODE = process.env.MODE || 'source';

async function main() {
  const command = process.argv[2];
  if (!command) {
    // Simple usage case to see example.
    const {map, text} = await app.render('/posts');
    if (MODE === 'none') return;
    visualize(text, map, {mode: MODE});
  } else if (command === 'load') {
    // Load saved map from disk.
    const map = JSON.parse(await fs.readFile(process.argv[3], 'utf-8'));
    visualize(map.html, map, {mode: MODE});
  } else if (command === 'fetch') {
    // TODO: fetch URL and parse html to get map url
  } else {
    throw new Error(`unknown command ${command}`);
  }
}

main();
