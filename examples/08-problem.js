'use strict';

// What if a task depends on another task in an asynchronous world?

const dude = require('../thedude.js');

function getRandomNumber(callback) {
    setTimeout(() => callback(4), 2000);
}

function add(a, b) {
    console.log('result:', a + b);
}

const list = dude.list();
getRandomNumber = list.lazy(getRandomNumber);
add = list.lazy(add);

// Goal: we want to get a rundom number and then add 10 to it.
getRandomNumber(num => {
    console.log('got random number', num);
});
// Problem: how to pass the random number as first argument?
add('???', 10);

list.run();
