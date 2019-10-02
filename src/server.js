const http = require('http');
const path = require('path');
const fs = require('fs');
const parseURL = require('url').parse;
const app = require('./app.js');

const rootDirPath = path.join(__dirname, '..');

async function requestHandler(request, response) {
  const requestUrl = parseURL(request.url);
  if (!requestUrl.pathname) throw new Error('missing pathname');

  const appResult = await app.maybeRender(requestUrl.pathname);
  if (appResult) {
    sendResponse(200, appResult.text);
    return;
  }

  const absoluteFilePath = path.join(rootDirPath, requestUrl.pathname);
  const filePathDir = path.parse(absoluteFilePath).dir;
  // Disallow file requests outside of root folder
  if (!filePathDir.startsWith(rootDirPath)) {
    return readFileCallback(new Error('Disallowed path'));
  }

  // Check if the file exists, then read it and serve it.
  fs.exists(absoluteFilePath, fsExistsCallback);

  function fsExistsCallback(fileExists) {
    if (!fileExists) {
      return sendResponse(404, `404 - File not found. ${request.pathname}`);
    }
    fs.readFile(absoluteFilePath, 'binary', readFileCallback);
  }

  function readFileCallback(err, file) {
    if (err) {
      console.error(`Unable to read local file ${absoluteFilePath}:`, err);
      return sendResponse(500, '500 - Internal Server Error');
    }
    sendResponse(200, file);
  }

  function sendResponse(statusCode, data) {
    const headers = {'Access-Control-Allow-Origin': '*'};
    response.writeHead(statusCode, headers);
    finishResponse(data, 'UTF-8');
  }

  function finishResponse(data, encoding) {
    response.write(data, encoding);
    response.end();
  }
}

const server = http.createServer(requestHandler);
const port = 10205;
server.listen(port, 'localhost');
console.log(`online:  listening on http://localhost:${port}`);
