'use strict';

// Annotations allow for identifying tasks more easily.

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

calc.add(2, 3).note({name: 'add', args: [2, 3]});
calc.mul(3, 4).note({name: 'mul', args: [3, 4]});
calc.mul(10, 100).note({name: 'add', args: [10, 100]});
list.asArray();

list.run();
