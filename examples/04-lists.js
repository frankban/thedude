'use strict';

// A task list groups many tasks so that they can be run together.

const dude = require('../thedude.js');

function add(a, b) {
    console.log(`${a} + ${b}`);
    return a + b;
};
function mul(a, b) {
    console.log(`${a} * ${b}`);
    return a * b;
};

const list = dude.list();
add = list.lazy(add);
mul = list.lazy(mul);

add(2, 3);
mul(3, 4);
mul(10, 100);

list.run();
