var HDWalletPouchEthereum = function() {
    this._doDebug = true;

    this._pouchManager = null;

    this._ethAddressTypeMap = {};

    this._hasFinishedFinalBalanceUpdate = false;
    this._overrideIgnoreEtcEthSplit = false;

    this._baseFormatCoinType = COIN_ETHEREUM;
}

HDWalletPouchEthereum.uiComponents = {
    coinFullName: 'Ethereum',
    coinFullDisplayName: 'Ethereum',
    coinWalletSelector3LetterSymbol: 'ETH',
    coinSymbol: '\u039E',
    coinButtonSVGName: 'ether-new',
    coinLargePngName: '.imgETH',
    coinButtonName: '.imageLogoBannerETH',
    coinSpinnerElementName: '.imageEtherWash',
    coinDisplayColor: '#8890AF',
    csvExportField: '.backupPrivateKeyListETH',
    transactionsListElementName: '.transactionsEthereum',
    transactionTemplateElementName: '.transactionEthereum',
    accountsListElementName: '.accountDataTableEthereum',
    accountTemplateElementName: '.accountDataEthereum',
    displayNumDecimals: 6,
};

HDWalletPouchEthereum.pouchParameters = {
    coinHDType: 60,
    coinIsTokenSubtype: false,
    coinAbbreviatedName: 'ETH',
    isSingleToken: false,
    isTestnet: false,
};

HDWalletPouchEthereum.networkDefinitions = {
    mainNet: null,
    testNet: null,
}

HDWalletPouchEthereum.getCoinAddress = function(node) {
    //        console.log("[ethereum] node :: " + node);
    var ethKeyPair = node.keyPair;
    //        console.log("[ethereum] keyPair :: " + ethKeyPair.d + " :: " + ethKeyPair.__Q);

    var prevCompressed = ethKeyPair.compressed;
    ethKeyPair.compressed = false;

    var ethKeyPairPublicKey = ethKeyPair.getPublicKeyBuffer();

    var pubKeyHexEth = ethKeyPairPublicKey.toString('hex').slice(2);

    var pubKeyWordArrayEth = thirdparty.CryptoJS.enc.Hex.parse(pubKeyHexEth);

    var hashEth = thirdparty.CryptoJS.SHA3(pubKeyWordArrayEth, { outputLength: 256 });

    var addressEth = hashEth.toString(thirdparty.CryptoJS.enc.Hex).slice(24);

    ethKeyPair.compressed = prevCompressed;

    //        console.log("[ethereum]&nbsp;address :: " + addressEth);
    return "0x" + addressEth;
}

HDWalletPouchEthereum.prototype.convertFiatToCoin = function(fiatAmount, coinUnitType) {
    var coinAmount = 0;

    var wei = wallet.getHelper().convertFiatToWei(fiatAmount);
    coinAmount = (coinUnitType === COIN_UNITLARGE) ? HDWalletHelper.convertWeiToEther(wei) : wei;

    return coinAmount;
}

HDWalletPouchEthereum.prototype.initialize = function(pouchManager) {
    this._pouchManager = pouchManager;
}


HDWalletPouchEthereum.prototype.shutDown = function() {
    for (var i = 0; i &lt; CoinToken.numCoinTokens; i++) {
        if (typeof(this._pouchManager._token[i]) === 'undefined' ||
            this._pouchManager._token[i] === null) {
            continue;
        }

        this._pouchManager._token[i].shutDown();
    }
}

HDWalletPouchEthereum.prototype.setup = function() {
    this.setupTokens();
}

HDWalletPouchEthereum.prototype.setupTokens = function() {
    for (var i = 0; i &lt; CoinToken.numCoinTokens; i++) {
        this._pouchManager._token[i] = new CoinToken();
    }

    var baseReceiveAddress = HDWalletPouch.getCoinAddress(this._pouchManager._coinType, HDWalletPouch._derive(this._pouchManager._receiveNode, 0, false)).toString();

    var theDAODefaultGasLimit = HDWalletPouch.getStaticCoinPouchImplementation(COIN_THEDAO_ETHEREUM).getDefaultGasLimit();

    this._pouchManager._token[CoinToken.TheDAO].initialize("TheDAO", "DAO", CoinToken.TheDAO, baseReceiveAddress, this._pouchManager, HDWalletHelper.getDefaultEthereumGasPrice(), theDAODefaultGasLimit, this._pouchManager._storageKey);

    var augurDefaultGasLimit = HDWalletPouch.getStaticCoinPouchImplementation(COIN_AUGUR_ETHEREUM).getDefaultGasLimit();

    this._pouchManager._token[CoinToken.Augur].initialize("Augur", "AUG", CoinToken.Augur, baseReceiveAddress, this._pouchManager, HDWalletHelper.getDefaultEthereumGasPrice(), augurDefaultGasLimit, this._pouchManager._storageKey);

    this.updateTokenAddresses(this._pouchManager._w_addressMap);
}

HDWalletPouchEthereum.prototype.log = function(logString) {
    if (this._doDebug === false) {
        return;
    }

    var args = [].slice.call(arguments);
    args.unshift('EthereumPouchLog:');
    console.log(args);
}

HDWalletPouchEthereum.prototype.updateMiningFees = function() {
}

HDWalletPouchEthereum.prototype.updateTransactionsFromWorker = function(txid, transactions) {
    //                                                        console.log("wallet worker update :: eth tx :: " + Object.keys(transactions).length);
    //                            console.log("incoming eth tx :: " + JSON.stringify(transaction) + " :: " + txid);

    this._pouchManager._largeQrCode = null;
    this._pouchManager._smallQrCode = null;

    return false;
}

HDWalletPouchEthereum.prototype.getTransactions = function() {
    var res = [];

    //        console.log("this._transactions length :: " + Object.keys(this._transactions).length);
    for (var txid in this._pouchManager._transactions) {
//                    console.log("adding tx :: " + txid)
        res.push(this._pouchManager._transactions[txid]);
    }

    res.sort(function (a, b) {
        var deltaTimeStamp = (b.timestamp - a.timestamp);
        if (deltaTimeStamp) { return deltaTimeStamp; }
        return (a.confirmations - b.confirmations);
    });

    return res;
}

HDWalletPouchEthereum.prototype.calculateHistoryforTransaction = function(transaction) {
    //            console.log("A :: ethereum transaction :: " + JSON.stringify(transaction));
    if (typeof(transaction.addressIndex) !== 'undefined' &amp;&amp; transaction.addressIndex !== null) {
        //                console.log("B :: ethereum transaction :: " + JSON.stringify(transaction));

        var toAddress = "";
        var toAddressFull = "";

        var valueDelta = thirdparty.web3.fromWei(transaction.valueDelta);
        var valueDAO = 77777; // Need transaction.txid --&gt; address from DAOhub

        if (this.isAddressFromSelf(transaction.to)) {
            toAddress = "Self";
            toAddressFull = "Self"
        } else {
            toAddress = transaction.to.substring(0, 7) + '...' + transaction.to.substring(transaction.to.length - 5);
            toAddressFull = transaction.to;
            if (transaction.from === 'GENESIS') {
                toAddress = transaction.from;
            }

        }

        var gasCost = thirdparty.web3.fromWei(transaction.gasUsed * transaction.gasPrice);

        var newHistoryItem = {
            toAddress: toAddress,
            toAddressFull: toAddressFull,
            blockNumber: transaction.blockNumber,
            confirmations: transaction.confirmations,
            deltaBalance: valueDelta,
            deltaDAO: valueDAO,
            gasCost: gasCost,
            timestamp: transaction.timestamp,
            txid: transaction.txid
        };

        return newHistoryItem;
    } else {
        console.log("error :: undetermined transaction :: " + JSON.stringify(transaction));

        return null;
    }
}

HDWalletPouchEthereum.prototype.getPouchFoldBalance = function() {
    var balance = 0;

    var highestIndexToCheck = this._pouchManager.getHighestReceiveIndex();

    highestIndexToCheck++; //@note: @here: check for internal transaction balances on current receive account.

    if (highestIndexToCheck !== -1) {

        for (var i = 0; i &lt; highestIndexToCheck + 1; i++) {
            var curBalance = this.getAccountBalance(false, i);
            balance += curBalance;
        }
    }

    return balance;
}

HDWalletPouchEthereum.prototype.getAccountBalance = function(internal, index) {
    var accountBalance = 0;

    //@note: @here: @todo: consider changing this to a class function
    var publicAddress = this._pouchManager.getPublicAddress(internal, index);

    //@note: for ethereum checksum addresses.
    publicAddress = publicAddress.toLowerCase();

    var addressInfo = this._pouchManager._w_addressMap[publicAddress];

    //        console.log("publicAddress :: " + publicAddress);
    //        if (publicAddress == "0x8e63e85adebcdb448bb93a2f3bd00215c1cbaec4") {
    //            console.log("internal :: " + internal + " :: index :: " + index + " :: publicAddress :: " + publicAddress + " :: info :: " + JSON.stringify(addressInfo) + " :: _w_addressMap :: " + JSON.stringify(this._w_addressMap));
    //
    //        }

    if (typeof(addressInfo) !== 'undefined' &amp;&amp; addressInfo !== null) {
        //            console.log("publicAddress :: " + publicAddress + " :: balance :: " + addressInfo.accountBalance);
        accountBalance = addressInfo.accountBalance;
    }

    return accountBalance;
}

HDWalletPouchEthereum.prototype.getSpendableBalance = function(minimumValue, customGasLimit) {
    var spendableDict = {spendableBalance: 0,
                         numPotentialTX: 0,
                         addressesSpendable: {},
                        };

    var spendableBalance = 0;
    var numPotentialTX = 0;

    //        console.log("types :: " + typeof(this._helper.getCustomEthereumGasLimit()) + " :: " + typeof(HDWalletHelper.getDefaultEthereumGasPrice()));
    //        console.log("spendable :: custom gas limit :: " + this._helper.getCustomEthereumGasLimit() + " :: default gas price :: " + HDWalletHelper.getDefaultEthereumGasPrice());

    var customEthereumGasLimit = -1;

    if (typeof(customGasLimit) === 'undefined' || customGasLimit === null) {
        customEthereumGasLimit = this._pouchManager._helper.getCustomEthereumGasLimit();
    } else {
        customEthereumGasLimit = customGasLimit;
    }

    var baseTXCost = customEthereumGasLimit.mul(HDWalletHelper.getDefaultEthereumGasPrice()).toNumber();

    var totalTXCost = 0;

    //@note: returns {index: x, balance: y} format.
    var highestAccountDict = this._pouchManager.getHighestAccountBalanceAndIndex();
    if (highestAccountDict !== null) {
        for (var i = 0; i &lt; this._pouchManager._sortedHighestAccountArray.length; i++) {
            var accountBalance = this._pouchManager._sortedHighestAccountArray[i].balance;

            //@note: check for account balance lower than the dust limit
            if (accountBalance &lt;= minimumValue + baseTXCost) {

            } else {
                spendableBalance += accountBalance - baseTXCost;
                numPotentialTX++;
                totalTXCost += baseTXCost;

                var accountIndex = this._pouchManager._sortedHighestAccountArray[i].index;

                var curAddress = this._pouchManager.getPublicAddress(false, accountIndex);
                spendableDict.addressesSpendable[curAddress.toLowerCase()] = accountBalance;
            }
        }
    }

    //        console.log("ethereum spendable :: " + spendableBalance + " :: totalTXCost :: " + totalTXCost + " :: " + numPotentialTX + " :: minimumValue :: " + minimumValue);

    spendableDict.spendableBalance = spendableBalance;
    spendableDict.numPotentialTX = numPotentialTX;

    return spendableDict;
}

HDWalletPouchEthereum.prototype.updateTokenAddresses = function(addressMap) {
    var transferableMap = {};
    var votableMap = {};

    //    console.log("[" + this._coinFullName + "] :: updating token addresses");

    //@note: this tokenTransferableList is null right now, most likely to be extended with DGX tokens and so on.
    for (var publicAddress in addressMap) {
        var addressInfo = addressMap[publicAddress];

        //    console.log("internal :: " + internal + " :: index :: " + index + " :: publicAddress :: " + publicAddress + " :: info :: " + JSON.stringify(addressInfo) + " :: _w_addressMap :: " + JSON.stringify(this._w_addressMap));

        if (typeof(addressInfo) !== 'undefined' &amp;&amp; addressInfo !== null) {
            //            console.log("adding :: " + publicAddress + " :: to :: " + addressInfo.tokenTransferableList + " :: " + addressInfo.tokenVotableList);
            transferableMap[publicAddress] = addressInfo.tokenTransferableList;
            votableMap[publicAddress] = addressInfo.tokenVotableList;
        }
    }

    //@note: update for getting the first dao address correctly updating.


    var firstPublicAddress = this._pouchManager.getPublicAddress(false, 0).toLowerCase();
    //    console.log("[The DAO] :: transfer list :: firstPublicAddress :: " + firstPublicAddress);

    if (typeof(transferableMap[firstPublicAddress]) === 'undefined' || transferableMap[firstPublicAddress] === null) {
        transferableMap[firstPublicAddress] = true;
    }

    for (var i = 0; i &lt; CoinToken.numCoinTokens; i++) {
        if (typeof(this._pouchManager._token[i]) === 'undefined' ||
            this._pouchManager._token[i] === null) {
            continue;
        }

        var tokenTransferableArray = [];
        var tokenVotableArray = [];

        //@note: tokens are transferable by default. however, if they are explicitly marked as not transferable, respect that.
        for (publicAddress in transferableMap) {
            var curTransferableToken = transferableMap[publicAddress];
            if ((typeof(curTransferableToken) !== undefined &amp;&amp; curTransferableToken !== null &amp;&amp; curTransferableToken !== false) || (typeof(curTransferableToken) === undefined || curTransferableToken === null))  {
                //                console.log("adding :: " + publicAddress + " :: to transferableMap");
                tokenTransferableArray.push(publicAddress);
            }
        }

        //@note: tokens are not votable by default.
        for (publicAddress in votableMap) {
            var curVotableToken = votableMap[publicAddress];
            if (typeof(curVotableToken) !== undefined &amp;&amp; curVotableToken !== null &amp;&amp; curVotableToken === true) {
                tokenVotableArray.push(publicAddress);
            }
        }

        //        console.log("transferable :: " + JSON.stringify(tokenTransferableArray) + " :: " + JSON.stringify(tokenVotableArray));

        this._pouchManager._token[i].setIsTransferable(tokenTransferableArray);
        this._pouchManager._token[i].setIsVotable(tokenVotableArray);
    }
}

HDWalletPouchEthereum.prototype.getEthereumNonce = function(internal, index) {
    if (typeof(index) === 'undefined' || index === null) {
        console.log("error :: getEthereumNonce :: index undefined or null");
        return -1;
    }

    var fromAddress = HDWalletPouch.getCoinAddress(this._pouchManager._coinType, this._pouchManager.getNode(internal, index));

    var transactions = this.getTransactions(); //Get all transactions

    var txDict = {};
    var highestNonce = 0;
    for (var ti = 0; ti &lt; transactions.length; ti++) { //iterate through txs
        var transaction = transactions[ti];
        if (transaction.from === fromAddress) {
            txDict[transaction.txid] = true;
            //@note: @here: @bug: for address 0x5630a246f35996a1d605174d119ece78c8f5d94a,
            //it appears that there are 8 tx when doing it the following way, which is wrong. getTransactions only has 6 identifiers.
//            console.log("fromAddress :: " + fromAddress + " :: found tx :: " + JSON.stringify(transaction.txid));
            //            highestNonce++;
        }
    }

    highestNonce = Object.keys(txDict).length;

//    self.log("getEthereumNonce :: fromAddress :: " + fromAddress + " :: highestNonce :: " + highestNonce);
    //    if (internal === false) {
    //        internal = 0;
    //    } else if (internal === true) {
    //        internal = 1;
    //    }
    //
    //    var publicAddress = this.getPublicAddress(internal, index);
    //
    //    //@note: for ethereum checksum addresses.
    //    publicAddress = publicAddress.toLowerCase();
    //
    //    var addressInfo = this._w_addressMap[publicAddress];
    //
    //    var nonce = 0;
    //
    //    if (typeof(addressInfo) !== 'undefined' &amp;&amp; addressInfo !== null) {
    //        nonce = addressInfo.nonce;
    //
    //        //        console.log("publicAddress :: " + publicAddress + " :: info :: " + JSON.stringify(addressInfo));
    //    }
    //
    return highestNonce;
}

HDWalletPouchEthereum.prototype._buildEthereumTransaction = function(fromNodeInternal, fromNodeIndex, toAddress, amount_smallUnit, ethGasPrice, ethGasLimit, ethData, doNotSign) {
    var gasPrice = HDWalletHelper.hexify(ethGasPrice);
    var gasLimit = HDWalletHelper.hexify(ethGasLimit);

    var fromAddress = HDWalletPouch.getCoinAddress(this._pouchManager._coinType, this._pouchManager.getNode(fromNodeInternal, fromNodeIndex));

    this.log("ethereum :: from address :: " + fromAddress);

    var nonce = this.getEthereumNonce(fromNodeInternal, fromNodeIndex);

    this.log("ethereum :: build tx nonce :: " + nonce + " :: gasPrice :: " + ethGasPrice + " :: gasLimit :: " + ethGasLimit);

    var rawTx = {
        nonce: HDWalletHelper.hexify(nonce),
        gasPrice: gasPrice,
        gasLimit: gasLimit,
        to: toAddress,
        value: HDWalletHelper.hexify(amount_smallUnit),
        //data: '',
    };

    if (ethData &amp;&amp; typeof(ethData) !== 'undefined') {
        rawTx.data = ethData;
    }

    var transaction = new thirdparty.ethereum.tx(rawTx);
    //    console.log("ethereum buildTransaction :: " + JSON.stringify(transaction));

    //    var privateKeyB = new thirdparty.Buffer.Buffer('e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109', 'hex')
    //
    //    console.log("private key :: " + this._private + " :: " +  + this._private.length + " :: privateKeyB :: " + privateKeyB + " :: " + privateKeyB.length);

    if (typeof(doNotSign) !== 'undefined' || (doNotSign !== null &amp;&amp; doNotSign !== false)) {
        var pvtKeyBuffer = new Buffer(this._pouchManager.getPrivateKey(fromNodeInternal, fromNodeIndex).d.toBuffer(32), 'hex');
        //        console.log(pvtKeyBuffer.length);
        //        console.log(this.getPrivateKey(fromNodeInternal, fromNodeIndex));
        transaction.sign(pvtKeyBuffer);
    }


    var txhash = ('0x' + transaction.hash().toString('hex'));

    var publicAddress = this._pouchManager.getPublicAddress(fromNodeInternal, fromNodeIndex);

    //@note: ethereum checksum addresses.
    publicAddress = publicAddress.toLowerCase();

    transaction._mockTx = {
        txid: txhash,
        addressInternal: fromNodeInternal,
        addressIndex: fromNodeIndex,
        blockNumber: null,
        //@note:@here:@todo:
        confirmations: 0,
        from: publicAddress,
        hash: txhash,
        timestamp: (new Date()).getTime() / 1000,
        to: toAddress,
        gasPrice: ethGasPrice,
        gasUsed: ethGasLimit,
        nonce: nonce,
        valueDelta: -amount_smallUnit,
    };

    return transaction;
}

HDWalletPouchEthereum.prototype.buildEthereumTransactionList = function(toAddressArray, amount_smallUnit, gasPrice, gasLimit, ethData, doNotSign) {
    var amountWei = parseInt(amount_smallUnit);

    var txArray = [];

    //@note: @here: @todo: add custom contract support when merging into the develop branch.
    var baseTXCost = gasPrice * gasLimit;

    var totalTXCost = 0;

    //@note: returns {index: x, balance: y} format.
    var highestAccountDict = this._pouchManager.getHighestAccountBalanceAndIndex();

    if (highestAccountDict !== null) {
        //@note: check to see whether this will result in the tx being able to be pushed through with this one account, or whether there will need to be more than one account involved in this transaction.
        if (amountWei + baseTXCost &lt;= highestAccountDict.balance) {
            totalTXCost = baseTXCost;

            this.log("ethereum transaction :: account :: " + highestAccountDict.index + " :: " + highestAccountDict.balance + " :: can cover the entire balance + tx cost :: " + (amountWei + baseTXCost));
            var newTX = this._buildEthereumTransaction(false, highestAccountDict.index, toAddressArray[0], amountWei, gasPrice, gasLimit, ethData, doNotSign);

            if (!newTX) {
                this.log("error :: ethereum transaction :: account failed to build :: " + highestAccountDict.index);
                return null;
            } else {
                txArray.push(newTX);
            }
        } else {
            var txSuccess = true;

            var balanceRemaining = amountWei;

            //@note: this array is implicitly regenerated and sorted when the getHighestAccountBalanceAndIndex function is called.
            for (var i = 0; i &lt; this._pouchManager._sortedHighestAccountArray.length; i++) {
                this.log("ethereum transaction :: balanceRemaining (pre) :: " + balanceRemaining);
                //                console.log(typeof(this._sortedHighestAccountArray[i].balance));
                var accountBalance = this._pouchManager._sortedHighestAccountArray[i].balance;

                //@note: if the account cannot support the base tx cost + 1 wei (which might be significantly higher in the case of a contract address target), this process cannot continue as list is already sorted, and this transaction cannot be completed.
                if (accountBalance &lt;= baseTXCost) {
                    this.log("ethereum transaction :: account :: " + this._pouchManager._sortedHighestAccountArray[i].index + " cannot cover current dust limit of :: " + baseTXCost);
                    txSuccess = false;
                    break;
                } else {
                    var amountToSendFromAccount = 0;

                    //debug amounts: 0.0609500024691356
                    //0.0518500024691356
                    //0.052 total

                    //@note: check if subtracting the balance of this account from the remaining target transaction balance will result in exactly zero or a positive balance for this account.
                    if (accountBalance - balanceRemaining - baseTXCost &lt; 0) {
                        //@note: this account doesn't have enough of a balance to cover by itself.. keep combining.
                        this.log("ethereum transaction :: account :: " + this._pouchManager._sortedHighestAccountArray[i].index + " :: does not have enough to cover balance + tx cost :: " + (balanceRemaining + baseTXCost) + " :: accountBalance - tx cost :: " + (accountBalance - baseTXCost));

                        amountToSendFromAccount = (accountBalance - baseTXCost);
                    } else {
                        var accountChange = accountBalance - balanceRemaining - baseTXCost;
                        //                        console.log("types :: " + typeof(balanceRemaining) + " :: " + typeof(baseTXCost));
                        amountToSendFromAccount = balanceRemaining;
                        this.log("ethereum transaction :: account :: " + this._pouchManager._sortedHighestAccountArray[i].index + " :: accountBalance :: " + accountBalance + " :: account balance after (balance + tx cost) :: " + accountChange);

                        //@note: don't do things like bitcoin's change address system for now.
                    }

                    //@note: build this particular transaction, make sure it's constructed correctly.

                    var targetEthereumAddress = toAddressArray[0];

                    if (i &gt;= toAddressArray.length) {

                    } else {
                        targetEthereumAddress = toAddressArray[i];
                    }

                    this.log("ethereum transaction :: account :: " + this._pouchManager._sortedHighestAccountArray[i].index + " :: will send  :: " + amountToSendFromAccount + " :: to :: " + targetEthereumAddress);


                    var newTX = this._buildEthereumTransaction(false, this._pouchManager._sortedHighestAccountArray[i].index, targetEthereumAddress, amountToSendFromAccount, gasPrice, gasLimit, ethData, doNotSign);

                    if (!newTX) {
                        this.log("error :: ethereum transaction :: account :: " + this._pouchManager._sortedHighestAccountArray[i].index + " cannot build");

                        txSuccess = false;
                        break;
                    } else {
                        txArray.push(newTX);
                    }

                    //@note: keep track of the total TX cost for user review on the UI side.
                    totalTXCost += baseTXCost;

                    this.log("ethereum transaction :: current total tx cost :: " + totalTXCost);

                    //note: subtract the amount sent from the balance remaining, and check whether there's zero remaining.
                    balanceRemaining -= amountToSendFromAccount;

                    this.log("ethereum transaction :: balanceRemaining (post) :: " + balanceRemaining);

                    if (balanceRemaining &lt;= 0) {
                        this.log("ethereum transaction :: finished combining :: number of accounts involved :: " + txArray.length + " :: total tx cost :: " + totalTXCost);
                        break;
                    } else {
                        //@note: otherwise, there's another transaction necessary so increase the balance remaining by the base tx cost.
                        //                        balanceRemaining += baseTXCost;
                    }
                }
            }

            if (txSuccess === false) {
                this.log("ethereum transaction :: txSuccess is false");
                return null;
            }
        }

        //@note: ethereum will calculate it's own transaction fee inside of _buildTransaction.
        if (txArray.length &gt; 0) {
            return {txArray: txArray, totalTXCost: totalTXCost};
        } else {
            this.log("ethereum transaction :: txArray.length is zero");
            return null;
        }
    } else {
        this.log("ethereum transaction :: no accounts found");
        return null;
    }
}

HDWalletPouchEthereum.prototype.getIsTheDAOAssociated = function(internal, index) {
    var publicAddress = this._pouchManager.getPublicAddress(internal, index);

    //@note: for ethereum checksum addresses.
    publicAddress = publicAddress.toLowerCase();

    var addressInfo = this._pouchManager._w_addressMap[publicAddress];

    if (typeof(addressInfo) !== 'undefined' &amp;&amp; addressInfo !== null) {
        //        console.log("publicAddress :: " + publicAddress + " :: isTheDAOAssociated :: " + addressInfo.isTheDAOAssociated);
        if (addressInfo.isTheDAOAssociated === true) {
            return true;
        }
    }

    return false;
}

HDWalletPouchEthereum.prototype.getIsAugurAssociated = function(internal, index) {
    var publicAddress = this._pouchManager.getPublicAddress(internal, index);

    //@note: for ethereum checksum addresses.
    publicAddress = publicAddress.toLowerCase();

    var addressInfo = this._pouchManager._w_addressMap[publicAddress];

    if (typeof(addressInfo) !== 'undefined' &amp;&amp; addressInfo !== null) {
        //        console.log("publicAddress :: " + publicAddress + " :: isTheDAOAssociated :: " + addressInfo.isTheDAOAssociated);
        if (addressInfo.isAugurAssociated === true) {
            return true;
        }
    }

    return false;
}

HDWalletPouchEthereum.prototype.getAccountList = function(transactions) {
    var result = [];

    var lastIndexChange = 0;
    var lastIndexReceive = 0;

    for (var ti = 0; ti &lt; transactions.length; ti++) { //iterate through txs
        var transaction = transactions[ti];


        //            console.log("tx :: " + JSON.stringify(transaction));

        //@note: for ether, we're using a similar method, checking out the address map for a to: equivalence.
        if (transaction.addressIndex !== null) {
            if (!transaction.addressInternal) {
                if (transaction.addressIndex &gt; lastIndexReceive) {
                    lastIndexReceive = transaction.addressIndex;
                }
                var account = {};
                account.pvtKey = this._pouchManager.getPrivateKey(false, transaction.addressIndex).d.toBuffer(32).toString('hex');
                account.pubAddr = this._pouchManager.getPublicAddress(false, transaction.addressIndex);
                account.balance = this.getAccountBalance(false, transaction.addressIndex);
                account.isTheDAOAssociated = this.getIsTheDAOAssociated(false, transaction.addressIndex);
                account.isAugurAssociated = this.getIsAugurAssociated(false, transaction.addressIndex);

                result.push(account);
            }
        }
    }


    var finalIndex = 0;

    if (result.length === 0) {
        finalIndex = 0;
    } else {
        finalIndex = lastIndexReceive + 1;
    }
    var account = {};
    account.pvtKey = this._pouchManager.getPrivateKey(false, finalIndex).d.toBuffer(32).toString('hex');
    account.pubAddr = this._pouchManager.getPublicAddress(false, finalIndex);
    account.balance = this.getAccountBalance(false, finalIndex);
    account.isTheDAOAssociated = this.getIsTheDAOAssociated(false, i);
    account.isAugurAssociated = this.getIsAugurAssociated(false, i);

    result.push(account);

    return result;
}

HDWalletPouchEthereum.prototype.getAllAccountBalancesDict = function(transactions) {
    var result = {};

    var lastIndexChange = 0;
    var lastIndexReceive = 0;

    for (var ti = 0; ti &lt; transactions.length; ti++) { //iterate through txs
        var transaction = transactions[ti];


        //            console.log("tx :: " + JSON.stringify(transaction));

        //@note: for ether, we're using a similar method, checking out the address map for a to: equivalence.
        if (transaction.addressIndex !== null) {
            if (!transaction.addressInternal) {
                if (transaction.addressIndex &gt; lastIndexReceive) {
                    lastIndexReceive = transaction.addressIndex;
                }

                var pubAddr = this._pouchManager.getPublicAddress(false, transaction.addressIndex);

                var newResult = {};
                newResult.balance = this.getAccountBalance(false, transaction.addressIndex);

                result[pubAddr] = newResult;
            }
        }
    }


    var finalIndex = 0;

    if (result.length === 0) {
        finalIndex = 0;
    } else {
        finalIndex = lastIndexReceive + 1;
    }

    var pubAddr = this._pouchManager.getPublicAddress(false, finalIndex);

    var newResult = {};
    newResult.balance = this.getAccountBalance(false, finalIndex);

    result[pubAddr] = newResult;

    return result;
}

HDWalletPouchEthereum.prototype.generateQRCode = function(largeFormat, coinAmountSmallType) {
    var curRecAddr = this._pouchManager.getCurrentReceiveAddress();

    var uri = "iban:" + HDWalletHelper.getICAPAddress(curRecAddr);

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

//@note: this function when passed in an explicit null to ignoreCached, will use cache. cached only in session.
HDWalletPouchEthereum.prototype.isAddressFromSelf = function(addressToCheck, ignoreCached) {
    var isSelfAddress = false;

    //@note: for ethereum checksum addresses.
    addressToCheck = addressToCheck.toLowerCase();

    var key = addressToCheck;
    var isSelfAddress = this._pouchManager._checkAddressCache[key];

    if (typeof(isSelfAddress) === 'undefined' || isSelfAddress === null || typeof(ignoreCached) !== 'undefined') {
        var highestIndexToCheck = this._pouchManager.getHighestReceiveIndex();

        if (highestIndexToCheck !== -1) {
            for (var i = 0; i &lt; highestIndexToCheck + 1; i++) {
                var curAddress = this._pouchManager.getPublicAddress(false, i);

                //@note: for ethereum checksum addresses.
                curAddress = curAddress.toLowerCase();

                //            console.log("addressToCheck :: " + addressToCheck + " :: curAddress :: " + curAddress);
                if (curAddress === addressToCheck) {
                    //                    console.log("addressToCheck :: " + addressToCheck + " :: curAddress :: " + curAddress);
                    isSelfAddress = true;
                    break;
                }
            }
        }

        //        console.log("addressToCheck :: " + addressToCheck + " :: curAddress :: " + curAddress + " :: " + isSelfAddress);

        if (typeof(ignoreCached) === 'undefined') {
            //            console.log("caching isAddressFromSelf :: " + addressToCheck + " :: " + key + " :: " + isSelfAddress);
            this._pouchManager._checkAddressCache[addressToCheck] = isSelfAddress;
            //            console.log("caching isAddressFromSelf :: " +  this._checkAddressCache[addressToCheck]);
        } else {
            self.log("uncached");
        }
    } else {
        //        console.log("fetching cached isAddressFromSelf :: " + addressToCheck + " :: key :: " + key + " :: " + isSelfAddress);
    }

    return isSelfAddress;
}

HDWalletPouchEthereum.prototype.sendEthereumTransaction = function(transaction, callback, params, debugIdx) {
    //@note:@todo:@next:
    var hex = '0x' + transaction.serialize().toString('hex');

    //    console.log("send transaction :: " + JSON.stringify(transaction));
    //
    //    callback('success', null, params);
    //
    //    return;
    //
    var self = this;

    var networkParams = HDWalletPouch.getStaticCoinWorkerImplementation(COIN_ETHEREUM).networkParams;

    var requestUrl = networkParams['static_relay_url'] + networkParams['send_tx'] + hex + networkParams['send_tx_append'];

    $.getJSON(requestUrl, function (data) {
        self._pouchManager.invalidateTransactionCache();
        self._pouchManager.invalidateWorkerCache();

        if (!data || !data.result || data.result.length !== 66) {
            self.log('Error sending', data, " :: " + debugIdx + " :: " + JSON.stringify(transaction) + " :: hex :: " + hex);

            if (callback) {
                var message = 'An error occurred';
                if (data &amp;&amp; data.error &amp;&amp; data.error.message) {
                    message = data.error.message;
                }

                callback(new Error(message), null, params);
                delete self._pouchManager._transactions[transaction._mockTx.hash + "_" + transaction._mockTx.from];

                //@note: reverse the mock transaction update.
                var addressInfo = self._pouchManager._w_addressMap[transaction._mockTx.from];
                if (typeof(addressInfo) !== 'undefined') {
                    var txCostPlusGas = transaction._mockTx.valueDelta - (transaction._mockTx.gasUsed * transaction._mockTx.gasPrice);

                    addressInfo.accountBalance -= txCostPlusGas;
                    addressInfo.nonce--;
                    addressInfo.newSendTx = null;
                    delete addressInfo.accountTXProcessed[transaction._mockTx.hash];
                } else {
                    self.log("sendEthereumTransaction error :: addressInfo undefined")
                }

                if (self._pouchManager._worker) {
                    self._pouchManager._worker.postMessage({
                        action: 'updateAddressMap',
                        content: {
                            addressMap: self._pouchManager._w_addressMap
                        }
                    });
                }
            }
        } else {
            self.log('Success sending', data, " :: " + debugIdx + " :: " + JSON.stringify(transaction) + " :: hex :: " + hex);

            if (callback) {
                callback('success', data.result, params);
            }

            self._pouchManager._transactions[transaction._mockTx.hash + "_" + transaction._mockTx.from] = transaction._mockTx;

            var addressInfo = self._pouchManager._w_addressMap[transaction._mockTx.from];
            if (typeof(addressInfo) !== 'undefined' &amp;&amp; addressInfo !== null) {
                //@note: sending from and to self, total balance = 0
                if (self.isAddressFromSelf(transaction._mockTx.to)) {
                } else {
                }

                var txCostPlusGas = transaction._mockTx.valueDelta - (transaction._mockTx.gasUsed * transaction._mockTx.gasPrice);

                addressInfo.accountBalance += txCostPlusGas;
                addressInfo.nonce++;

                addressInfo.accountTXProcessed[transaction._mockTx.hash] = true;
                addressInfo.newSendTx = true;
            } else {
                console.log("sendEthereumTransaction success :: addressInfo undefined")
            }

            if (self._pouchManager._worker) {
                self._pouchManager._worker.postMessage({
                    action: 'updateAddressMap',
                    content: {
                        addressMap: self._w_addressMap
                    }
                });
            }

            self._pouchManager._notify();
        }
    });
}

HDWalletPouchEthereum.prototype.afterWorkerCacheInvalidate = function() {
    this._pouchManager.sortHighestAccounts();
}

HDWalletPouchEthereum.prototype.requestBlockNumber = function(callback) {
    var self = this;

    var networkParams = HDWalletPouch.getStaticCoinWorkerImplementation(COIN_ETHEREUM).networkParams;

    var requestUrl = networkParams['static_relay_url'] + networkParams['block_number'];

    $.getJSON(requestUrl, function (data) {
        if (!data || !data.result) {
            if (self._pouchManager._currentBlock === -1) {
                self._pouchManager._currentBlock = 0;
            };

            var errStr = "HDWalletPouchEthereum :: requestBlockNumber :: no data from api server";
            callback(errStr);
            return;
        }

        self._pouchManager._currentBlock = parseInt(data.result, 16);

        callback(null);
    });
}

HDWalletPouchEthereum.prototype.prepareSweepTransaction = function(privateKey, callback) {
    var signedTransaction;
    var totalValue;

    //Make buffer of privatekey
    var privateKeyToSweep = new thirdparty.Buffer.Buffer(privateKey, 'hex');

    //Derive address from private key -----
    var ethAddressToSweep = HDWalletHelper.getEthereumAddressFromKey(privateKeyToSweep);

    //Query etherscan for balance ---------
    var weiBalance = 0;

    //@note: @todo: @here: @relay: relays for ethereum
    RequestSerializer.getJSON('https://api.etherscan.io/api?module=account&amp;action=balance&amp;address=' + ethAddressToSweep + '&amp;tag=latest', function (dataBalance) {
        if (!dataBalance || dataBalance.status != 1 ) {
            console.log('Failed to get balance for '+ethAddressToSweep+ ' ; dataBalance:'+dataBalance);
            callback(new Error('Error: while getting balance'), null);
        }
        weiBalance = dataBalance.result;
        var gasPrice = HDWalletHelper.getDefaultEthereumGasPrice();
        var gasLimit = HDWalletHelper.getDefaultEthereumGasLimit();
        var spendableWei = weiBalance - gasPrice.mul(gasLimit).toNumber();

        //        console.log("weiBalance :: " + weiBalance + " :: gasPrice :: " + gasPrice + " + :: gasLimit :: " + gasLimit + " :: spendableWei :: " + spendableWei);

        if(spendableWei &lt;= 0){
            console.log('Nothing to sweep');
            callback(null, null);
            return;
        }

        //Get all tx associated to account ---
        var txHist =  {};

        RequestSerializer.getJSON('https://api.etherscan.io/api?module=account&amp;action=txlist&amp;address=' + ethAddressToSweep + '&amp;sort=asc', function (dataTx) {
            if (!dataTx || dataTx.status != 1 ) {
                console.log('Failed to get txList for '+ethAddressToSweep+ ' ; dataTx:'+dataTx);
                callback(new Error('Error: while getting txlist'), null);
            }

            for (var i = 0; i &lt; dataTx.result.length; i++) {
                var tx = dataTx.result[i];
                txHist[tx.hash] = tx;
            }

            //Compute nonce -----------------------
            //As an alternative we could use this entry point https://etherchain.org/api/account/&lt;address&gt;/nonce

            var nonce = 0;
            for (var txid in txHist) {
                var tx = txHist[txid];
                if (tx.from === ethAddressToSweep) {
                    nonce++;
                }
            }

            //create a signed tx ------------------

            var rawSweepTx = {
                nonce: HDWalletHelper.hexify(nonce),
                gasPrice: HDWalletHelper.hexify(gasPrice),
                gasLimit: HDWalletHelper.hexify(gasLimit),
                to: wallet.getPouchFold(COIN_ETHEREUM).getPublicAddress(),
                value: HDWalletHelper.hexify(spendableWei),
            };

            //@note:@todo:@here:
            var sweepTransaction = new thirdparty.ethereum.tx(rawSweepTx);

            sweepTransaction.sign(privateKeyToSweep);

            sweepTransaction._mockTx = {
                blockNumber: null,
                confirmations: 0,
                from: ethAddressToSweep,
                hash: ('0x' + sweepTransaction.hash().toString('hex')),
                timestamp: (new Date()).getTime() / 1000,
                to: wallet.getPouchFold(COIN_ETHEREUM).getPublicAddress(),
                nonce: nonce,
                value: spendableWei,
            };

            totalValue = HDWalletHelper.convertWeiToEther(spendableWei);

            var hex = '0x' + sweepTransaction.serialize().toString('hex');

            //callback correct ------------------------
            callback(null, {
                signedTransaction: sweepTransaction,
                totalValue: totalValue,
                transactionFee: gasPrice,
            });

            return true;
        }); //End JSON call for TX list
    }); //End JSON call for balance
}

HDWalletPouchEthereum.prototype.fromChecksumAddress = function(address) {
    //@note: for ethereum checksum addresses.
    return address.toLowerCase();
}

HDWalletPouchEthereum.prototype.toChecksumAddress = function(address) {
    //@note: for ethereum checksum addresses.
    return HDWalletHelper.toEthereumChecksumAddress(address);
}

HDWalletPouchEthereum.prototype.hasCachedAddressAsContract = function(address) {
    if (this._ethAddressTypeMap[address]) {
        if (this._ethAddressTypeMap[address] === true) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

HDWalletPouchEthereum.prototype.checkIsSmartContractQuery = function(address, callback)
{
    if (this._ethAddressTypeMap[address]) {
        callback(null, this._ethAddressTypeMap[address]);
    }

    var self = this;

    var networkParams = HDWalletPouch.getStaticCoinWorkerImplementation(COIN_ETHEREUM).networkParams;

    var requestUrl = networkParams['static_relay_url'] + networkParams['smart_contract_code'] + address + networkParams['smart_contract_code_append'];

    RequestSerializer.getJSON(requestUrl, function (data) {
        if (!data) {
            var errStr = "failed to get address info from :: " + url + " :: " + data;
            callback(errStr, null);
        } else {
            //@note: contractCode here results in *only* "0x" if it's not a contract, and the full code if it is.
            var contractCode = data.result;
            if (contractCode === '0x') {
                self._ethAddressTypeMap[address] = false;
                callback(null, false);
            } else {
                self._ethAddressTypeMap[address] = true;
                callback(null, true);
            }
        }
    });
}

HDWalletPouchEthereum.prototype.processFinishedFinalBalanceUpdate = function() {
    this._hasFinishedFinalBalanceUpdate = true;

    if (g_JaxxApp.getSettings().getIgnoreEtcEthSplit() === true &amp;&amp; this._overrideIgnoreEtcEthSplit === false) {
        return;
    } else {
        this.checkForEtcEthSplit();
    }
}

HDWalletPouchEthereum.prototype.setupCheckForEtcEthSplit = function() {
    if (this._hasFinishedFinalBalanceUpdate !== true) {
        this._overrideIgnoreEtcEthSplit = true;
    } else {
        this.checkForEtcEthSplit();
    }
}

HDWalletPouchEthereum.prototype.checkForEtcEthSplit = function() {
    var self = this;

    var transactions = this.getTransactions(); //Get all transactions
    //@note: requires at least 1 wei over the custom gas limit for contracts.
    var ethSpendableDict = this.getSpendableBalance(1, requiredSplitContractCustomGasLimit);

    var requiredSplitContractCustomGasLimit = thirdparty.web3.toBigNumber(100000);


    var accounts = this.getAllAccountBalancesDict(transactions);

    var allAddresses = Object.keys(accounts);


    var batchSizeGatherEtc = allAddresses.length;


    var networkParams = HDWalletPouch.getStaticCoinWorkerImplementation(COIN_ETHEREUM_CLASSIC).networkParams;

    var etcAccounts = {numAccountsTotal: 0, numAccountsProcessed: 0, accounts: {}};

    //@note: this is the gas price * gas limit, such that the split contract can be run.

    var baseTXCost = requiredSplitContractCustomGasLimit.mul(HDWalletHelper.getDefaultEthereumGasPrice()).toNumber();

    var batch = [];
    while (allAddresses.length) {
        batch.push(allAddresses.shift());
        if (batch.length === this.batchSizeGatherEtc || allAddresses.length === 0) {

            var addressParam = batch.join(networkParams['joinParameters']);

            //            this.log("ethereum classic :: requesting :: " + addressParam);

            var requestURL = networkParams['static_relay_url'] + networkParams['multi_balance'] + addressParam + networkParams['multi_balance_append'];


            var passthroughParams = {batch: batch, etcAccounts: etcAccounts};

            etcAccounts.numAccountsTotal += batch.length;

            //@note: @here: @todo: sending batch is only necessary since we can only associate one
            //account at the moment.
            RequestSerializer.getJSON(requestURL, function(processorData, success, passthroughParams) {
                //                self.log("ethereum classic :: processorData :: " + JSON.stringify(data));

                if (!processorData) {
                    this.log("HDWalletPouchEthereum.processFinishedFinalBalanceUpdate :: error :: processorData is incorrect :: " + JSON.stringify(processorData) + " :: passthroughParams :: " + JSON.stringify(passthroughParams));
                    return;
                }

                var keysProcessed = Object.keys(processorData);

                passthroughParams.etcAccounts.numAccountsProcessed += keysProcessed.length;

                for (var curAddr in processorData) {
                    passthroughParams.etcAccounts.accounts[curAddr] = processorData[curAddr];
                }

                if (passthroughParams.etcAccounts.numAccountsTotal ===  passthroughParams.etcAccounts.numAccountsProcessed) {
                    self.determineEtcSplit(baseTXCost, passthroughParams.etcAccounts.accounts, ethSpendableDict.addressesSpendable);
                }
            }, null, passthroughParams);

            // Clear the batch
            batch = [];
        }
    }
}


HDWalletPouchEthereum.prototype.determineEtcSplit = function(baseTXCost, etcAccounts, ethSpendableAccounts) {
    var minimumEtcBalance = baseTXCost + 1;
//    console.log("baseTXCost :: " + baseTXCost);
//    console.log("etc balances :: " + JSON.stringify(etcAccounts));
//    console.log("eth balances :: " + JSON.stringify(ethSpendableAccounts));

    var balancesTransferrable = {};

    for (var curAddr in etcAccounts) {
        var etcBalance = etcAccounts[curAddr];
        var etcBalanceLarge = HDWalletHelper.convertWeiToEther(etcBalance);

        if (etcBalance &gt;= minimumEtcBalance) {
//            console.log("etc/eth split :: etc address :: " + curAddr + " has a splittable balance :: " + etcBalanceLarge);
            if (typeof(ethSpendableAccounts[curAddr]) !== 'undefined' &amp;&amp; ethSpendableAccounts[curAddr] !== null) {
                var ethBalance = ethSpendableAccounts[curAddr];

                if (ethBalance &gt;= etcBalance) {
                    var ethBalanceLarge = HDWalletHelper.convertWeiToEther(ethBalance);

//                    console.log("[etc/eth split :: eth address :: " + curAddr + " has a splittable balance :: " + ethBalanceLarge + "]");

                    balancesTransferrable[curAddr] = {small: etcBalance, large: etcBalanceLarge, ethRequiredLarge: 0};
                } else {
                    var requiredEth = thirdparty.web3.toBigNumber(etcBalance).minus(thirdparty.web3.toBigNumber(ethBalance)).plus(thirdparty.web3.toBigNumber(baseTXCost)).toNumber();

                    var requiredEthLarge = HDWalletHelper.convertWeiToEther(requiredEth);

//                    console.log("[etc/eth split :: eth address :: " + curAddr + " :: requires more eth :: " + requiredEthLarge + " ]");

                    balancesTransferrable[curAddr] = {small: etcBalance, large: etcBalanceLarge, ethRequiredLarge: requiredEthLarge};
                }
            } else {
//                console.log("[etc/eth split :: eth address :: " + curAddr + " does not have a splittable balance]");

                var requiredEth = thirdparty.web3.toBigNumber(etcBalance).plus(thirdparty.web3.toBigNumber(baseTXCost)).toNumber();
                var requiredEthLarge = HDWalletHelper.convertWeiToEther(requiredEth);

                balancesTransferrable[curAddr] = {small: etcBalance, large: etcBalanceLarge, ethRequiredLarge: requiredEthLarge};
            }
        } else {
//            console.log("etc/eth split :: etc address :: " + curAddr + " does not have a splittable balance :: " + etcBalanceLarge);
        }
    }

    g_JaxxApp.getUI().showEtcEthSplitModal(baseTXCost, balancesTransferrable);

//    console.log("eth/etc split :: balancesTransferrable :: " + JSON.stringify(balancesTransferrable, null, 4));
}

HDWalletPouchEthereum.prototype.getBaseCoinAddressFormatType = function() {
    return this._baseFormatCoinType;
}

HDWalletPouchEthereum.prototype.createTransaction = function(address, amount) {
    //@note: @here: @todo: from jaxx.js, gather custom data and such.
    //@note: @here: this should check for address, amount validity.
    //@note: @todo: maybe a transaction queue?
}
