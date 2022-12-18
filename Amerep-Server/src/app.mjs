import config from './config.mjs';
global.config = config;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { express } from './express.mjs';

import http from 'http';
import childProcess from 'child_process';

childProcess.exec('kill -9 $(lsof -t -i:' + config.port.http + ')', () => {
  console.log('Server start [' + config.host + ':' + config.port.http + ']');
  http.createServer(express).listen(config.port.http);
});
