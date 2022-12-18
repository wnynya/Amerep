import config from './config.mjs';

import express from 'express';
const app = express();

/* post request */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* express addons */
import addon from '@wnynya/express-addon';
app.use(addon.requestParser());
app.use(addon.responseFunctions());

/* permissions */
app.use((req, res, next) => {
  const key =
    req?.headers?.authorization || req?.headers?.Authorization || req?.headers?.o || req?.body?.o || req?.query?.o;

  req.permissions = [];

  if (key && config.keys.hasOwnProperty(key)) {
    req.permissions = config.keys[key].permissions;
  }

  req.hasPermission = (node) => {
    function check(source, target) {
      const sourceArray = source.split('.');
      const targetArray = target.split('.');
      const loop = Math.max(sourceArray.length, targetArray.length);
      let bool = false;
      let lastSource;
      for (let n = 0; n < loop; n++) {
        if (!(sourceArray[n] == null || sourceArray[n] == undefined)) {
          lastSource = sourceArray[n];
        }
        bool =
          lastSource == targetArray[n] ||
          (lastSource == '*' && !(targetArray[n] == null || targetArray[n] == undefined));
        if (!bool) {
          break;
        }
      }
      return bool;
    }

    function checkArray(array, permission) {
      var bool = false;
      for (const perm of array) {
        if (perm.startsWith('-')) {
          if (check(perm.substring(1), permission)) {
            return false;
          }
        } else {
          bool = check(perm, permission);
        }
        if (bool) {
          return true;
        }
      }
      return false;
    }

    function has(permissions, permission) {
      if (Array.isArray(permissions)) {
        return checkArray(permissions, permission);
      } else if (permissions?.client?.permissions) {
        return checkArray(permissions?.client?.permissions, permission);
      } else {
        return false;
      }
    }

    return has(req.permissions, node);
  };

  next();
});

/* set headers */
app.use(addon.responseHeaders(config.headers));

/* set root router */
import router from './router.mjs';
app.use('/', router);

/* set 404 */
app.options('*', (req, res) => {
  res.sendStatus(200);
});
app.all('*', (req, res) => {
  res.error('default404');
});

export { app, app as express };
