'use strict';

// Async tasks can synchronize using futures.

const dude = require('../thedude.js');

function getRandomNumber(callback) {
    setTimeout(() => callback(4), 2000);
}

function sum(a, b) {
    console.log('result:', a + b);
}

const list = dude.list();
getRandomNumber = list.lazy(getRandomNumber);
sum = list.lazy(sum);

// Goal: we want to get a rundom number and then sum 10 to it.
const fNum = dude.future();
getRandomNumber(num => {
    console.log('got random number', num);
    fNum.set(num);
});
sum(fNum, 10);

list.run();
