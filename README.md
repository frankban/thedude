[![Build Status](https://travis-ci.org/frankban/dude.svg?branch=master)](https://travis-ci.org/frankban/thedude)

# thedude

Call functions in the future and synchronize their execution.

## Getting started

thedude, in its simpler form, allows for defining tasks to be executed later:
```javascript
const dude = require('thedude');

function sum(a, b) {
    console.log(`${a} + ${b}`);
    return a + b;
};
const task = dude.task(sum, 42, 47);
```
The code above creates a task that will sum, when executed, 42 and 47.
Initially, the task is not running:
```javascript
> task.info();
{ id: 0, status: 'procrastinating', notes: {} }
```
To actually run the task, call its *run* method, which also accepts a callback
called with the result.
```javascript
> task.run((err, result) => {
    console.log('err:', err);
    console.log('result:', result);
});
42 + 47
err: null
result: 89
```
The status reflects that the task has been run:
```javascript
> task.info();
{ id: 0, status: 'done', notes: {} }
```
Tasks can be in the following statuses:
*dude.PROCRASTINATING* -> *dude.RUNNING* -> *dude.DONE* or *dude.CANCELED*.

### Lazy functions

Another way for creating tasks is through lazy functions. A regular function
can be easily turned into a lazy one by using the *dude.lazy()* decorator:
```javascript
const lazySum = dude.lazy(sum);
```
When calling *lazySum* the original decorated *sum* is not actually executed.
Instead, a task is returned that can be executed later, as already seen:
```javascript
const task = lazySum(2, 5);
> task.run(console.log);
running sum
null 7
```
So, for now, we can define lazy functions as functions returning a task. The
definition will be slightly extended later, when describing asynchronous tasks.

### Task lists

When running multiple tasks together it is common to group them in a list:
```javascript
function sum(a, b) {
    console.log(`${a} + ${b}`);
    return a + b;
};
function mul(a, b) {
    console.log(`${a} * ${b}`);
    return a * b;
};

const list = dude.list();
sum = list.lazy(sum);
mul = list.lazy(mul);

sum(2, 3);
mul(3, 4);
mul(10, 100);
```
In the example above, a list is created (with *dude.list()*) and then used to
turn a couple of functions into lazy functions, with *list.lazy()*, which is
equivalent to *dude.lazy*, except that it automatically add all tasks resulting
by calling the decorated function to the list. Finally three tasks are created.
It is now possible to run all tasks together by calling *list.run()*:
```javascript
> list.run();
2 + 3
3 * 4
10 * 100
```
Two callbacks can be provided to *list.run()*, the first called every time a
task completes, the second called when all tasks are done.
```javascript
> list.run((err, result, task) => {
    console.log('err:', err);
    console.log('result:', result);
    console.log('info:', task.info());
});
2 + 3
err: null
result: 5
info: { id: 0, status: 'done', notes: {} }
3 * 4
err: null
result: 12
info: { id: 1, status: 'done', notes: {} }
10 * 100
err: null
result: 1000
info: { id: 2, status: 'done', notes: {} }
undefined
```
See the API reference below for a description of the arguments passed to
callbacks.

### Lazy objects

The *lazy* decorator is also able to decorate objects. The resulting object's
methods are lazy, for instance:
```javascript
class Calc {
    sum(a, b) {
        console.log(`${a} + ${b}`);
        return a + b;
    }
    mul(a, b) {
        console.log(`${a} * ${b}`);
        return a * b;
    }
}
let calc = new Calc();

const list = dude.list();
calc = list.lazy(calc);

calc.sum(2, 3);
calc.mul(3, 4);
calc.mul(10, 100);
```
The three calls at the end of this example do not actually execute the
corresponding operations but register the tasks on the list, as seen before.
To sum it up: lazy objects are objects whose methods are lazy.

### Annotating tasks

When working on many tasks, the task identifier included in *task.info()* could
not be enough to identify the underlying operation that will be done when the
task is run. Tasks can be annotated to add metadata info with the *note*
method, for instance:
```javascript
calc.sum(2, 3).note({name: 'sum', args: [2, 3]});
calc.mul(3, 4).note({name: 'mul', args: [3, 4]});
calc.mul(10, 100).note({name: 'sum', args: [10, 100]});
> list.asArray().map(task => task.info().notes);
[ { name: 'sum', args: [ 2, 3 ] },
  { name: 'mul', args: [ 3, 4 ] },
  { name: 'sum', args: [ 10, 100 ] } ]
```
What to store in notes is up to the caller. For instance, notes could be used
to automatically generate a summary of what is going to happen when a task list
is run.

### Canceling tasks

Tasks can be canceled with the *cancel* method, which returns whether the
operation succeeded. A task is successfully canceled when its status is
*dude.PROCRASTINATING*. From the example above:
```javascript
calc.sum(2, 3);
const t1 = calc.mul(3, 4);
const t2 = calc.mul(10, 100);
> t1.cancel();
true
> t2.cancel();
true
>
> list.run();
2 + 3
```
Only the sum task is actually run.

## Synchronizing tasks

thedude supports running and synchronizing asynchronous functions, so that
multiple tasks can be created to be run later even when one task depends on the
execution of another. Futures are used for declaring that a task cannot be run
instantly because it requires a value that is not yet known, but possibly will
in the future.

### Futures

A future is similar to a promise, but it is much simpler, specific to thedude,
and more oriented to future values rather than future callback execution
(theners). The concept behind futures is very simple, the can be instantiated,
callback can be attached to be executed when a future is set a value, and a
single value can be set once, as in the example below:
```javascript
const f = dude.future();
f.addCallback(value => console.log('first callback:', value));
f.addCallback(value => console.log('second callback:', value));
> f.set(42);
first callback: 42
second callback: 42
```
After *future.set()* is called, the future is done. When attaching callbacks to
futures already done, those callbacks are immediately executed:
```javascript
> f.addCallback(console.log);
42
```
When a future is done, setting a value again raises an exception.

### Async tasks

Lazy functions accept futures as part of their arguments to signify that they
require values that will be only available later, asynchronously. Assume the
following example:
```javascript
function getRandomNumber(callback) {
    setTimeout(() => callback(4), 2000);
}

function sum(a, b) {
    console.log('result:', a + b);
}

const list = dude.list();
getRandomNumber = list.lazy(getRandomNumber);
sum = list.lazy(sum);

// Goal: we want to get a random number and then sum 10 to it.
getRandomNumber(num => {
    console.log('got random number', num);
});
// Problem: how to pass the random number as first argument?
sum('???', 10);
```
In a normal code execution, sum would be called in the callback passed to
getRandomNumber, and that would not be an issue. If using thedude is instead
required, because for instance the use case requires getRandomNumber to be
registered as a task before sum, then there is a problem of creating a task
depending on a value that is not currently known. Futures can be used as
placeholders for these values. The example above becomes:
```javascript
function getRandomNumber(callback) {
    setTimeout(() => callback(4), 2000);
}

function sum(a, b) {
    console.log('result:', a + b);
}

const list = dude.list();
getRandomNumber = list.lazy(getRandomNumber);
sum = list.lazy(sum);

const fNum = dude.future(); // Create a future.
getRandomNumber(num => {
    console.log('got random number', num);
    fNum.set(num); // Assign a value to the future.
});
sum(fNum, 10);
```
Futures can also be nested in lazy function arguments. In any case, when the
future is set, its position in the arguments passed to the lazy function will
be assigned the result of the future. When all futures are done the task is
finally executed; until that, the task is procrastinating and can be canceled,
even after *task.run()* has been called.

It is now time to extend a little bit the definition of lazy functions: they
are functions returning a task and accepting futures as placeholders for values
that will be available only later.

## API reference

#### createTask(func, ...args) ⇒ `Object`

Create a task representing a call of the given function and arguments.

- *@param {Function} func* The function executed when running the task.
- *@param {Array} args* The arguments to use when executing the function. An
  argument can have any type as usual. If an argument is provided as a
  future, the the task will wait for the future to be done before executing
  the function. If the last argument is a function, it is a assumed to be a
  callback, and therefore the function is assumed to be asynchronous.
- *@returns {Object}* An API object to interact with the task, with the
  following methods:
  - *run(callback)*: run the task and, if provided, call the callback when
    the execution completes. When the task function last argument is a
    callback, then the callback provided to "run" is called right after the
    asynchronous function executes its own callback;
  - *note(notes)*: add annotations to the task, for instance to make it
    easier to identify specific tasks or to provide metadata. The given
    notes is an object with key/value pairs representing notes.
  - *info()*: return information about the task as an object with the
    following fields:
    - *id*: the task identifier;
    - *notes*: the notes added using note() (see above);
    - *status*: a string representing the task status, between:
      - *dude.PROCRASTINATING*: the task function has not been started yet.
        Note that a task could be procrastinating even if run has been
        called, for instance, because it's waiting for all required futures
        to be done;
      - *dude.RUNNING*: the task is currently running;
      - *dude.CANCELED*: the task has been canceled using cancel, and will
        not be able to be run anymore;
      - *dude.DONE*: the task completed, and cannot be run again.
  - *cancel()*: try to cancel the execution of the task, and return whether
    the process succeeded. Note that canceling a task only succeeds when
    the task is still procrastinating.

#### lazy(funcOrInstance) ⇒ `Function or Object`

Return a lazy function or instance from the given function or instance.

Lazy functions return a task and accept futures as placeholders for values
that will be available only later.

- *@param {Function or Object} funcOrInstance* The original function or instance
  to decorate so that it becomes lazy. Being lazy means that the function
  itself (or all object methods, when an instance is provided) returns a task
  rather than actually execute its body.
- *@returns {Function}* The lazy function or instance.

#### list(options) ⇒ `Object`

Create a task list, which groups tasks to be executed together.

- *@param {Object} options* Not used yet.
- *@returns {Object}* A task list with the following methods:
  - *add(task)*: add a task to this list;
  - *lazy(funcOrInstance)*: equivalent to global lazy. When the returned
    function is executed, the corresponding task is automatically added to the
    task list;
  - *asArray()*: return all tasks in the list;
  - *clear()*: remove all tasks from the list;
  - *run(changesCallback, doneCallback)*: run all tasks in this list. The given
    optional *changesCallback* is called every time a task in the list completes
    its execution. It receives an error (or null), the task result (if any) and
    the task itself. The *doneCallback* is called when all current tasks
    complete. It receives a list of objects, one object for every task run, with
    the "task", "result" and "err" keys.

#### future() ⇒ `Object`

Create and return a future, which represents a value that will be available in
the future.

- *@returns {Object}* A future with the *done* attribute (reporting whether the)
  future is done, and the following methods:
  - *set(value)*: set the result for this future. From this point on, the future
    is "done" and the done property returns true. An error is raised if a value
    is set on a future that is already done;
  - *addCallback(callback)*: register a callback to be called when the future is
    done, with its result. If the future is already done, the callback is called
    immediately with the value. Callbacks are executed in the order they are
    added.
