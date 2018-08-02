'use strict';

// Tasks can be canceled. Canceled tasks will not be run.

const dude = require('../thedude.js');

class Calc {
    sum(a, b) {
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

calc.sum(2, 3);
const t1 = calc.mul(3, 4);
const t2 = calc.mul(10, 100);

t1.cancel();
t2.cancel();

list.run();
