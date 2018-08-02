'use strict';

// A task represents a single execution of a function with some arguments.

const dude = require('thedude');

function add(a, b) {
    console.log(`adding ${a} and ${b}`);
    return a + b;
};

const task = dude.task(add, 42, 47);

task.info();
task.run();
