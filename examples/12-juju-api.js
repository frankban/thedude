'use strict';

// ECS, maybe?

// Allow connecting endpoints using self-signed certs.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const jujulib = require('../../js-libjuju/api/client.js');
const WebSocket = require('websocket').w3cwebsocket;

const dude = require('../thedude.js');


const url = 'wss://10.139.230.171:17070/model/0cdf79b5-6a29-403c-83c8-60037d61dcd1/api';
const facades = [
  require('../../js-libjuju/api/facades/application-v5.js'),
  require('../../js-libjuju/api/facades/client-v1.js')
];
const options = {debug: true, facades: facades, wsclass: WebSocket};


const list = dude.list();
jujulib.connectAndLogin(url, {user: 'user-admin', password: 'secret'}, options, (err, conn) => {
    if (err) {
        console.log('cannot connect:', err);
        process.exit(1);
    }

    const application = list.lazy(conn.facades.application);
    const client = list.lazy(conn.facades.client);

    const fMachine1 = dude.future();
    const fMachine2 = dude.future();

    client.addMachine({series: 'xenial'}, (err, result) => {
        if (err) {
            console.log('cannot add machine:', err);
            process.exit(1);
        }
        fMachine1.set(result.machine);
    }).note({desc: 'add machine for mysql'});

    application.addCharmAndDeploy({
        charmUrl: 'cs:mysql-58',
        series: 'xenial',
        application: 'mysql',
        placement: [{directive: fMachine1, scope: '#'}]
    }, (err, result) => {
        if (err) {
            console.log('cannot deploy mysql:', err);
            process.exit(1);
        }
    }).note({desc: 'deploy mysql'});

    client.addMachine({series: 'trusty'}, (err, result) => {
        if (err) {
            console.log('cannot add machine:', err);
            process.exit(1);
        }
        fMachine2.set(result.machine);
    }).note({desc: 'add machine for wordpress'});

    application.addCharmAndDeploy({
        charmUrl: 'cs:trusty/wordpress-5',
        application: 'wordpress',
        placement: [{directive: fMachine2, scope: '#'}]
    }, (err, result) => {
        if (err) {
            console.log('cannot deploy wordpress:', err);
            process.exit(1);
        }
    }).note({desc: 'deploy wordpress'});

    // Show a summary
    list.asArray().forEach(task => console.log(task.info().notes.desc));
});

// Later...
list.run();
