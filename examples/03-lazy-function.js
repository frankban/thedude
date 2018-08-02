'use strict';

// A lazy function is a function that, when executed, does nothing but returning a task.

const dude = require('../thedude.js');

function add(a, b) {
    console.log('running add');
    return a + b;
};

const lazyAdd = dude.lazy(add);
const task = lazyAdd(42, 47);
task.run(console.log);
