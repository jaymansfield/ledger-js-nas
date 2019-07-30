import "./index.css";
import React, { Component } from "react";
import ReactDOM from "react-dom";
import "babel-polyfill";
import { listen } from "@ledgerhq/logs";
import Transport from "@ledgerhq/hw-transport-webusb";
import NebulasLedger from "@ledgerhq/hw-app-nas";
import Nebulas from "nebulas";

var Neb = Nebulas.Neb;

listen(e => {
    console.log(`${e.type}: ${e.message}`);
});

class App extends Component {
    constructor (props) {
        super(props)
        this.state = {
            result: null,
            error: null
        };
    }

    createNebulasLedger = async (timeout: number): NebulasLedger => {
        timeout = timeout !== undefined ? timeout : 30000;
        const transport = await Transport.create();
        //transport.setDebugMode(true);
        transport.setExchangeTimeout(timeout);
        return new NebulasLedger(transport);
    };

    clear = () => {
        this.setState({ result: null });
        this.setState({ error: null });
    };

    showProcessing = () => {
        this.setState({ error: null });
        this.setState({ result: "Please wait.." });
    };

    hexToBase64 = (hexString: string) => {
        return btoa(hexString.match(/\w{2}/g).map(function(a) {
            return String.fromCharCode(parseInt(a, 16));
        }).join(""));
    };


    onGetAppConfiguration = async() => {
        try {
            this.showProcessing();
            const nebulasLedger = await this.createNebulasLedger();
            const { majorVersion, minorVersion, patchVersion} = await nebulasLedger.getAppConfiguration();
            this.setState({result: "[majorVer=" + majorVersion + "],[minorVer=" + minorVersion + "],[patchVer=" + patchVersion + "]"});
        } catch (error) {
            this.setState({error});
        }
    };

    onGetAddress = async() => {
        try {
            this.showProcessing();
            const nebulasLedger = await this.createNebulasLedger();
            const { publicKey, compressedPublicKey, address } = await nebulasLedger.getAddress("44'/2718'/0'");
            this.setState({ result: "[publicKey=" + publicKey.toString("hex") + "],[compressedPublicKey=" + compressedPublicKey.toString("hex") + "],[address=" + address + "]" });
        } catch (error) {
            this.setState({ error });
        }
    };

    onSignTransaction = async() => {
        try {
            this.showProcessing();
            const nebulasLedger = await this.createNebulasLedger(90000);

            const transaction = {
                chainID: 1,
                from: "n1crPx23HuZUGD6AiUP5z3AgDJg35jP81BZ",
                to: "n1crPx23HuZUGD6AiUP5z3AgDJg35jP81BZ",
                value: 1000000,
                nonce: 12,
                gasPrice: 1500000,
                gasLimit: 2500000
            };

            const { signedTransaction, hash } = await nebulasLedger.signTransaction("44'/2718'/0'", transaction);
            this.setState({ result: "[signedTransaction=" + signedTransaction.toString() + "],[hash=" + signedTransaction.toProtoString() + "]"});
        } catch (error) {
            this.setState({ error });
        }
    };

    onSignAndSubmitTransaction = async() => {
        try {
            this.showProcessing();
            const nebulasLedger = await this.createNebulasLedger(90000);

            const transaction = {
                chainID: 1001,
                from: "n1UFKmFRxUgNgnHt9nWuKGYFZsxbcmSLELv",
                to: "n1W9yYz2gdD92Z1hF4AGGcumEfm3dfbEEKz",
                value: 1000000,
                nonce: 12,
                gasPrice: 1500000,
                gasLimit: 2500000
            };

            const { signedTransaction } = await nebulasLedger.signTransaction("44'/2718'/0'", transaction);

            var neb = new Neb();
            neb.setRequest(new Nebulas.HttpRequest("https://testnet.nebulas.io"));
            neb.api.sendRawTransaction( {data: signedTransaction.toProtoString()} ).then(function(hash) {
                this.setState({ result: "[signedTransaction=" + signedTransaction.toString() + "],[encodedTransaction=" + signedTransaction.toProtoString() + "],[hash=" + hash + "]"});
            });
        } catch (error) {
            this.setState({ error });
        }
    };

    render() {
        const { result, error } = this.state;
        return (
            <div>
                <h1>Ledger NAS Tests</h1>

                <button className="action" onClick={this.onGetAppConfiguration}>getAppConfiguration()</button>
                <p></p>

                <button className="action" onClick={this.onGetAddress}>getAddress()</button>
                <p></p>

                <button className="action" onClick={this.onSignTransaction}>signTransaction()</button>
                <p>Confirm to=n1crPx23HuZUGD6AiUP5z3AgDJg35jP81BZ, amount=0.1, gasPrice=1500000, gasLimit=2500000  is displayed on Ledger.</p>

                <button className="action" onClick={this.onSignAndSubmitTransaction}>signAndSubmitTransaction()</button>
                <p>Confirm to=n1crPx23HuZUGD6AiUP5z3AgDJg35jP81BZ, amount=0.1, gasPrice=1500000, gasLimit=2500000  is displayed on Ledger.</p>

                <p>
                    RESULT: <button className="action" onClick={this.onClear}>clear</button>
                    <p>
                        {error ? (
                            <code className="error">{error.toString()}</code>
                        ) : (
                            <code className="result">{result}</code>
                        )}
                    </p>
                </p>
            </div>
        );
    };
}

ReactDOM.render(<App />, document.getElementById("root"));