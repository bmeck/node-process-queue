var offspring = require('../');

var q = offspring.createQueue({
  interposers: {
    parameters: function (cmd, next) {
      console.log('SPAWNING', cmd);
      next(null, cmd);
    }
  }
});

q.wrap({
  parameters: function (cmd, next) {
    console.error('QUEUED', cmd);
    next(null, cmd);
  },
  child: function (child, next) {
    console.error('CHILD CREATED WITH PID: %d', child.pid);
    next(null, child);
  }
}).push({
  spawnOptions: ['echo', ['JELLO HURLED'], {
    stdio: 'inherit'
  }],
}, function (err) {
  if (err) console.error('err', err);
});
