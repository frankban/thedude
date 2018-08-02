'use strict';

// A deep introspection of async tasks.

const dude = require('../thedude.js');

const func = dude.lazy(value => console.log(value));
const f = dude.future();
const task = func(f);

task.info();
task.run();

f.set(42);
const task2 = func(f);
task2.info();
task2.run();
