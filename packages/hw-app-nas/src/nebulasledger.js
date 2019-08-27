import { splitPath, foreach, hexToBase64 } from "./util";
import type Transport from "@ledgerhq/hw-transport";

import Nebulas from "nebulas";
var Account = Nebulas.Account;
var Transaction = Nebulas.Transaction;
var CryptoUtils = Nebulas.CryptoUtils;

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
      element |= 0x80000000;
      buffer.writeInt32LE(element, 1 + 4 * index);
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

    var txObj = tx.toString();

    var o = JSON.parse(txObj)
    if(o.data != null) {
      var protobuf = require('protobufjs');
      var root = protobuf.Root.fromJSON(require("../lib/transaction.json"));
      var Data = root.lookup("corepb.Data");
      var err = Data.verify(tx.data);
      if (err) {
        throw new Error(err);
      }
      var data = Data.create(tx.data);
      o.dataBuffer = new Buffer(Data.encode(data).finish()).toString("hex");

      // reduce size of json to make it easier on the ledger device
      delete o['data'];
      delete o['hash'];
      delete o['sign'];
      delete o['alg'];
    }
    txObj = JSON.stringify(o);

    // further reduce size of json to make it easier on the ledger device
    txObj = txObj.replace("\"chainID\":", "\"c\":");
    txObj = txObj.replace("\"from\":", "\"f\":");
    txObj = txObj.replace("\"to\":", "\"a\":");
    txObj = txObj.replace("\"value\":", "\"v\":");
    txObj = txObj.replace("\"nonce\":", "\"n\":");
    txObj = txObj.replace("\"timestamp\":", "\"t\":");
    txObj = txObj.replace("\"gasPrice\":", "\"p\":");
    txObj = txObj.replace("\"gasLimit\":", "\"l\":");
    txObj = txObj.replace("\"dataBuffer\":", "\"d\":");

    console.log(txObj);

    let rawTx = new Buffer(txObj);
    for (let i = 0; i < rawTx.length; i += maxChunkSize) {
      let end = i + maxChunkSize;
      if (end > rawTx.length) {
        end = rawTx.length;
      }
      chunks.push(rawTx.slice(i, end));
    }

    let response;

    return foreach(chunks, (data, i) =>
      this.transport.send(0x6e, 0x02, i + 1, chunks.length, data).then(apduResponse => {
        response = apduResponse;
      })
    ).then(() => {
      console.log("Response:"+ response.toString("hex"));

      let rLen = response[3];
      let sLen = response[4 + rLen + 1];

      let rOffset = (rLen == 33) ? 1 : 0;
      let sOffset = (sLen == 33) ? 1 : 0;

      const sigR = response.slice(4 + rOffset, 4 + rOffset + 32);
      console.log("R:" + sigR.toString("hex"));

      const sigS = response.slice(4 + rLen + 2 + sOffset, 4 + rLen + 2 + sOffset + 32)
      console.log("S:" + sigS.toString("hex"));

      const sigV = CryptoUtils.toBuffer(response[0]);

      tx.sign = Buffer.concat([sigR, sigS, sigV]);

      let result = {};
      result.signedTransaction = tx;
      console.log("Signed TX:" + tx.toString());
      return result;
    });
  }
}