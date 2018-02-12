'use strict';

const EventEmitter = require('events').EventEmitter;
const {noop}       = require('lodash');
const split2       = require('split2');

/**
 * Structure that represents a running shipment action
 * and emits events for every incoming line
 */
class Tracker extends EventEmitter {

    /**
     * @param {Readable} stream
     * @param {Boolean} [captureResult = true]
     * @param {Function} [receive = noop]
     * @param {Function} [receiveLog = noop]
     */
    constructor({

        stream,
        captureResult = true,
        receive = noop,
        receiveLog = noop,

    }) {

        super();

        this.receive       = receive;
        this.receiveLog    = receiveLog;
        this.captureResult = captureResult;
        this.result        = undefined;

        this.pipeStream(stream);
    }

    pipeStream(stream) {
        stream
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

            // object doesn't contain "c" (context) property, probably not a shipment JSON line
            // so emit as normal "log" line anyways
            if (!obj.c) return this.receiveLog(line);

        } catch (e) {

            // Couldn't parse the line as JSON, emit as "log"
            return this.receiveLog(line);
        }

        // If the RunningAction instance is configured to capture the
        // result, save the payload of "result" events that occur on the
        // top-level context (0)
        if (this.captureResult && obj.c === '0' && obj.result) {
            this.result = obj.result.data;
        }

        // Broadcast the object to the receiver
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

        let matches, prefix = 'SHIPMENT: ';

        let match = (verb, line) => new RegExp(`${prefix}${verb}: (.*)`).exec(line);

        if ((matches = match('error', line))) this.emit('error', JSON.parse(matches[1]));
    }
}

module.exports = Tracker;