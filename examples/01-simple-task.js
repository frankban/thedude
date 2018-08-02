'use strict';

// A task represents a single execution of a function with some arguments.

const dude = require('../thedude.js');

function sum(a, b) {
    console.log(`${a} + ${b}`);
    return a + b;
};

const task = dude.task(sum, 42, 47);

task.info();
task.run();
