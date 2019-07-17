import { splitPath, foreach, hexToBase64 } from "./util";
import type Transport from "@ledgerhq/hw-transport";

import Nebulas from "nebulas";
var Account = Nebulas.Account;
var Transaction = Nebulas.Transaction;

export default class NebulasLedger {
  transport: Transport<*>;

  constructor(transport: Transport<*>) {
    this.transport = transport;
    transport.decorateAppAPIMethods(
      this,
      [
        "getAppConfiguration",
        "getAddress",
        "signTransaction"
      ],
      "Nebulas"
    );
  }

  pathToBuffer(path) {
    let paths = splitPath(path);
    let buffer = new Buffer(1 + 4 * paths.length);
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    return buffer;
  }

  getAppConfiguration(): Promise<{
    majorVersion: number,
    minorVersion: number,
    patchVersion: number
  }> {
    return this.transport.send(0x6e, 0x00, 0x00, 0x00).then(response => {
      let result = {};
      result.majorVersion = response[1];
      result.minorVersion = response[2];
      result.patchVersion = response[3];
      return result;
    });
  }

  getAddress(
    path: string
  ): Promise<{
    publicKey: string,
    compressedPublicKey: string,
    address: string
  }> {
    return this.transport.send(0x6e, 0x01, 0x00, 0x00, this.pathToBuffer(path)).then(response => {
      let y = response.slice(33, 65);
      let z = new Buffer.from([2 + (y[y.length - 1] & 1)]);

      let account = Account.fromPubKey(Buffer.concat([z, response.slice(1, 33)]));
      let result = {};
      result.publicKey = response;
      result.compressedPublicKey = account.getPublicKey();
      result.address = account.getAddressString();
      return result;
    });
  }

  signTransaction(
    path: string,
    transaction: object
  ): Promise<{
    signedTransaction: object
  }> {
    console.log("TX:" + JSON.stringify(transaction));

    var tx = new Transaction(transaction);
    tx.hash = tx.hashTransaction();
    tx.alg = 1;
    tx.sign = 'ledgerSignature';

    console.log("Hashed TX:" + tx.toString());

    const maxChunkSize = 150;

    let chunks = [];
    chunks.push(this.pathToBuffer(path));
    let rawTx = new Buffer(tx.toString());
    for (let i = 0; i < rawTx.length; i += maxChunkSize) {
      let end = i + maxChunkSize;
      if (end > rawTx.length) {
        end = rawTx.length;
      }
      console.log("Chunk::" + i + ", " + end);
      console.log("Chunk::" + rawTx.slice(i, end))
      chunks.push(rawTx.slice(i, end));
    }

    let response;
    return foreach(chunks, (data, i) =>
      this.transport.send(0x6e, 0x02, i + 1, chunks.length, data).then(apduResponse => {
        console.log("Response:" + apduResponse);
        response = apduResponse;
      })
    ).then(() => {
      console.log("Response;"+ response);
      console.log("Response;"+ response.toString("hex"));
      console.log("Response;"+ response.toString("ascii"));

      tx.sign = hexToBase64(response.slice(0, 32 + 32 + 1).toString("hex"));

      let result = {};
      result.signedTransaction = tx;
      console.log("Signed TX:" + tx.toString());
      return result;
    });
  }
}