"use strict";

import "babel-polyfill";
import { listen } from "@ledgerhq/logs";
import Transport from "@ledgerhq/hw-transport-webusb";
import NebulasLedger from "@ledgerhq/hw-app-nas";

listen(e => {
    console.log(`${e.type}: ${e.message}`);
});

function NebLedgerUSB() {
    const ERROR_DESCRIPTION = {
        1: 'U2F: Unknown',
        2: 'U2F: Bad request',
        3: 'U2F: Configuration unsupported',
        4: 'U2F: Device Ineligible',
        5: 'U2F: Timeout',
        14: 'Timeout',
        0x9000: 'No errors',
        0x9001: 'Device is busy',
        0x6400: 'Execution Error',
        0x6700: 'Wrong Length',
        0x6804: 'Ledger device is locked',
        0x6982: 'Empty Buffer',
        0x6983: 'Output buffer too small',
        0x6984: 'Data is invalid',
        0x6985: 'Conditions not satisfied',
        0x6986: 'Transaction rejected',
        0x6A80: 'Data element is too long',
        0x6B00: 'Invalid P1/P2',
        0x6D00: 'Instruction not supported',
        0x6E00: 'Nebulas Ledger app does not seem to be open',
        0x6F00: 'Unknown error',
        0x6F01: 'Sign/verify error',
    };

    function errorCodeToString(err) {
        if (err.statusCode in ERROR_DESCRIPTION)
        {
            err.message = ERROR_DESCRIPTION[err.statusCode]; // get error message based off status code
        }
        return err;
    }

    this.createNebulasLedger = async (timeout) => {
        timeout = timeout !== undefined ? timeout : 30000;
        const transport = await Transport.create();
        //transport.setDebugMode(true);
        transport.setExchangeTimeout(timeout);
        return new NebulasLedger(transport);
    };

    this.getAppConfiguration = async (callback) => {
        try {
            const nebulasLedger = await this.createNebulasLedger();
            var response = await nebulasLedger.getAppConfiguration();
            callback(response);
        } catch (error) {
            callback(new Error(errorCodeToString(error)));
        }
    };

    this.getAddress = async (callback, path) => {
        try {
            const nebulasLedger = await this.createNebulasLedger();
            var response = await nebulasLedger.getAddress(path);
            callback(response);
        } catch (error) {
            callback(new Error(errorCodeToString(error)));
        }
    };

    this.signTransaction = async (callback, path, transaction) => {
        try {
            const nebulasLedger = await this.createNebulasLedger(90000);
            var response = await nebulasLedger.signTransaction(path, transaction);
            callback(response);
        } catch (error) {
            callback(new Error(errorCodeToString(error)));
        }
    };
};

module.exports = NebLedgerUSB;