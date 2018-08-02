'use strict';

// Run takes a callback receiving an error and a result.

const dude = require('../thedude.js');

function sum(a, b) {
    console.log(`${a} + ${b}`);
    return a + b;
};

const task = dude.task(sum, 1, 2);

task.run((err, result) => {
    console.log('err:', err);
    console.log('result:', result);
});
