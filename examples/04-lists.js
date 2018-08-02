'use strict';

// A task list groups many tasks so that they can be run together.

const dude = require('../thedude.js');

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

list.run();
