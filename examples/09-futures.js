'use strict';

// Futures, a simple abstraction.

const dude = require('../thedude.js');

const f = dude.future();

f.addCallback(console.log);
f.addCallback(console.log);

f.set(42);

f.addCallback(console.log);
f.set(47);
