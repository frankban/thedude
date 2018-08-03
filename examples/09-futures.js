'use strict';

// Futures, a simple abstraction.

const dude = require('../thedude.js');

const f = dude.future();

f.addCallback(value => console.log('first callback:', value));
f.addCallback(value => console.log('second callback:', value));

f.set(42);

f.addCallback(console.log);

f.set(47);
