import test from 'ava';
import Client from './';
import actions from 'shipment/test/fixtures/actions';
import {http} from 'shipment';
import pTry from 'p-try';
import {noop} from 'lodash';

const closeP = server => new Promise((resolve, reject) => server.close(err => {
    if (err) reject(err);
    resolve();
}));

const withClient = (serverOptions = {}, clientOptions = {}) => fn => {
    // const server = shipment().serve(serverOptions);
    const server = http(actions).listen();
    return Client.create('http://localhost:6565', clientOptions).then(client => {
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
        return new Promise((resolve, reject) => {
            client.toUpper({message: 'hi!'}, evt => {
                if (evt.result) resolve(evt.result.data);
            });
        }).then(result => {
            t.is(result, 'HI!');
        });
    });
});