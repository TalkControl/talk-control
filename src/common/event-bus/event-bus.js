'use strict';

const NO_KEY_PROVIDED = 'No key provided';
const DUPLICATE_ENTRY = 'Duplicate Entry';
const NO_CHANNEL_PROVIDED = 'No Channel provided';

/**
 * @classdesc Event bus implementation
 * @class EventBus
 */
export class EventBus {
    constructor() {
        this.callBacks = {};
    }

    /**
     * Register a callback on a key
     *
     * @param {string} key - Event key to which attach the callback
     * @param {*} callback - Function to call when key event is fired
     * @throws Will throw an error if key is not specified
     */
    onMultiple(key, callback) {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }
        let arrayCallback = this.callBacks[key];
        if (!arrayCallback) {
            arrayCallback = [];
            this.callBacks[key] = arrayCallback;
        }
        arrayCallback.push(callback);
    }

    /**
     * Register a callback on a key only once times (just 1 listener for 1 type of event)
     *
     * @param {string} key - Event key to which attach the callback
     * @param {*} callback - Function to call when key event is fired
     * @throws Will throw an error if key is not specified
     */
    on(key, callback) {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }

        if (this.callBacks[key]) {
            throw new Error(DUPLICATE_ENTRY);
        }

        this.callBacks[key] = [callback];
    }

    /**
     * Broadcast data for each callback registered on given event key
     *
     * @param {string} key - Event key to fire
     * @param {any} data - Data to broadcast
     * @throws Will throw an error if key is not specified
     */
    broadcast(key, data) {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }
        const callbacks = this.callBacks[key];

        if (!callbacks) return;

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(e);
            }
        });
    }

    /**
     * Emit data for the dedicated channel passed in parameter on given event key
     * @param {string} key
     * @param {any} data
     * @param {any} channel
     */
    emit(key, data, channel) {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }
        if (!channel) {
            throw new Error(NO_CHANNEL_PROVIDED);
        }

        // Do nothing on super class
    }

    /**
     * Return all callbacks registered on the given event key
     *
     * @param {string} key - Event key from which extract callbacks
     * @returns {any[]} - The array of callbacks attached on the event key
     * @throws Will throw an error if key is not specified
     */
    getCallbacks(key) {
        if (!key) {
            throw new Error(NO_KEY_PROVIDED);
        }
        const arrayCallback = this.callBacks[key];
        if (!arrayCallback) {
            return [];
        }
        return arrayCallback;
    }
}
