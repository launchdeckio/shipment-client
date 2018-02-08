import test from 'ava';
import Client from './';
import shipment from 'shipment/test/fixtures/testShipment';
import pTry from 'p-try';
import {noop} from 'lodash';

const closeP = server => new Promise((resolve, reject) => server.close(err => {
    if (err) reject(err);
    resolve();
}));

const withClient = (serverOptions = {}, clientOptions = {}) => fn => {
    const server = shipment().serve(serverOptions);
    return Client.create('localhost:6565', clientOptions).then(client => {
        return pTry(() => fn(client));
    }).then(() => closeP(server), e => {
        return closeP(server).then(() => {
            throw e;
        });
    });
};

test.serial('adds magic methods', t => {
    return withClient()(client => {
        t.true(typeof client.toUpper === 'function');
    });
});

test.serial('call basic action', t => {
    return withClient()(client => {
        const run = client.toUpper({message: 'hi!'});
        return new Promise((resolve, reject) => {
            run.on('emit', data => {
                if (data.result) resolve(data.result.data);
            });
        }).then(result => {
            t.is(result, 'HI!');
        });
    });
});