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

TODO
