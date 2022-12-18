import config from './config.mjs';

import Crypto from '@wnynya/crypto';
import Date from 'datwo';
import FormData from 'form-data';
import YAML from 'yaml';
import JSZip from 'jszip';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * functions
 */
async function parse(opkgpath) {
  const pkg = new JSZip();
  await pkg.loadAsync(fs.readFileSync(opkgpath));

  const npkgdir = path.resolve(__dirname, '../data');
  fs.mkdirSync(npkgdir, { recursive: true });
  const npkgpath = path.resolve(npkgdir, Crypto.uid());

  let pluginYamlString = await pkg.file('plugin.yml').async('string');
  let pluginYaml = YAML.parse(pluginYamlString);

  let version = pluginYaml.version;
  let apiVersion = pluginYaml['api-version'];

  let channel = 'default';
  for (const key in config.channels) {
    if (version.match(new RegExp(key))) {
      channel = key;
    }
  }

  version = format(config.channels[channel].version, {
    version: version,
    time: Date.now(),
  });

  pluginYaml.version = version;

  await pkg.file('plugin.yml', YAML.stringify(pluginYaml));

  const data = await new Promise((resolve, reject) => {
    pkg
      .generateNodeStream({ streamFiles: true })
      .pipe(fs.createWriteStream(npkgpath))
      .on('finish', () => {
        resolve({
          path: npkgpath,
          version: version,
          apiVersion: apiVersion,
          channel: config.channels[channel].name,
        });
      });
  });

  return data;
}

function format(string, data = {}) {
  string = string.replace(/\{name\}/g, config.name);
  string = string.replace(/\{version\}/g, data.version);
  const timestampmatches = string.match(/\{timestamp:(.+)\}/g);
  if (timestampmatches) {
    for (var tm of timestampmatches) {
      var m = tm.match(/\{timestamp:(.+)\}/);
      string = string.replace(m[0], new Date(data.time).format(m[1]));
    }
  }
  return string;
}

async function delayedTask(task, delay = 0) {
  return await new Promise((resolve, reject) =>
    setTimeout(() => {
      task.then(resolve).catch(reject);
    }, delay)
  );
}

/**
 * main
 */
async function main() {
  const parsed = await delayedTask(parse(config.target.path), config.target.delay);

  return new Promise((resolve, reject) => {
    console.log('Parsed Data:');
    console.log('  version   : ' + parsed.version);
    console.log('  apiVersion: ' + parsed.apiVersion);
    console.log('  channel   : ' + parsed.channel);

    const p = fs.createReadStream(parsed.path);

    const form = new FormData();

    form.append('version', parsed.version);
    form.append('package', p);

    form.submit(
      {
        protocol: 'https:',
        host: config.repo.host,
        path: config.repo.path + '/' + config.name + '/' + parsed.channel,
        headers: {
          o: config.repo.key,
        },
      },
      (error, res) => {
        if (error) {
          reject(error);
          return;
        }
        console.log('Upload Complete');
        fs.unlinkSync(parsed.path);
        fs.unlinkSync(config.target.path);
        console.log('File Removed');
        resolve();
      }
    );

    /*FilePostRequest(config.repo.host + '?o=' + config.repo.key, {
      name: config.name,
      version: parsed.version,
      apiVersion: parsed.apiVersion,
      channel: parsed.channel,
      package: p,
    })
      .then(() => {
        console.log('Upload Complete');
        fs.unlinkSync(parsed.path);
        fs.unlinkSync(config.target.path);
        console.log('File Removed');
        resolve();
      })
      .catch((error) => {
        reject(error);
      });*/
  });
}

var checkFile = true;
setInterval(() => {
  if (!checkFile) {
    return;
  }
  if (fs.existsSync(config.target.path)) {
    if (fs.statSync(config.target.path).size / 1024 > config.target.minkb) {
      checkFile = false;
      setTimeout(() => {
        console.log('Found Target: ' + config.target.path);
        main()
          .then(() => {
            console.log('Task Complete');
            checkFile = true;
          })
          .catch((error) => {
            console.warn(error);
            checkFile = true;
          });
      }, config.target.delay);
    }
  }
}, 1000);
