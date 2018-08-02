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

## Lazy functions

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

## Task lists

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

## Lazy objects

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

## Annotating tasks

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

# Canceling tasks

Tasks can be canceled with the *cancel* method, which returns whether the
operation succeeded. A task is successfully canceled when its status is
*dude.PROCRASTINATING*:
```javascript

```
