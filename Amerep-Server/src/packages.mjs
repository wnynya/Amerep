import config from './config.mjs';

import Crypto from '@wnynya/crypto';
import multer from 'multer';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function index(pid, channel) {
  const dataDir = path.resolve(__dirname, '../data/' + pid);
  if (!fs.existsSync(dataDir)) return [];
  const dataFile = path.resolve(dataDir, './' + channel + '.json');
  if (!fs.existsSync(dataFile)) return [];
  return JSON.parse(fs.readFileSync(dataFile));
}

async function get(pid, channel, version) {
  const dataDir = path.resolve(__dirname, '../data/' + pid);
  if (!fs.existsSync(dataDir)) throw 'default404';
  const dataFile = path.resolve(dataDir, './' + channel + '.json');
  if (!fs.existsSync(dataFile)) throw 'default404';
  const packages = JSON.parse(fs.readFileSync(dataFile));

  if (version == 'latest') {
    return packages[packages.length - 1];
  } else {
    for (const pkg of packages) {
      if (pkg.version == version) {
        return pkg;
      }
    }
  }
  throw 'default404';
}

async function get2(pid, version) {
  if (!config.packages[pid]?.channels) {
    throw 'default404';
  }
  for (const channel in config.packages[pid].channels) {
    const pkg = g(pid, channel, version);
    if (pkg) {
      pkg.channel = channel;
      return pkg;
    }
  }

  throw 'default404';

  function g(pid, channel, version) {
    const dataDir = path.resolve(__dirname, '../data/' + pid);
    if (!fs.existsSync(dataDir)) return null;
    const dataFile = path.resolve(dataDir, './' + channel + '.json');
    if (!fs.existsSync(dataFile)) return null;
    const packages = JSON.parse(fs.readFileSync(dataFile));

    if (version == 'latest') {
      return packages[packages.length - 1];
    } else {
      for (const pkg of packages) {
        if (pkg.version == version) {
          return pkg;
        }
      }
    }
    return null;
  }
}

async function post(req, res) {
  req.p.uid = Crypto.uid();

  await savePackage(req, res);

  const dataDir = path.resolve(__dirname, '../data/' + req.p.pid);
  fs.existsSync(dataDir) ? null : fs.mkdirSync(dataDir, { recursive: true });
  const dataFile = path.resolve(dataDir, './' + req.p.channel + '.json');
  fs.existsSync(dataFile) ? null : fs.writeFileSync(dataFile, '[]');
  const packages = JSON.parse(fs.readFileSync(dataFile));

  const data = {
    uid: req.p.uid,
    version: req.body.version,
    datetime: new Date().getTime(),
  };

  packages.push(data);

  packages.sort((a, b) => {
    if (a.datetime < b.datetime) {
      return -1;
    }
    if (a.datetime > b.datetime) {
      return 1;
    }
    return 0;
  });

  fs.writeFileSync(dataFile, JSON.stringify(packages));
}

async function savePackage(req, res) {
  const pid = req.p.pid;
  const channel = req.p.channel;
  const dir = path.resolve(__dirname, '../data/' + pid + '/packages/' + channel);
  const uid = req.p.uid;

  const save = multer({
    storage: multer.diskStorage({
      destination: (req, file, callback) => {
        fs.existsSync(dir) ? null : fs.mkdirSync(dir, { recursive: true });
        callback(null, dir);
      },
      filename: (req, file, callback) => {
        callback(null, uid);
      },
    }),
  }).single('package');

  return new Promise((resolve, reject) => {
    save(req, res, (error, data) => {
      error ? reject(error) : resolve();
    });
  });
}

async function file(pid, channel, version) {
  const pkg = await get(pid, channel, version);

  const dataDir = path.resolve(__dirname, '../data/' + pid + '/packages/' + channel);
  if (!fs.existsSync(dataDir)) throw 'default404';
  const dataFile = path.resolve(dataDir, './' + pkg.uid);
  if (!fs.existsSync(dataFile)) throw 'default404';

  return dataFile;
}

export default {
  index: index,
  get: get,
  post: post,
  file: file,
  get2: get2,
};
