import test from 'ava';
import Client from './';
import actions from 'shipment/test/fixtures/actions';
import {http} from 'shipment';
import {noop} from 'lodash';

const closeP = server => new Promise((resolve, reject) => server.close(err => {
    if (err) reject(err);
    resolve();
}));

const withClient = (serverOptions = {}, clientOptions = {}) => async fn => {
    const server = http(actions).listen();
    const client = await Client.create('http://localhost:6565', clientOptions);
    try {
        await fn(client);
    } finally {
        await closeP(server);
    }
};

test.serial('adds magic methods', t => {
    return withClient()(client => {
        t.true(typeof client.toUpper === 'function');
    });
});

test.serial('call basic action (receiver)', t => {
    return withClient()(async client => {
        const result = await new Promise((resolve, reject) => {
            client.toUpper({message: 'hi!'}, evt => {
                if (evt.result) resolve(evt.result.data);
            });
        });
        t.is(result, 'HI!')
    });
});

test.serial('call basic action (return value)', t => {
    return withClient()(async client => {
        const result = await client.toUpper({message: 'hi!'});
        t.is(result, 'HI!')
    });
});

test.serial('throws error', async t => {
    try {
        await withClient()(async client => {
            await client.error();
        });
        t.fail();
    } catch (e) {
        t.is(e.message, 'something went wrong!');
    }
});