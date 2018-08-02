'use strict';

// Run takes a callback receiving an error and a result.

const dude = require('../thedude.js');

function add(a, b) {
    console.log(`adding ${a} and ${b}`);
    return a + b;
};

const task = dude.task(add, 1, 2);

task.run((err, result) => {
    console.log('err:', err);
    console.log('result:', result);
});
