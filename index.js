var async = require('async');
var spawn = require('child_process').spawn;

function trySpawn(cmd, cb) {
  var child;
  try {
    child = spawn(cmd.spawnOptions[0], cmd.spawnOptions[1], cmd.spawnOptions[2]);
  }
  catch (e) {
    cb(e, null);
    return;
  }
  cb(null, child);
}
var empty = Object.create(null);
exports.createQueue = function (options) { 
  options = options || {};
  var concurrency = options.concurrency == null
                  ? 1
                  : Number(options.concurrency);
  if (isNaN(concurrency)) {
    concurrency = 1;
  }
  var interposers = options.interposers || empty;
  var spawner = options.spawner || trySpawn;
  var queue = async.queue(onCmd, concurrency);
  return createAPI(interposers, spawner, queue);
}
function createAPI(interposers, spawner, queue) {
  var API = {
    wrap:  function (wrap_interposers) {
      var new_interposers = Object.create(null);
      Object.keys(wrap_interposers).forEach(function (name) {
        if (!interposers[name]) {
          new_interposers[name] = wrap_interposers[name];
        }
        else {
          new_interposers[name] = function (val, next) {
            wrap_interposers[name](val, function (err, altered) {
              if (err) {
                next(err);
              }
              else {
                interposers[name](altered, next);
              }
            });
          }
        }
      });
      return createAPI(new_interposers, spawner, queue);
    },
    push: function (cmd, cb) {
      queue.push({
        spawner: spawner,
        interposers: interposers,
        cmd: cmd
      }, cb);
    }
  }
  return API;
}
function onCmd(task, callback) {
  var spawner = task.spawner;
  var interposers = task.interposers;
  var cmd = task.cmd;
  var exited = false;
  function next(err) {
    if (exited) {
      return;
    }
    exited = true;
    callback(err); 
  }
  function next_if_err_or_(fn) {
    return function (err, val) {
      if (err) next(err);
      else fn(val);
    }
  }
  function assessCmd() {
    if (!cmd.spawnOptions) {
       next(new Error('missing spawnOptions'));
    }
    else if (typeof interposers.parameters === 'function') {
      interposers.parameters(cmd, next_if_err_or_(spawnCmd));
    }
    else {
      spawnCmd(cmd);
    }
  }
  function spawnCmd(cmd) {
     spawner(cmd, next_if_err_or_(handleProc));
  }
  function handleProc(child) {
    if (!child) {
      next(new Error('spawn did not create a child'));
    }
    else {
      child.on('error', next);
      if (typeof interposers.child === 'function') {
        interposers.child(child, next_if_err_or_(waitOnProc));
      }
      else  {
        waitOnProc(child);
      }
    }
  }
  function waitOnProc(child) {
    if (!child) {
      next(new Error('specified interposer did not provide a child'));
    }
    if (child.killed || child.exitCode != null || child.signalCode != null) {
      cleanup();
    } 
    else {
      child.removeListener('error', next);
      child.on('exit', cleanup);
      child.on('error', cleanup);
    }

    function cleanup() {
      if (child.exitCode) {
        next(new Error(bin + ' exited with code: ' + child.exitCode));
      }
      else if (child.signalCode) {
        next(new Error(bin + ' exited with signal: ' + child.signalCode));
      }
      else {
        next(null);
      }
    }
  }
  assessCmd(cmd);
}
