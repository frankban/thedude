'use strict';

// A lazy function is a function that, when executed, does nothing but returning a task.

const dude = require('../thedude.js');

function sum(a, b) {
    console.log('running sum');
    return a + b;
};

const lazySum = dude.lazy(sum);
const task = lazySum(42, 47);
task.run(console.log);
