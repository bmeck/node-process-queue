# Process-Queue

A simple, but flexible process queue.

## Uses

* Limited process concurrency
* Interposing capabilities
  * such as supporting remote processes

## Usage

```javascript
// make our queue
var q = require('process-queue').createQueue({
  // how many processes should be allowed to run at a time
  concurrency: Number($) || 1,

  interposers: {
    // used to alter the parameters given to push($)
    parameters: function(cmd, cb(err, cmd)) || noop

    // used to alter the child process after spawning
    child: function(child, cb(err, child)) || noop
  },

  // used to alter the spawning of a child process
  // default behavior is child_process.spawn()
  // by this point all params to push may have been cached
  // changes to cmd will have no effect
  spawner: function(cmd, cb(err, child)) || noop

});

var cmd = {
  spawnOptions: ['cat', ['-n',], {}]
};

q.push(cmd, function (err) {
  // only has error if child fired an error event or exited with non-zero status
  console.log(err);
});

// wrapping only affects interposers
// this is to avoid hijacking spawning logic
logged_q = q.wrap({
  parameters: function (cmd, next) {
    console.error('QUEUED', cmd);
    next(null, cmd);
  },
  child: function (child, next) {
    console.error('CHILD CREATED WITH PID: %d', child.pid);
    next(null, child);
  }
})
```

**Interposers must give a value to callbacks even if the value is unchanged**

## Order of events for push($)

1. wrap(q).interposers.parameters
1. q.interposers.parameters
2. q.spawner
1. wrap(q).interposers.child
3. q.interposers.child
