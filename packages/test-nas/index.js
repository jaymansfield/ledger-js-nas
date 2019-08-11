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

    onClear = () => {
        this.setState({ result: null });
        this.setState({ error: null });
    };

    showProcessing = () => {
        this.setState({ error: null });
        this.setState({ result: "Please wait.." });
    };

    onGetAppConfiguration = async() => {
        try {
            this.showProcessing();
            const nebulasLedger = await this.createNebulasLedger();
            const { majorVersion, minorVersion, patchVersion} = await nebulasLedger.getAppConfiguration();
            this.setState({result: "[majorVer=" + majorVersion + "]\n[minorVer=" + minorVersion + "]\n[patchVer=" + patchVersion + "]"});
        } catch (error) {
            this.setState({error});
        }
    };

    onGetAddress = async() => {
        try {
            this.showProcessing();
            const nebulasLedger = await this.createNebulasLedger();
            const { publicKey, compressedPublicKey, address } = await nebulasLedger.getAddress("44'/2718'/0'");
            this.setState({ result: "[publicKey=" + publicKey.toString("hex") + "]\n[compressedPublicKey=" + compressedPublicKey.toString("hex") + "]\n[address=" + address + "]" });
        } catch (error) {
            this.setState({ error });
        }
    };

    onSignTransaction = async() => {
        try {
            this.showProcessing();
            const nebulasLedger = await this.createNebulasLedger(90000);

            var neb = new Neb();

            const transaction = {
                chainID: parseInt(document.getElementById("txChainID").value),
                from: document.getElementById("txFrom").value,
                to: document.getElementById("txTo").value,
                value: neb.nasToBasic(parseFloat(document.getElementById("txValue").value)),
                nonce: parseInt(document.getElementById("txNonce").value),
                gasPrice: parseInt(document.getElementById("txGasPrice").value),
                gasLimit: parseInt(document.getElementById("txGasLimit").value)
            };

            const { signedTransaction, hash } = await nebulasLedger.signTransaction("44'/2718'/0'", transaction);

            this.setState({ result: "[signedTransaction=" + signedTransaction.toString() + "]\n[raw=" + signedTransaction.toProtoString() + "]"});
        } catch (error) {
            this.setState({ error });
        }
    };

    onSignAndSubmitTransaction = async() => {
        try {
            this.showProcessing();
            const nebulasLedger = await this.createNebulasLedger(90000);

            var neb = new Neb();

            const transaction = {
                chainID: parseInt(document.getElementById("txChainID").value),
                from: document.getElementById("txFrom").value,
                to: document.getElementById("txTo").value,
                value: neb.nasToBasic(parseFloat(document.getElementById("txValue").value)),
                nonce: parseInt(document.getElementById("txNonce").value),
                gasPrice: parseInt(document.getElementById("txGasPrice").value),
                gasLimit: parseInt(document.getElementById("txGasLimit").value)
            };

            const { signedTransaction } = await nebulasLedger.signTransaction("44'/2718'/0'", transaction);

            if(transaction.chainID == 1) {
                neb.setRequest(new Nebulas.HttpRequest("https://mainnet.nebulas.io"));
            }
            else {
                neb.setRequest(new Nebulas.HttpRequest("https://testnet.nebulas.io"));
            }
            neb.api.sendRawTransaction( {data: signedTransaction.toProtoString()} ).then(function(hash) {
                this.setState({ result: "[signedTransaction=" + signedTransaction.toString() + "]\n[raw=" + signedTransaction.toProtoString() + "]\n[txHash=" + hash + "]"});
            });
        } catch (error) {
            this.setState({ error });
        }
    };

    render() {
        const { result, error } = this.state;
        return (
            <div className="container">
                <h1>Ledger NAS Tests</h1>
                <hr/>

                <table>
                    <tr>
                        <td className="testName">Get App Version</td>
                        <td className="testDesc"><button className="action" onClick={this.onGetAppConfiguration}>getAppConfiguration()</button></td>
                    </tr>
                    <tr>
                        <td className="testName">Get Address</td>
                        <td className="testDesc"><button className="action" onClick={this.onGetAddress}>getAddress()</button></td>
                    </tr>

                    <tr>
                        <td className="testName">Sign Transaction</td>
                        <td className="testDesc">
                            <p>Confirm correct attributes are displayed on ledger after clicking sign button.</p>

                            <p></p>

                            <table>
                                <tr>
                                    <td>From:</td><td><input type="text" id="txFrom" defaultValue="n1JkACZHibDC1FV8Pi817pLe9g7GTLseZ1G" /></td>
                                </tr>
                                <tr>
                                    <td>To:</td><td><input type="text" id="txTo" defaultValue="n1JkACZHibDC1FV8Pi817pLe9g7GTLseZ1G" /></td>
                                </tr>
                                <tr>
                                    <td>Value:</td><td><input type="text" id="txValue" defaultValue="0.0001" /> NAS</td>
                                </tr>
                                <tr>
                                    <td>Nonce:</td><td><input type="text" id="txNonce" defaultValue="1" /></td>
                                </tr>
                                <tr>
                                    <td>GasPrice:</td><td><input type="text" id="txGasPrice" defaultValue="20000000000" /></td>
                                </tr>
                                <tr>
                                    <td>GasLimit:</td><td><input type="text" id="txGasLimit" defaultValue="200000" /></td>
                                </tr>
                                <tr>
                                    <td>ChainID:</td><td><input type="text" id="txChainID" defaultValue="1"/></td>
                                </tr>
                            </table>

                            <p></p>

                            <button className="action" onClick={this.onSignTransaction}>signTransaction()</button>
                        </td>
                    </tr>
                </table>

                <h2>Test Result: <button className="action" onClick={this.onClear}>clear</button></h2>
                <div className="resultBox">
                    <p>
                        {error ? (
                            <code className="error">{error.toString()}</code>
                        ) : (
                            <pre>{result}</pre>
                        )}
                    </p>
                </div>
            </div>
        );
    };
}

ReactDOM.render(<App />, document.getElementById("root"));