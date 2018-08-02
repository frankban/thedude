'use strict';

// It is possible to make lazy instances.

const dude = require('../thedude.js');

class Calc {
    add(a, b) {
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

calc.add(2, 3);
calc.mul(3, 4);
calc.mul(10, 100);

list.run();
