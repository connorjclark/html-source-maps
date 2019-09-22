const chalk = require('chalk').default;
const stripAnsi = require('strip-ansi').default;

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
 * @param {{mode: string}} options
 */
function visualize(html, map, options) {
  const colors = ['#FF6347', '#2E8B57', '#1E90FF'];
  const files = [...new Set(map.ranges.map(range => range.callStack[0].file))];

  let index = 0;
  let htmlVisualization = '';
  for (let i = 0; i < map.ranges.length; i++) {
    const range = map.ranges[i];
    const partial = html.substr(index, range.length);
    index += range.length;

    let bg;
    if (options.mode === 'alternate') {
      bg = chalk.black.bgHex(colors[i % 2]);
    } else if (options.mode === 'source') {
      const colorIndex = files.indexOf(range.callStack[0].file);
      if (colorIndex >= colors.length) {
        throw new Error('need more colors');
      }
      const color = colors[colorIndex];
      bg = chalk.black.bgHex(color);
    } else {
      throw new Error(`unknown mode ${options.mode}`);
    }

    if (i % 2 === 0) {
      htmlVisualization += bg.white.bold(`${i}`);
      htmlVisualization += bg(partial);
    } else {
      htmlVisualization += bg.white.bold(`${i}`);
      htmlVisualization += bg(partial);
    }
  }

  // Add line numbers to HTML.
  htmlVisualization = htmlVisualization.split('\n').map((line, i, lines) => {
    const lineNo = i + 1;
    const paddingNeeded = String(`${lines.length + 1}`).length - String(lineNo).length;
    return ' '.repeat(paddingNeeded) + chalk.white(`${lineNo}`) + chalk.gray('|') + line;
  }).join('\n');
  
  const rangeVisualizationParts = map.ranges.map((range, i) => {
    return [
      // index
      chalk.bold.white(`${i}`),
      // 1:0 -> 3:10
      `${range.startLine + 1}:${range.startColumn} -> ${range.endLine + 1}:${range.endColumn}`,
      // callstack
      ...range.callStack.map(frame => `${frame.file}:${frame.line + 1}:${frame.column}`),
    ];
  });

  const maxLengthForColumn = rangeVisualizationParts.reduce((max, parts) => {
    return parts.map((part, i) => {
      return Math.max(max[i], stripAnsi(part).length);
    });
  }, rangeVisualizationParts.map(_ => 0));

  const leftPanel = htmlVisualization.split('\n');
  const rightPanel = rangeVisualizationParts.map(parts => {
    return parts.map((part, i) => {
      return part + ' '.repeat(maxLengthForColumn[i] - stripAnsi(part).length);
    }).join(' ');
  });

  // Combine the two 'panels'.
  const longestLineLeftPanelLength = leftPanel.reduce((max, line) => {
    return Math.max(stripAnsi(line).length, max);
  }, 0);

  for (let i = 0; i < Math.max(leftPanel.length, rightPanel.length); i++) {
    let line = '';
    let paddingLength = longestLineLeftPanelLength + 1;

    if (i < leftPanel.length) {
      line += leftPanel[i];
      paddingLength -= stripAnsi(leftPanel[i]).length;
    }
    
    if (i < rightPanel.length) {
      line += ' '.repeat(paddingLength);
      line += rightPanel[i];
    }

    console.log(line);
  }
}

module.exports = {
  visualize,
};