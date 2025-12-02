const path = require('node:path');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');

if (!global.__IGNORE_EACCES_PATCHED__) {
  global.__IGNORE_EACCES_PATCHED__ = true;
  if (process.env.DEBUG_IGNORE_EACCES === '1') {
    console.error(`[ignore-eacces] patch active in pid ${process.pid}`);
  }
}

const WINDOWS_APPS_SEGMENT = `${path.sep}microsoft${path.sep}windowsapps${path.sep}`;

const BYPASS_PATTERNS = [
  '/microsoft/windowsapps/',
  '/jetbrains/',
  '/autodesk/adlm/',
];

const IGNORED_ERROR_CODES = new Set(['EACCES', 'EPERM']);

function shouldBypass(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    return false;
  }
  const normalized = targetPath.toLowerCase().replace(/\\/g, '/');
  return BYPASS_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function shouldIgnoreError(error, targetPath) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return IGNORED_ERROR_CODES.has(error.code) && shouldBypass(targetPath);
}

function patchAsyncMethod(target, methodName, fallbackValue) {
  if (!target) {
    return;
  }
  const original = target[methodName];
  if (typeof original !== 'function') {
    return;
  }
  target[methodName] = async function wrappedFsMethod(targetPath, ...rest) {
    try {
      return await original.call(this, targetPath, ...rest);
    } catch (error) {
      if (shouldIgnoreError(error, targetPath)) {
        return fallbackValue;
      }
      throw error;
    }
  };
}

function wrapAsyncMethod(methodName, fallbackValue) {
  patchAsyncMethod(fsPromises, methodName, fallbackValue);
  if (fs.promises && fs.promises !== fsPromises) {
    patchAsyncMethod(fs.promises, methodName, fallbackValue);
  }
}

wrapAsyncMethod('readFile', '');
wrapAsyncMethod('readlink', null);
wrapAsyncMethod('stat', null);
wrapAsyncMethod('readdir', []);
wrapAsyncMethod('opendir', {
  [Symbol.asyncIterator]() {
    return {
      async next() {
        return { done: true, value: undefined };
      },
      async return() {
        return { done: true, value: undefined };
      },
    };
  },
  async close() {},
});

function wrapSyncMethod(methodName, fallbackValue) {
  const original = fs[methodName];
  if (typeof original !== 'function') {
    return;
  }
  fs[methodName] = function wrappedSync(targetPath, ...rest) {
    try {
      return original.call(this, targetPath, ...rest);
    } catch (error) {
      if (shouldIgnoreError(error, targetPath)) {
        return fallbackValue;
      }
      throw error;
    }
  };
}

function wrapCallbackMethod(methodName, fallbackValue) {
  const original = fs[methodName];
  if (typeof original !== 'function') {
    return;
  }
  fs[methodName] = function wrappedCallback(targetPath, ...rest) {
    const maybeCallback = rest[rest.length - 1];
    if (typeof maybeCallback !== 'function') {
      return original.call(this, targetPath, ...rest);
    }
    const callback = rest.pop();
    const wrappedCallback = (error, result) => {
      if (shouldIgnoreError(error, targetPath)) {
        return callback(null, fallbackValue);
      }
      return callback(error, result);
    };
    return original.call(this, targetPath, ...rest, wrappedCallback);
  };
}

wrapSyncMethod('readdirSync', []);
wrapSyncMethod('statSync', null);
wrapSyncMethod('lstatSync', null);
wrapSyncMethod('readlinkSync', null);
wrapSyncMethod('opendirSync', {
  [Symbol.iterator]() {
    return {
      next() {
        return { done: true, value: undefined };
      },
      return() {
        return { done: true, value: undefined };
      },
    };
  },
  close() {},
});
wrapCallbackMethod('readdir', []);
wrapCallbackMethod('stat', null);
wrapCallbackMethod('lstat', null);
wrapCallbackMethod('readlink', null);
wrapCallbackMethod('opendir', {
  [Symbol.asyncIterator]() {
    return {
      async next() {
        return { done: true, value: undefined };
      },
      async return() {
        return { done: true, value: undefined };
      },
    };
  },
  async close() {},
});
