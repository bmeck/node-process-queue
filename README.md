# Offspring

A simple, but flexible process queue.

## Uses

* Limited process concurrency
* Interposing capabilities
  * such as supporting remote processes

## Usage

```javascript
// make our queue
var q = require('offspring').createQueue({
  // how many processes should be allowed to run at a time
  concurrency: Number($) || 1,

  // used to alter the parameters given to push($)
  commandInterposer: function(cmd, cb(err, cmd)) || noop

  // used to alter the spawning of a child process
  // default behavior is child_process.spawn()
  // by this point all params to push may have been cached
  // changes to cmd will have no effect
  spawnInterposer: function(cmd, cb(err, child)) || noop

  // used to alter the child process after spawning
  childInterposer: function(child, cb(err, child)) || noop
});

var cmd = {
  spawnOptions: ['cat', ['-n',], {}],

  // this exists mostly for logging functionality and stdin usage
  // use commandInterposer to strip this as required
  childInterposer: function (child, cb(err, child)) {
    child.stdin.write('HELLO');
    child.stderr.pipe(logger);
  }
};

q.push(cmd, function (err) {
  // only has error if child fired an error event or exited with non-zero status
  console.log(err);
});
```

**Interposers must give a value to callbacks even if the value is unchanged**

## Order of events for push($)

1. q.commandInterposer
2. q.spawnInterposer
3. q.childInterposer
4. cmd.childInterposer
