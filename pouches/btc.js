var HDWalletPouchBitcoin = function() {
    this._doDebug = true;
    this._pouchManager = null;
    this._baseFormatCoinType = COIN_BITCOIN;
}

HDWalletPouchBitcoin.uiComponents = {
    coinFullName: 'Bitcoin',
    coinFullDisplayName: 'Bitcoin',
    coinWalletSelector3LetterSymbol: 'BTC',
    coinSymbol: '\u0E3F',
    coinButtonSVGName: 'bitcoin-here',
    coinLargePngName: '.imgBTC',
    coinButtonName: '.imageLogoBannerBTC',
    coinSpinnerElementName: '.imageBTCWash',
    coinDisplayColor: '#F7931A',
    csvExportField: '.backupPrivateKeyListBTC',
    transactionsListElementName: '.transactionsBitcoin',
    transactionTemplateElementName: '.transactionBitcoin',
    accountsListElementName: '.accountDataTableBitcoin',
    accountTemplateElementName: '.accountDataBitcoin',
    displayNumDecimals: 8,
};

HDWalletPouchBitcoin.pouchParameters = {
    coinHDType: 0,
    coinIsTokenSubtype: false,
    coinAbbreviatedName: 'BTC',
    isSingleToken: false,
    isTestnet: false,
};

HDWalletPouchBitcoin.networkDefinitions = {
    mainNet: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4
        },
        pubKeyHash: 0x00,
        scriptHash: 0x05,
        wif: 0x80,
        dustThreshold: 546
    },
    testNet: {
        messagePrefix: '\x18Bitcoin Signed Message:\n',
        bip32: {
            public: 0x043587cf,
            private: 0x04358394
        },
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        wif: 0xef,
        dustThreshold: 546
    },
}

HDWalletPouchBitcoin.getCoinAddress = function(node) {
    var pubKey = node.keyPair.getPublicKeyBuffer();

    var pubKeyHash = thirdparty.bitcoin.crypto.hash160(pubKey);

    var payload = new thirdparty.Buffer.Buffer(21);
//    console.log("bitcoin :: pubkeyhash :: " + node.keyPair.network.pubKeyHash);
    payload.writeUInt8(node.keyPair.network.pubKeyHash, 0);
    pubKeyHash.copy(payload, 1);

    var address = thirdparty.bs58check.encode(payload);

    //        console.log("[bitcoin]&nbsp;address :: " + address);
    return address;
}

HDWalletPouchBitcoin.prototype.convertFiatToCoin = function(fiatAmount, coinUnitType) {
    var coinAmount = 0;

    var satoshis = wallet.getHelper().convertFiatToSatoshis(fiatAmount);
    coinAmount = (coinUnitType === COIN_UNITLARGE) ? HDWalletHelper.convertSatoshisToBitcoins(satoshis) : satoshis;

    return coinAmount;
}

HDWalletPouchBitcoin.prototype.initialize = function(pouchManager) {
    this._pouchManager = pouchManager;
}

HDWalletPouchBitcoin.prototype.shutDown = function() {
}

HDWalletPouchBitcoin.prototype.setup = function() {
}

HDWalletPouchBitcoin.prototype.log = function(logString) {
    if (this._doDebug === false) {
        return;
    }

    var args = [].slice.call(arguments);
    args.unshift('BitcoinPouchLog:');
    console.log(args);
}

HDWalletPouchBitcoin.prototype.updateMiningFees = function() {
    var self = this;

    $.getJSON('https://bitcoinfees.21.co/api/v1/fees/recommended', function (data) {
        if (!data || !data.halfHourFee) {
            this.log("HDWalletPouchBitcoin.updateMiningFees :: error :: cannot access default fee");
        } else  {
            self._pouchManager._miningFeeDict = data;
            //@note: @here: default to "average"
            self._pouchManager._defaultTXFee = parseInt(data.hourFee) * 1000;
        }
    });
}

HDWalletPouchBitcoin.prototype.requestBlockNumber = function(callback) {
    callback(null);
}


HDWalletPouchBitcoin.prototype.updateTransactionsFromWorker = function(txid, transactions) {
    var isTXUpdated = false;

    var existingTransaction = this._pouchManager._transactions[txid];
    if (typeof(existingTransaction) === 'undefined') {
        existingTransaction = null;
    }

    var transaction = transactions[txid];
    //@note: @here: @next:
    //                            if (typeof(existingTransaction) !== 'undefined' &amp;&amp; existingTransaction !== null &amp;&amp; existingTransaction.inputs &amp;&amp; existingTransaction.outputs) {
    //                                if (transaction.inputs.length !== existingTransaction.inputs.length) {
    //                                    console.log("tx inputs different length");
    //                                    didModifyTX = true;
    //                                }
    //
    //                                if (transaction.outputs.length !== existingTransaction.outputs.length) {
    //                                    console.log("tx outputs different length");
    //                                    didModifyTX = true;
    //                                }
    //                            }

    // We need to convert all the amounts from BTC to satoshis (cannot do this inside the worker easily)
    for (var i = 0; i &lt; transaction.inputs.length; i++) {
        var input = transaction.inputs[i];
        input.amount = HDWalletHelper.convertBitcoinsToSatoshis(input.amountBtc);

        if (existingTransaction &amp;&amp; (existingTransaction.inputs[i].addressIndex !== input.addressIndex || existingTransaction.inputs[i].addressInternal !== input.addressInternal)) {
            //                                    console.log("[inputs] :: " + i + " :: [existingTransaction] :: addressIndex :: " + existingTransaction.inputs[i].addressIndex + " :: addressInternal :: " + existingTransaction.inputs[i].addressInternal + " :: [incomingTransaction] : addressIndex :: " + input.addressIndex + " :: addressInternal :: " + input.addressInternal);
            isTXUpdated = true;
        }
        //                                console.log("input.amountBtc :: " + input.amountBtc + " :: input.amount :: " + input.amount)
    }
    for (var i = 0; i &lt; transaction.outputs.length; i++) {
        var output = transaction.outputs[i];
        output.amount = HDWalletHelper.convertBitcoinsToSatoshis(output.amountBtc);

        if (existingTransaction &amp;&amp; (existingTransaction.outputs[i].addressIndex !== output.addressIndex || existingTransaction.outputs[i].addressInternal !== output.addressInternal)) {
            //                                    console.log("[outputs] :: " + i + " :: [existingTransaction] :: addressIndex :: " + existingTransaction.outputs[i].addressIndex + " :: addressInternal :: " + existingTransaction.outputs[i].addressInternal + " :: [incomingTransaction] : addressIndex :: " + output.addressIndex + " :: addressInternal :: " + output.addressInternal);

            isTXUpdated = true;
        }

        //                                console.log("output.amountBtc :: " + output.amountBtc + " :: output.amount :: " + output.amount)
    }

    return isTXUpdated;
}

HDWalletPouchBitcoin.prototype.getTransactions = function() {
    var res = [];

    /**
 *  Get all transactions for this wallet, sorted by date, earliest to latest.
 */
    for (var key in this._pouchManager._transactions) {
        res.push(this._pouchManager._transactions[key]);
    }

    res.sort(function (a, b) {
        var deltaConf = (a.confirmations - b.confirmations);
        if (deltaConf) { return deltaConf; }
        return (b.timestamp - a.timestamp);
    });

    return res;
}

HDWalletPouchBitcoin.prototype.calculateHistoryforTransaction = function(transaction) {
    var deltaBalance = 0;
    var miningFee = 0;

//    console.log("[bitcoin pouch] :: transaction :: " + transaction.txid);

    for (var i = 0; i &lt; transaction.inputs.length; i++) {
        var input = transaction.inputs[i];

        miningFee += input.amount;
//        console.log("[bitcoin pouch] :: input transaction :: " + transaction.txid + " :: input.amount :: " + input.amount + " :: miningFee :: " + miningFee);

        // Our address, money sent (input values are always negative)
        if (input.addressIndex !== null) {
            deltaBalance += input.amount;
        }
    }

    var myInputAddress = [];
    var otherOutputAddress = [];
    for (var i = 0; i &lt; transaction.outputs.length; i++) {
        var output = transaction.outputs[i];

        miningFee += output.amount;
//        console.log("[bitcoin pouch] :: output transaction :: " + transaction.txid + " :: output.amount :: " + output.amount + " :: miningFee :: " + miningFee);

        // Our address, money received
        if (output.addressIndex !== null) {
            deltaBalance += output.amount;
            myInputAddress.push(input.address);
        } else {
            otherOutputAddress.push(output.address);
        }
    }

    var toAddress = null;
    var toAddressFull = null;

    if (deltaBalance &gt; 0 &amp;&amp; myInputAddress.length === 1) {
        toAddress = myInputAddress[0];
        toAddressFull = myInputAddress[0];
    } else if (deltaBalance &lt; 0 &amp;&amp; otherOutputAddress.length === 1) {
        toAddress = otherOutputAddress[0];
        toAddressFull = otherOutputAddress[0];
    }

    var newHistoryItem = {
        toAddress: toAddress,
        toAddressFull: toAddressFull,
        blockHeight: transaction.block,
        confirmations: transaction.confirmations,
        deltaBalance: deltaBalance,
        miningFee: miningFee,
        timestamp: transaction.timestamp,
        txid: transaction.txid
    };

    //            console.log("adding new history item :: " + newHistoryItem);

    return newHistoryItem;
}

HDWalletPouchBitcoin.prototype.getPouchFoldBalance = function() {
    var balance = 0;

    var unspent = this._getUnspentOutputs();

    for (var i = 0; i &lt; unspent.length; i++) {
        balance += unspent[i].amount;
    }

    return balance;
}

HDWalletPouchBitcoin.prototype._getUnspentOutputs = function() {
    var unspent = {};

    // Sigh... We don't get the transaction index (within a block), so we can't strictly order them

    var transactions = this.getTransactions();

    // Add the each UTXO
    for (var ti = transactions.length - 1; ti &gt;= 0; ti--) {
        var transaction = transactions[ti];
        for (var i = 0; i &lt; transaction.outputs.length; i++) {
            var output = transaction.outputs[i];
            if (output.addressIndex !== null) {
                var utxoKey = output.txid + ':' + output.index;
                unspent[utxoKey] = output;
            }
        }
    }

    // Remove each spent UTXO
    for (var ti = transactions.length - 1; ti &gt;= 0; ti--) {
        var transaction = transactions[ti];
        for (var i = 0; i &lt; transaction.inputs.length; i++) {
            var input = transaction.inputs[i];
            if (input.addressIndex !== null) {
                var utxoKey = input.previousTxid + ':' + input.previousIndex;
                if (unspent[utxoKey]) {
                    delete unspent[utxoKey];
                }
            }
        }
    }

    // Convert to an array of outputs
    var result = [];
    for (var utxoKey in unspent) {
        result.push(unspent[utxoKey]);
    }

    return result;
}

HDWalletPouchBitcoin.prototype.getAccountBalance = function(internal, index) {
    var accountBalance = 0;

    //@note:@todo:@optimization: this should probably be cached in the worker..
    // Add the each UTXO
    var transactions = this.getTransactions();
    var unspent = {};

    for (var ti = transactions.length - 1; ti &gt;= 0; ti--) {
        var transaction = transactions[ti];
        for (var i = 0; i &lt; transaction.outputs.length; i++) {
            var output = transaction.outputs[i];
            if (output.addressIndex !== null) {
                //@note: @here: only a truthy check for internal.
                if (output.addressInternal == internal &amp;&amp; output.addressIndex === index) {
                    var utxoKey = output.txid + ':' + output.index;
                    unspent[utxoKey] = output;
                }
            }
        }
    }

    // Remove each spent UTXO
    for (var ti = transactions.length - 1; ti &gt;= 0; ti--) {
        var transaction = transactions[ti];
        for (var i = 0; i &lt; transaction.inputs.length; i++) {
            var input = transaction.inputs[i];
            if (input.addressIndex !== null) {
                //@note: @here: only a truthy check for internal.
                if (output.addressInternal == internal &amp;&amp; output.addressIndex === index) {
                    var utxoKey = input.previousTxid + ':' + input.previousIndex;
                    if (unspent[utxoKey]) {
                        delete unspent[utxoKey];
                    }
                }
            }
        }
    }

    for (var i = 0; i &lt; unspent.length; i++) {
        accountBalance += unspent.balance;
    }

    return accountBalance;
}

HDWalletPouchBitcoin.prototype.getSpendableBalance = function(minimumValue) {
    var spendableDict = {spendableBalance: 0,
                        numPotentialTX: 0};

    var spendableBalance = this.getPouchFoldBalance();
    var address = this._pouchManager.getCurrentReceiveAddress();

    while (spendableBalance &gt; 0) {
        //@note: @todo: maybe migrate this (carefully!) to the ethereum side's mechanism.
        var transaction = this.buildBitcoinTransaction(address, spendableBalance, true);
        if (transaction) { break; }

        spendableBalance -= this._pouchManager.getCurrentMiningFee();
    }

    spendableDict.spendableBalance = spendableBalance;
    spendableDict.numPotentialTX = 1;

    return spendableDict;
}

HDWalletPouchBitcoin.prototype._buildBitcoinTransaction = function(toAddress, amount_smallUnit, transactionFee, doNotSign) {
    var coinNetwork = null;

    if (this._pouchManager._TESTNET) {
        coinNetwork = HDWalletPouch.getStaticCoinPouchImplementation(this._pouchManager._coinType).networkDefinitions.testNet;
    } else {
        coinNetwork = HDWalletPouch.getStaticCoinPouchImplementation(this._pouchManager._coinType).networkDefinitions.mainNet;
    }

    //    this._load();

    // Get all UTXOs, biggest to smallest)
    var unspent = this._getUnspentOutputs();
    unspent.sort(function (a, b) {
        return (a.amount - b.amount);
    });

    // @TODO: Build a better change picking algorithm; for now we select the largest first

    // Find a set of UTXOs that can afford the output amount
    var toSpend = [];
    var toSpendTotal = 0;
    while (toSpendTotal &lt; amount_smallUnit + transactionFee) {
        if (unspent.length === 0) {
            return null;
        }
        var utxo = unspent.pop();
        toSpend.push(utxo);
        toSpendTotal += utxo.amount;

        // Keys for bip69 to sort on
        utxo.vout = utxo.index;
        utxo.txId = utxo.txid;
    }

    // Create the transaction
    var tx = new thirdparty.bitcoin.TransactionBuilder(coinNetwork);

    // This mimicks the data structure we keep our transactions in so we can
    // simulate instantly fulfilling the transaction
    var mockTx = {
        block: -1,
        confirmations: 0,
        inputs: [],
        outputs: [],
        timestamp: (new Date()).getTime(),
    }

    var addressToScript = function(address) {
        return thirdparty.bitcoin.address.toOutputScript(toAddress, coinNetwork);
    }


    // Send the target their funds
    var outputs = [
        {
            address: toAddress,
            amount: amount_smallUnit,
            addressIndex: null,
            addressInternal: null,

            // Keys for bip69 to sort on
            value: amount_smallUnit,
            script: addressToScript(toAddress),
        }
    ];

    // Send the change back to us
    var change = toSpendTotal - amount_smallUnit - transactionFee;
    if (change) {
        var changeAddress = this._pouchManager._currentChangeAddress;
        outputs.push({
            address: this._pouchManager._currentChangeAddress,
            addressIndex: this._pouchManager._currentChangeIndex,
            addressInternal: 1,
            amount: change,

            // Keys for bip69 to sort on
            value: change,
            script: addressToScript(this._pouchManager._currentChangeAddress),
        });
    }

    // Sort the inputs and outputs according to bip 69
    toSpend = thirdparty.bip69.sortInputs(toSpend);
    outputs = thirdparty.bip69.sortOutputs(outputs);

    // Add the outputs
    for (var i = 0; i &lt; outputs.length; i++) {
        var output = outputs[i];
        tx.addOutput(output.address, output.amount);
        mockTx.outputs.push({
            address: output.address,
            addressIndex: output.addressIndex,
            addressInternal: output.addressInternal,
            amount: output.amount,
            confirmations: 0,
            index: i,
            spent: false,
            standard: true,
            timestamp: mockTx.timestamp,
        });
    }

    // Add the input UTXOs
    for (var i = 0; i &lt; toSpend.length; i++) {
        var utxo = toSpend[i];
        tx.addInput(utxo.txid, utxo.index);

        mockTx.inputs.push({
            address: utxo.address,
            addressIndex: utxo.addressIndex,
            addressInternal: utxo.addressInternal,
            amount: -utxo.amount,
            previousIndex: utxo.index,
            previousTxid: utxo.txid,
            standard: true,
        });
    }

    if (typeof(doNotSign) !== 'undefined' &amp;&amp; doNotSign !== null &amp;&amp; doNotSign === true) {
        //        console.log("building incomplete :: " + JSON.stringify(tx));
        return tx.buildIncomplete();
    }

    // Sign the transaction
    for (var i = 0; i &lt; toSpend.length; i++) {
        var utxo = toSpend[i];
        //        console.log("signing with :: " + this.getPrivateKey(utxo.addressInternal, utxo.addressIndex).toWIF() + " :: " + utxo.addressInternal);
        tx.sign(i, this._pouchManager.getPrivateKey(utxo.addressInternal, utxo.addressIndex));
    }

    var transaction = tx.build();

    // We get the txid in big endian... *sigh*
    var txidBig = transaction.getHash().toString('hex');
    var txid = '';
    for (var i = txidBig.length - 2; i &gt;= 0; i-= 2) {
        txid += txidBig.substring(i, i + 2)
    }

    // Fill in the txid for the mock transaction and its outputs
    mockTx.txid = txid;
    for (var i = 0; i &lt; mockTx.outputs.length; i++) {
        var output = mockTx.outputs[i];
        output.txid = txid;
    }

    transaction._kkToSpend = toSpend;
    transaction._kkMockTx = mockTx;

    //    console.log("building complete :: " + JSON.stringify(transaction));

    return transaction;
}


HDWalletPouchBitcoin.prototype.buildBitcoinTransaction = function(toAddress, amount_smallUnit, doNotSign) {
    var tx = null;

    var currentBitcoinMiningFee = this._pouchManager.getCurrentMiningFee();

    var totalTransactionFee = currentBitcoinMiningFee;

    //    console.log("buildBitcoinTransaction :: address :: " + toAddress + " :: currentBitcoinMiningFee :: " + currentBitcoinMiningFee);
    while (true) {
        tx = this._buildBitcoinTransaction(toAddress, amount_smallUnit, totalTransactionFee, true);

        // Insufficient funds
        if (tx == null) {
            return null;
        }

        // How big is the transaction and what fee do we need? (we didn't sign so fill in 107 bytes for signatures)
        var size = tx.toHex().length / 2 + tx.ins.length * 107;
        var targetTransactionFee = Math.ceil(size / 1024) * currentBitcoinMiningFee;

        //            console.log("targetTransactionFee :: " + targetTransactionFee)
        //            break;//
        // We have enough tx fee (sign it)
        if (targetTransactionFee &lt;= totalTransactionFee) {
            if (typeof(doNotSign) === 'undefined' || doNotSign === null || doNotSign === false) {
                tx = this._buildBitcoinTransaction(toAddress, amount_smallUnit, totalTransactionFee);
            }
            break;
        }

        // Add at least enough tx fee to cover our size thus far (adding tx may increase fee)
        while (targetTransactionFee &gt; totalTransactionFee) {
            totalTransactionFee += currentBitcoinMiningFee;
        }
    }

    tx._kkTransactionFee = totalTransactionFee;
    tx.getTransactionFee = function() { return this._kkTransactionFee; }

    return tx;
}

HDWalletPouchBitcoin.prototype.updateTokenAddresses = function(addressMap) {
}

HDWalletPouchBitcoin.prototype.getAccountList = function(transactions) {
    var result = [];

    var lastIndexChange = 0;
    var lastIndexReceive = 0;

    for (var ti = 0; ti &lt; transactions.length; ti++) { //iterate through txs
        var transaction = transactions[ti];

        //First we need to determine if this is an incoming tx. let see balance
        //            console.log("bitcoin :: tx :: " + JSON.stringify(transaction));

        //Iterate on Inputs
        for (var i = 0; i &lt; transaction.inputs.length; i++) {
            var input = transaction.inputs[i];
            // Our address, money sent (input values are always negative)
            if (!input.addressInternal &amp;&amp; input.addressIndex !== null) {
                if (input.addressIndex &gt; lastIndexReceive) {
                    lastIndexReceive = input.addressIndex;
                }

                //                    var tempPair = [];
                //                    tempPair[0] = this.getPrivateKey(input.addressInternal, input.addressIndex).toWIF();
                //                    tempPair[1] = input.address;
                //                    result.push(tempPair);
                //
                //                    console.log("bitcoin :: input index :: " + input.addressIndex + " :: public address :: " + tempPair[1] + " :: private key :: " + tempPair[0]);
            }
            if (input.addressInternal &amp;&amp; input.addressIndex !== null) {
                if (input.addressIndex &gt; lastIndexChange) {
                    lastIndexChange = input.addressIndex;
                }
            }
        }

        for (var i = 0; i &lt; transaction.outputs.length; i++) {
            var output = transaction.outputs[i];
            if (!output.addressInternal &amp;&amp; output.addressIndex !== null) {
                if (output.addressIndex &gt; lastIndexReceive) {
                    lastIndexReceive = output.addressIndex;
                }

                //                    var tempPair = [];
                //                    tempPair[0] = this.getPrivateKey(output.addressInternal, output.addressIndex).toWIF();
                //                    tempPair[1] = output.address;
                //                    result.push(tempPair);
                //
                //                    console.log("bitcoin :: output index :: " + output.addressIndex + " :: public address :: " + tempPair[1] + " :: private key :: " + tempPair[0]);
            }
            if (output.addressInternal &amp;&amp; output.addressIndex !== null) {
                if (output.addressIndex &gt; lastIndexChange) {
                    lastIndexChange = output.addressIndex;
                }
            }
        }
    }

    for (var i = lastIndexReceive + 1; i &gt;= 0; i--) {
        var account = {};
        account.pvtKey = this._pouchManager.getPrivateKey(false, i).toWIF();
        account.pubAddr = this._pouchManager.getPublicAddress(false, i);
        account.balance = this.getAccountBalance(false, i);

        result.push(account);

        //            console.log("bitcoin :: receive node(i) :: " + i + " :: address :: " + tempPair[1] + " :: private :: " + tempPair[0]);
    }

    for (var i = lastIndexChange + 1; i &gt;= 0; i--) {
        var account = {};
        account.pvtKey = this._pouchManager.getPrivateKey(true, i).toWIF();
        account.pubAddr = this._pouchManager.getPublicAddress(true, i);
        account.balance = this.getAccountBalance(true, i);
        result.push(account);

        //            console.log("bitcoin :: change node(i) :: " + i + " :: address :: " + tempPair[1] + " :: private :: " + tempPair[0]);
    }

    result.reverse();
    //        var tempPair = [];
    //        tempPair[0] = this.getPrivateKey(false, lastIndex + 1).toWIF();
    //        tempPair[1] = this.getPublicAddress(false, lastIndex + 1);
    //        result.push(tempPair);

    return result;
}

HDWalletPouchBitcoin.prototype.generateQRCode = function(largeFormat, coinAmountSmallType) {
    var curRecAddr = this._pouchManager.getCurrentReceiveAddress();

    var uri = "bitcoin:" + curRecAddr;

    if (coinAmountSmallType) {
        uri += "?amount=" + coinAmountSmallType;
    }

    if (largeFormat) {
        if (coinAmountSmallType || !this._pouchManager._largeQrCode) {
            //            this.log('Blocked to generate QR big Code');
            this._pouchManager._largeQrCode =  "data:image/png;base64," + thirdparty.qrImage.imageSync(uri, {type: "png", ec_level: "H", size: 7, margin: 1}).toString('base64');
        }

        return this._pouchManager._largeQrCode;
    } else {
        if (coinAmountSmallType || !this._pouchManager._smallQrCode) {
            //        this.log('Blocked to generate QR small Code');
            this._pouchManager._smallQrCode =  "data:image/png;base64," + thirdparty.qrImage.imageSync(uri, {type: "png", ec_level: "H", size: 5, margin: 1}).toString('base64');
        }

        return this._pouchManager._smallQrCode;
    }
}

HDWalletPouchBitcoin.prototype.sendBitcoinTransaction = function(transaction, callback) {
    var mockTx = transaction._kkMockTx;
    var txid = mockTx.txid;

    this.log('Sending Transaction:', txid, transaction, transaction.toHex(), mockTx);

    if (this._pouchManager._transactions[txid]) {
        throw new Error('What?!'); //TODO ask richard what is this
    }

    this._pouchManager._transactions[txid] = mockTx;
    this._pouchManager._spendable = null;

    this._pouchManager.invalidateTransactionCache();

    this._pouchManager._notify();

    // Post the transaction
    var self = this;


    //@note: @here: @todo: @next: @relays:
    // @todo: startRelayTaskWithBestRelay
//    g_JaxxApp.getBitcoinRelays().startRelayTaskWithDefaultRelay('pushRawTx', [transaction.toHex(), function (response){
    g_JaxxApp.getBitcoinRelays().startRelayTaskWithBestRelay('pushRawTx', [transaction.toHex(), function (response){
        if ((response.status &amp;&amp; response.status === 'success') || response === 'success') {
            self._pouchManager._transactions[txid].status = 'success';
            self._pouchManager._notify();
        }
        else if (self._pouchManager._transactions[txid].status !== 'success') {
            delete self._pouchManager._transactions[txid];
            self._pouchManager._notify();
        }

        self.log(response);
        if (callback) {
            var returnVar = "";
            if (response.status) {
                returnVar = response.status;
            } else {
                returnVar = response;
            }
            callback(returnVar, transaction);
        }
    }], 1);
}

HDWalletPouchBitcoin.prototype.afterWorkerCacheInvalidate = function() {
}

HDWalletPouchBitcoin.prototype.prepareSweepTransaction = function(privateKey, callback) {
    var coinNetwork = null;

    if (this._pouchManager._TESTNET) {
        coinNetwork = HDWalletPouch.getStaticCoinPouchImplementation(this._pouchManager._coinType).networkDefinitions.testNet;
    } else {
        coinNetwork = HDWalletPouch.getStaticCoinPouchImplementation(this._pouchManager._coinType).networkDefinitions.mainNet;
    }
    // Function is called when:
    // The user enters their private key from a paper wallet and presses the 'Next' button.
    // Returns:
    // true if the bitcoins from the wallet with the given 'privateKey' could be successfully imported.
    var keypair = null;
    try { // This fills the variable keypair with an ECPair
        keypair = thirdparty.bitcoin.ECPair.fromWIF(privateKey, coinNetwork);
        console.log("trying to fetch for address :: " + keypair.getAddress());
    } catch (err) {
        return false;
    }

    var prepareTransaction = function(error, data) {
        //        console.log("prepareTransaction :: " + status + " :: " + JSON.stringify(data));
        var result = {};

        if ((error &amp;&amp; error !== "success") || !data) {
            callback(new Error(JSON.stringify(data)), null);
            return;
        }

        var mockTx = {
            block: -1,
            confirmations: 0,
            inputs: [],
            outputs: [],
            timestamp: (new Date()).getTime(),
            txid: null,
        }

        var toSpend = [];
        var totalValue = 0;
        var utxoList = data[Object.keys(data)[0]];
        for (var i = 0; i &lt; utxoList.length; i++) {
            var tx = utxoList[i];
            var value = HDWalletHelper.convertBitcoinsToSatoshis(tx.amount);

            toSpend.push({
                amount: value,
                confirmations: tx.confirmations,
                index: tx.index,
                txid: tx.txid,
                //Keys for BIP 0069 sorting library
                vout: tx.index,
                txId: tx.txid,
            });
            mockTx.inputs.push({
                address: "notmyaddress",
                addressIndex: null,
                addressInternal: null,
                amount: -value,
                previousIndex: tx.index,
                previousTxid: tx.txid,
                standard: true,
            })
            totalValue += value;
        }

        //

        toSpend = thirdparty.bip69.sortInputs(toSpend);

        var signedTransaction = null;

        var transactionFee = wallet.getPouchFold(COIN_BITCOIN).getDefaultTransactionFee();

        //        console.log("sweep bitcoin :: totalValue :: " + totalValue + " :: transactionFee :: " + transactionFee);
        if (transactionFee &gt;= totalValue) {
            console.log(JSON.stringify(callback));
            callback(new Error("the balance is lower than tx fee : " + HDWalletHelper.convertSatoshisToBitcoins(transactionFee)), null);
            return;
        }

        while ((totalValue - transactionFee) &gt; 0) {
            var tx = new thirdparty.bitcoin.TransactionBuilder(coinNetwork);
            tx.addOutput(wallet.getPouchFold(COIN_BITCOIN).getCurrentChangeAddress(), totalValue - transactionFee);

            for (var i = 0; i &lt; toSpend.length; i++) {
                var utxo = toSpend[i];
                tx.addInput(utxo.txid, utxo.index);
            }

            var unsignedTransaction = tx.buildIncomplete();
            var size = unsignedTransaction.toHex().length / 2 + unsignedTransaction.ins.length * 107;
            var targetTransactionFee = Math.ceil(size / 1024) * wallet.getPouchFold(COIN_BITCOIN).getDefaultTransactionFee();

            if (targetTransactionFee &lt;= transactionFee) {
                for (var i = 0; i &lt; toSpend.length; i++) {
                    tx.sign(i, keypair);
                }

                signedTransaction = tx.build();
                break;
            }

            // Add at least enough tx fee to cover our size thus far (adding tx may increase fee)
            while (targetTransactionFee &gt; transactionFee) {
                transactionFee += wallet.getPouchFold(COIN_BITCOIN).getDefaultTransactionFee();
            }
        }

        if (!signedTransaction) {
            callback(new Error("Unsigned Transaction"), null);
            return;
        }

        // We get the txid in big endian... *sigh*
        var txidBig = signedTransaction.getHash().toString('hex');
        var txid = '';
        for (var i = txidBig.length - 2; i &gt;= 0; i-= 2) {
            txid += txidBig.substring(i, i + 2);
        }
        mockTx.txid = txid;

        mockTx.outputs.push({
            address: wallet.getPouchFold(COIN_BITCOIN).getCurrentChangeAddress(),
            addressIndex: wallet.getPouchFold(COIN_BITCOIN).getCurrentChangeIndex(),
            addressInternal: true,
            confirmations: 0,
            index: 0,
            spent: false,
            standard: true,
            timestamp: mockTx.timestamp,
            amount: (totalValue - transactionFee),
            txid: txid,
        });

        signedTransaction._kkMockTx = mockTx;

        callback(null, {
            signedTransaction: signedTransaction,
            totalValue: HDWalletHelper.convertSatoshisToBitcoins(totalValue),
            transactionFee: transactionFee,
        });
    }

    // btcRelays.getCurrentRelay().getUTXO(keypair.getAddress(), prepareTransaction); // Code for legacy relay system
    g_JaxxApp.getBitcoinRelays().getUTXO(keypair.getAddress(), prepareTransaction); // Code for new relay system

    console.log("bitcoin relay :: " + g_JaxxApp.getBitcoinRelays());

    return true;
}

HDWalletPouchBitcoin.prototype.fromChecksumAddress = function(address) {
    return address;
}

HDWalletPouchBitcoin.prototype.toChecksumAddress = function(address) {
    return address;
}

HDWalletPouchBitcoin.prototype.getBaseCoinAddressFormatType = function() {
    return this._baseFormatCoinType;
}

HDWalletPouchBitcoin.prototype.createTransaction = function(address, amount) {
    //@note: @here: this should check for address, amount validity.
    //@note: @todo: maybe a transaction queue?

    var transaction = this.buildBitcoinTransaction(address, amount);
    var miningFee = transaction ? HDWalletHelper.convertSatoshisToBitcoins(transaction._kkTransactionFee) : HDWalletHelper.convertSatoshisToBitcoins(this._pouchManager.getDefaultTransactionFee());

    //                console.log("transaction._kkTransactionFee :: " + transaction._kkTransactionFee);
    //                console.log("computedFee :: " + computedFee);

    return {transaction: transaction, miningFee: miningFee};
}
