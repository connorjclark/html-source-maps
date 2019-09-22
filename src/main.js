const chalk = require('chalk').default;
const stripAnsi = require('strip-ansi').default;
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
    visualize(text, map);
  } else {
    console.log(text);
  }
}

// Looks like this.
/*
 0|0<html>                                                              0	0:0	->	2:10
 1|<head>
 2|  <title>1Posts2</title>                                             1	2:10	->	2:15
 3|  3                                                                  2	2:15	->	3:3
 4|  <script src="/posts.js"></script>                                  3	3:3	->	5:1
 5|4                                                                    4	5:1	->	8:3
 6|</head>
 7|<body>
 8|  5                                                                  5	8:3	->	9:20
 9|  <p>Last updated: 6Sat Sep 21 20197</p>                             6	9:20	->	9:35
10|                                                                     7	9:35	->	12:3
11|  <h1>Posts<h1>
12|  8                                                                  8	12:3	->	13:5
13|    9<h2>10Clickbait title11</h2>                                    9	13:5	->	13:9
14|<div>12filler filler ad ad filler filler filler ad13</div>           10	13:9	->	13:24
15|14                                                                   11	13:24	->	14:6
16|  15                                                                 12	14:6	->	14:49
17|    16<h2>17Which character from Pride and Prejudice are you?18</h2> 13	14:49	->	15:1
18|<div>19answer: none of them20</div>                                  14	15:1	->	16:3
19|21                                                                   15	16:3	->	17:5
20|  22                                                                 16	17:5	->	17:9
21|23                                                                   17	17:9	->	17:58
22|</body>                                                              18	17:58	->	18:6
23|</html>                                                              19	18:6	->	18:26
24|24                                                                   20	18:26	->	19:1
25|                                                                     21	19:1	->	20:3
26|25                                                                   22	20:3	->	21:1
27|                                                                     23	21:1	->	24:1
28|26                                                                   24	24:1	->	26:1
29|                                                                     25	26:1	->	28:1
30|27                                                                   26	28:1	->	30:1
31|                                                                     27	30:1	->	31:1
*/
/**
 * 
 * @param {string} html
 * @param {HtmlMaps.HtmlMap} map
 */
function visualize(html, map) {
  let index = 0;
  let htmlVisualization = '';
  for (let i = 0; i < map.ranges.length; i++) {
    const range = map.ranges[i];
    const partial = html.substr(index, range.length);
    index += range.length;

    if (i % 2 === 0) {
      htmlVisualization += chalk.black.bgHex('#FF6347').white.bold(`${i}`);
      htmlVisualization += chalk.black.bgHex('#FF6347')(partial);
    } else {
      htmlVisualization += chalk.black.bgHex('#2E8B57').white.bold(`${i}`);
      htmlVisualization += chalk.black.bgHex('#2E8B57')(partial);
    }
  }

  // Add line numbers to HTML.
  htmlVisualization = htmlVisualization.split('\n').map((line, i, lines) => {
    const paddingNeeded = String(`${lines.length}`).length - String(i).length;
    return ' '.repeat(paddingNeeded) + chalk.white(`${i}`) + chalk.gray('|') + line;
  }).join('\n');

  const rangeVisualization = [];
  for (let i = 0; i < map.ranges.length; i++) {
    const range = map.ranges[i];

    // Force newlines if needed.
    for (let j = rangeVisualization.length; j < range.startLine; j++) {
      rangeVisualization.push('');
    }

    // TODO: better aligning
    const rangeRepr = [
      chalk.bold.white(`${i}`),
      `${range.startLine}:${range.startColumn}`,
      '->',
      `${range.endLine}:${range.endColumn}`,
    ].join('\t');
    rangeVisualization.push(rangeRepr);
  }

  const leftPanel = htmlVisualization.split('\n');
  const rightPanel = rangeVisualization;

  // Combine the two 'panels'.
  const longestLineLeftPanelLength = leftPanel.reduce((max, line) => {
    return Math.max(stripAnsi(line).length, max);
  }, 0);

  for (let i = 0; i < Math.max(leftPanel.length, rightPanel.length); i++) {
    let line = '';

    if (i <= leftPanel.length) {
      line += leftPanel[i];
      const paddingLength = longestLineLeftPanelLength - stripAnsi(leftPanel[i]).length + 1;
      line += ' '.repeat(paddingLength);
    }

    if (i <= rightPanel.length) {
      line += rightPanel[i];
    }

    console.log(line);
  }
}

main();
