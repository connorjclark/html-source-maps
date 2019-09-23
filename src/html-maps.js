const chalk = require('chalk').default;
const stripAnsi = require('strip-ansi').default;
const wordWrap = require('word-wrap');

class FrameMap {
  constructor() {
    /** @type {Map<string, number>} */
    this._frameToIdMap = new Map();
    /** @type {HtmlMaps.Frame[]} */
    this._frames = [];
  }

  frames() {
    return this._frames;
  }

  /**
   * @param {HtmlMaps.Frame} frame
   */
  add(frame) {
    const key = this._key(frame);
    let id = this._frameToIdMap.get(key);
    if (typeof id === 'undefined') {
      id = this._frames.length;
      this._frameToIdMap.set(key, id);
      this._frames.push(frame);
    }
    return id;
  }

  /**
   * @param {HtmlMaps.Frame} frame
   */
  _key(frame) {
    return `${frame.file}:${frame.line}:${frame.column}`;
  }
}

class HtmlSourceMap {
  /**
   * @param {HtmlMaps.HtmlMapJson} mapJson
  */
  constructor(mapJson) {
    this.ranges = mapJson.ranges.map(range => {
      return {
        ...range,
        callStack: range.callStack.map(i => mapJson.frames[i]),
      };
    });
    // this._frames = mapJson.frames;
  }

  /**
   * @param {(range: Omit<HtmlMaps.Range, 'callStack'> & {callStack: HtmlMaps.Frame[]}) => void} fn
   */
  // forEachRange(fn) {
  //   for (const range of this._ranges) {
  //     fn({
  //       ...range,
  //       callStack: range.callStack.map(i => this._frames[i]),
  //     });
  //   }
  // }
}

// Looks like this.
/*
 1|0<html>                                                            0  1:0 -> 3:10    main.tpl:1:0    posts.tpl:1:0
 2|<head>
 3|  <title>1Posts2</title>                                           1  3:10 -> 3:15   posts.tpl:3:18
 4|  3                                                                2  3:15 -> 4:3    main.tpl:3:54   posts.tpl:1:0
 5|  <script src="/posts.js"></script>                                3  4:3 -> 6:1     posts.tpl:5:17
 6|4                                                                  4  6:1 -> 9:3     main.tpl:4:33   posts.tpl:1:0
 7|</head>
 8|<body>
 9|  5                                                                5  9:3 -> 10:20   posts.tpl:9:20
10|  <p>Last updated: 6Sun Sep 22 20197</p>                           6  10:20 -> 10:35 posts.tpl:10:20
11|                                                                   7  10:35 -> 13:3  posts.tpl:10:38
12|  <h1>Posts<h1>
13|  8<h2>9Clickbait title10</h2>                                     8  13:3 -> 13:7   _post.tpl:1:0   posts.tpl:14:5
14|<div>11filler filler ad ad filler filler filler ad12</div>         9  13:7 -> 13:22  _post.tpl:1:4   posts.tpl:14:5
15|13<h2>14Which character from Pride and Prejudice are you?15</h2>   10 13:22 -> 14:6  _post.tpl:1:20  posts.tpl:14:5
16|<div>16answer: none of them17</div>                                11 14:6 -> 14:49  _post.tpl:2:6   posts.tpl:14:5
17|18<h2>19A really really really really really really really really  12 14:49 -> 15:1  _post.tpl:2:22  posts.tpl:14:5
   really really really really really really really really re         13 15:1 -> 15:5   _post.tpl:1:0   posts.tpl:14:5
   ally really really really long title just to stress the wo         14 15:5 -> 15:54  _post.tpl:1:4   posts.tpl:14:5
   rd wrapping feature of the visualization20</h2>                    15 15:54 -> 16:6  _post.tpl:1:20  posts.tpl:14:5
18|<div>21lol22</div>                                                 16 16:6 -> 16:26  _post.tpl:2:6   posts.tpl:14:5
19|23                                                                 17 16:26 -> 17:1  _post.tpl:2:22  posts.tpl:14:5
20|</body>                                                            18 17:1 -> 17:5   _post.tpl:1:0   posts.tpl:14:5
21|</html>                                                            19 17:5 -> 17:219 _post.tpl:1:4   posts.tpl:14:5
22|24                                                                 20 17:219 -> 18:6 _post.tpl:1:20  posts.tpl:14:5
23|                                                                   21 18:6 -> 18:9   _post.tpl:2:6   posts.tpl:14:5
                                                                      22 18:9 -> 19:1   _post.tpl:2:22  posts.tpl:14:5
                                                                      23 19:1 -> 22:1   main.tpl:7:51   posts.tpl:1:0
                                                                      24 22:1 -> 23:1   posts.tpl:16:15
*/

/**
 * Warning: run away ...
 * @param {string} html
 * @param {HtmlMaps.HtmlMapJson} mapJson
 * @param {{mode: string}} options
 */
function visualize(html, mapJson, options) {
  const map = new HtmlSourceMap(mapJson);
  const terminalWidth = process.stdout.columns;
  if (!terminalWidth) throw new Error('bad terminal');
  const leftPanelWidth = Math.round(terminalWidth * 0.4);
  const colors = ['#FF6347', '#2E8B57', '#1E90FF'];
  const files = [...new Set(map.ranges.map(range => range.callStack[0].file))];

  function _renderHtml() {
    let index = 0;
    let htmlVisualization = '';
    // TODO: refactor.
    const LINE_MARKER = '_______linemarker_______';
    // (because of word wrapping)
    const rangeIndexToHtmlVisualizationLine = new Map();
    let lineCount = 0;
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
  
      htmlVisualization += bg.white.bold(`${i}`);
      const wrappedLines = partial.split('\n').map(line => {
        // @ts-ignore
        const escape = bg;
        return wordWrap(line, {cut: true, indent: '', newline: '\n   ', width: leftPanelWidth, escape});
      }).join(LINE_MARKER);
      htmlVisualization += wrappedLines;
  
      rangeIndexToHtmlVisualizationLine.set(rangeIndexToHtmlVisualizationLine.size, lineCount);
      lineCount += (wrappedLines.match(new RegExp('\n|' + LINE_MARKER, 'g')) || []).length;
    }
  
    // Add line numbers to HTML.
    htmlVisualization = htmlVisualization.split(LINE_MARKER).map((line, i, lines) => {
      const lineNo = i + 1;
      const paddingNeeded = String(`${lines.length + 1}`).length - String(lineNo).length;
      return ' '.repeat(paddingNeeded) + chalk.white(`${lineNo}`) + chalk.gray('|') + line;
    }).join('\n');

    return {
      htmlVisualization,
      rangeIndexToHtmlVisualizationLine,
    };
  }

  function _renderRanges() {
    const rangeVisualizationParts = map.ranges.map((range, i) => {
      return [
        // index
        chalk.bold.white(`${i}`),
        // 1:0 -> 3:10
        `${range.startLine + 1}:${range.startColumn} -> ${range.endLine + 1}:${range.endColumn}`,
        // callstack
        ...range.callStack.map((frame, i) => {
          const text = `${frame.file}:${frame.line + 1}:${frame.column}`;
          if (i === 0 && options.mode === 'source') {
            const colorIndex = files.indexOf(range.callStack[0].file);
            return chalk.black.bgHex(colors[colorIndex])(text);
          } else {
            return text;
          }
        }),
      ];
    });
  
    const maxLengthForColumn = rangeVisualizationParts.reduce((max, parts) => {
      return parts.map((part, i) => {
        return Math.max(max[i], stripAnsi(part).length);
      });
    }, rangeVisualizationParts.map(_ => 0));
  
    const rangeVisualizationLines = [];
    for (let i = 0; i < rangeVisualizationParts.length; i++) {
      const parts = rangeVisualizationParts[i];
  
      // Add gaps to best align ranges with the HTML.
      while (rangeIndexToHtmlVisualizationLine.get(i) > rangeVisualizationLines.length) {
        rangeVisualizationLines.push('');
      }
  
      rangeVisualizationLines.push(parts.map((part, i) => {
        return part + ' '.repeat(maxLengthForColumn[i] - stripAnsi(part).length);
      }).join(' '));
    }

    return rangeVisualizationLines;
  }

  const {htmlVisualization, rangeIndexToHtmlVisualizationLine} = _renderHtml();
  const rangeVisualizationLines = _renderRanges();

  const leftPanelLines = htmlVisualization.split('\n');
  const rightPanelLines = rangeVisualizationLines;

  // Combine the two panels.
  const longestLineLeftPanelLength = leftPanelLines.reduce((max, line) => {
    return Math.max(stripAnsi(line).length, max);
  }, 0);

  const lines = [];
  for (let i = 0; i < Math.max(leftPanelLines.length, rightPanelLines.length); i++) {
    let line = '';
    let paddingLength = longestLineLeftPanelLength + 1;

    if (i < leftPanelLines.length) {
      line += leftPanelLines[i];
      paddingLength -= stripAnsi(leftPanelLines[i]).length;
    }
    
    if (i < rightPanelLines.length) {
      line += ' '.repeat(paddingLength);
      line += rightPanelLines[i];
    }

    lines.push(line);
  }
  console.log(lines.join('\n'));
}

module.exports = {
  FrameMap,
  HtmlSourceMap,
  visualize,
};