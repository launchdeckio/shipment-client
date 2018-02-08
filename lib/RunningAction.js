'use strict';

const EventEmitter = require('events').EventEmitter;
const {noop}       = require('lodash');
const split2       = require('split2');

const RemoteError = require('./RemoteError');

/**
 * Structure that represents a running shipment action
 * and emits events for every incoming line
 */
class RunningAction extends EventEmitter {

    /**
     * @param {ShipmentClient} client
     * @param {String} action
     * @param {Object} args
     * @param {Readable} stream
     * @param {Function} [receive = noop]
     * @param {Function} [receiveLog = noop]
     */
    constructor({
        client,
        action,
        args,
        stream,
        receive = noop,
        receiveLog = noop,
    }) {

        super();

        this.client = client;
        this.action = action;
        this.args   = args;

        this.stream     = stream;
        this.receive    = receive;
        this.receiveLog = receiveLog;

        this.stream
            .pipe(split2())
            .on('data', line => {
                this.receiveLine(line);
            })
            .on('end', () => {
                this.emit('end');
            });
    }

    /**
     * Parse incoming line
     *
     * @param {String} line
     */
    receiveLine(line) {

        // If the line starts with "SHIPMENT", we're dealing with a
        // "meta" server/action lifecycle event that we don't want to
        // necessarily forward to any of the listeners.
        if (line.startsWith('SHIPMENT')) return this.parseLifecycleEvent(line);

        let obj;
        try {

            obj = JSON.parse(line);

            // object doesn't contain "context" property, probably not a shipment JSON line
            // so emit as normal "log" line anyways
            if (!obj.context) return this.receiveLog(line);

        } catch (e) {

            // Couldn't parse the line as JSON, emit as "log"
            return this.receiveLog(line);
        }

        // Object is most likely an authentic event,
        // broadcast it to the receiver
        return this.receive(obj);
    }

    /**
     * Parse a shipment (internal) "lifecycle event", verifying the key to check the integrity of the info
     * And emit appropriate event
     * e.g. SHIPMENT-12345: ok
     *
     * @param {String} line
     */
    parseLifecycleEvent(line) {

        let matches;

        let prefix = `SHIPMENT: `;

        let match = (verb, line) => new RegExp(`${prefix}${verb}: (.*)`).exec(line);

        if (line === `${prefix}ok`)
            return this.emit('success');

        if ((matches = match('start', line)))
            return this.emit('start', matches[1]);

        if ((matches = match('error', line)))
            return this.emit('error', new RemoteError(matches[1]));
    }
}

module.exports = RunningAction;