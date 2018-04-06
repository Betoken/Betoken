// Generated by CoffeeScript 2.2.2
var INPUT_ERR, SEND_TX_ERR, STAKE_BOTH_SIDES_ERR, Web3, allowEmergencyWithdraw, avgROI, betoken, betoken_addr, chart, checkKairoAmountError, clock, commissionRate, copyTextToClipboard, countdownDay, countdownHour, countdownMin, countdownSec, cycleNumber, cyclePhase, cycleTotalCommission, displayedInvestmentBalance, displayedInvestmentUnit, displayedKairoBalance, displayedKairoUnit, errorMessage, hasWeb3, historicalTotalCommission, kairoAddr, kairoBalance, kairoTotalSupply, kyberAddr, lastCommissionRedemption, loadFundData, networkName, networkPrefix, paused, phaseLengths, prevCommission, prevROI, proposalList, sharesAddr, sharesBalance, sharesTotalSupply, showCountdown, showError, showSuccess, showTransaction, startTimeOfCyclePhase, successMessage, totalFunds, transactionHash, transactionHistory, userAddress, web3;

import "./body.html";

import "./body.css";

import "./tablesort.js";

import {
  Betoken
} from "../objects/betoken.js";

import Chart from "chart.js";

import BigNumber from "bignumber.js";

SEND_TX_ERR = "There was an error during sending your transaction to the Ethereum blockchain. Please check that your inputs are valid and try again later.";

INPUT_ERR = "There was an error in your input. Please fix it and try again.";

STAKE_BOTH_SIDES_ERR = "You have already staked on the opposite side of this proposal! If you want to change your mind, you can cancel your stake under \"My Proposals\".";

//Import web3
Web3 = require("web3");

web3 = window.web3;

hasWeb3 = false;

if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
  hasWeb3 = true;
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/m7Pdc77PjIwgmp7t0iKI"));
}

//Fund object
betoken_addr = new ReactiveVar("0x6ca70247ee747078103902f37d2afc3ad0b57c73");

betoken = new Betoken(betoken_addr.get());

//Session data
userAddress = new ReactiveVar("Not Available");

kairoBalance = new ReactiveVar(BigNumber(0));

kairoTotalSupply = new ReactiveVar(BigNumber(0));

sharesBalance = new ReactiveVar(BigNumber(0));

sharesTotalSupply = new ReactiveVar(BigNumber(0));

cyclePhase = new ReactiveVar(0);

startTimeOfCyclePhase = new ReactiveVar(0);

phaseLengths = new ReactiveVar([]);

totalFunds = new ReactiveVar(BigNumber(0));

proposalList = new ReactiveVar([]);

cycleNumber = new ReactiveVar(0);

commissionRate = new ReactiveVar(BigNumber(0));

paused = new ReactiveVar(false);

allowEmergencyWithdraw = new ReactiveVar(false);

lastCommissionRedemption = new ReactiveVar(0);

cycleTotalCommission = new ReactiveVar(BigNumber(0));

//Displayed variables
kairoAddr = new ReactiveVar("");

sharesAddr = new ReactiveVar("");

kyberAddr = new ReactiveVar("");

displayedInvestmentBalance = new ReactiveVar(BigNumber(0));

displayedInvestmentUnit = new ReactiveVar("ETH");

displayedKairoBalance = new ReactiveVar(BigNumber(0));

displayedKairoUnit = new ReactiveVar("KRO");

countdownDay = new ReactiveVar(0);

countdownHour = new ReactiveVar(0);

countdownMin = new ReactiveVar(0);

countdownSec = new ReactiveVar(0);

showCountdown = new ReactiveVar(true);

transactionHash = new ReactiveVar("");

networkName = new ReactiveVar("");

networkPrefix = new ReactiveVar("");

chart = null;

prevROI = new ReactiveVar(BigNumber(0));

avgROI = new ReactiveVar(BigNumber(0));

prevCommission = new ReactiveVar(BigNumber(0));

historicalTotalCommission = new ReactiveVar(BigNumber(0));

transactionHistory = new ReactiveVar([]);

errorMessage = new ReactiveVar("");

successMessage = new ReactiveVar("");

showTransaction = function(_txHash) {
  transactionHash.set(_txHash);
  $("#transaction_sent_modal").modal("show");
};

showError = function(_msg) {
  errorMessage.set(_msg);
  return $("#error_modal").modal("show");
};

showSuccess = function(_msg) {
  successMessage.set(_msg);
  return $("#success_modal").modal("show");
};

copyTextToClipboard = function(text) {
  var err, successful, textArea;
  textArea = document.createElement("textarea");
  // Place in top-left corner of screen regardless of scroll position.
  textArea.style.position = "fixed";
  textArea.style.top = 0;
  textArea.style.left = 0;
  // Ensure it has a small width and height. Setting to 1px / 1em
  // doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  // We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = 0;
  // Clean up any borders.
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  // Avoid flash of white box if rendered for any reason.
  textArea.style.background = "transparent";
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    successful = document.execCommand("copy");
    if (successful) {
      showSuccess(`Copied ${text} to clipboard`);
    } else {
      showError("Oops, unable to copy");
    }
  } catch (error1) {
    err = error1;
    showError("Oops, unable to copy");
  }
  document.body.removeChild(textArea);
};

clock = function() {
  return setInterval(function() {
    var days, distance, hours, minutes, now, seconds, target;
    now = Math.floor(new Date().getTime() / 1000);
    target = startTimeOfCyclePhase.get() + phaseLengths.get()[cyclePhase.get()];
    distance = target - now;
    if (distance > 0) {
      showCountdown.set(true);
      days = Math.floor(distance / (60 * 60 * 24));
      hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60));
      minutes = Math.floor((distance % (60 * 60)) / 60);
      seconds = Math.floor(distance % 60);
      countdownDay.set(days);
      countdownHour.set(hours);
      countdownMin.set(minutes);
      return countdownSec.set(seconds);
    } else {
      return showCountdown.set(false);
    }
  }, 1000);
};

loadFundData = function() {
  var proposals, receivedROICount;
  proposals = [];
  receivedROICount = 0;
  //Get Network ID
  web3.eth.net.getId().then(function(_id) {
    var net, pre;
    switch (_id) {
      case 1:
        net = "Main Ethereum Network";
        pre = "";
        break;
      case 3:
        net = "Ropsten Testnet";
        pre = "ropsten.";
        break;
      case 4:
        net = "Rinkeby Testnet";
        pre = "rinkeby.";
        break;
      case 42:
        net = "Kovan Testnet";
        pre = "kovan.";
        break;
      default:
        net = "Unknown Network";
        pre = "";
    }
    networkName.set(net);
    networkPrefix.set(pre);
    if (_id !== 4) {
      showError("Please switch to Rinkeby Testnet in order to try Betoken Alpha");
    }
  });
  web3.eth.getAccounts().then(function(accounts) {
    web3.eth.defaultAccount = accounts[0];
    return accounts[0];
  }).then(function(_userAddress) {
    var getTransactionHistory;
    //Initialize user address
    if (typeof _userAddress !== "undefined") {
      userAddress.set(_userAddress);
    }
    betoken.getShareTotalSupply().then(function(_totalSupply) {
      return sharesTotalSupply.set(BigNumber(_totalSupply));
    }).then(function() {
      return betoken.getShareBalance(_userAddress).then(function(_sharesBalance) {
        //Get user's Shares balance
        sharesBalance.set(BigNumber(_sharesBalance));
        if (!sharesTotalSupply.get().isZero()) {
          return displayedInvestmentBalance.set(sharesBalance.get().div(sharesTotalSupply.get()).mul(totalFunds.get()).div(1e18));
        }
      });
    });
    betoken.getKairoBalance(_userAddress).then(function(_kairoBalance) {
      //Get user's Kairo balance
      kairoBalance.set(BigNumber(_kairoBalance));
      return displayedKairoBalance.set(BigNumber(web3.utils.fromWei(_kairoBalance, "ether")));
    });
    betoken.getMappingOrArrayItem("lastCommissionRedemption", _userAddress).then(function(_result) {
      return lastCommissionRedemption.set(_result);
    });
    //Get proposals & participants
    Promise.all([
      betoken.getKairoTotalSupply().then(function(_kairoTotalSupply) {
        //Get Kairo's total supply
        kairoTotalSupply.set(BigNumber(_kairoTotalSupply));
      }),
      //Get total funds
      betoken.getPrimitiveVar("totalFundsInWeis").then(function(_totalFunds) {
        return totalFunds.set(BigNumber(_totalFunds));
      })
    ]).then(function() {});
    //Listen for transactions
    /*betoken.getMappingOrArrayItem("proposals", userAddress.get()).then(
      (_proposals) ->
        proposals = _proposals
        if proposals.length == 0
          return

        handleProposal = (id) ->
          betoken.getTokenSymbol(proposals[id]).then(
            (_symbol) ->
              proposals[id].id = id
              proposals[id].tokenSymbol = _symbol
              proposals[id].investment = BigNumber(proposals[id].stake).div(kairoTotalSupply.get()).mul(totalFunds.get())
          )
        handleAllProposals = (handleProposal(i) for i in [0..proposals.length])
        Promise.all(getAllSymbols)
    ).then(
      () ->
        proposalList.set(proposals)
    )*/
    transactionHistory.set([]);
    getTransactionHistory = function(_type) {
      return betoken.contracts.betokenFund.getPastEvents(_type, {
        fromBlock: 0,
        filter: {
          _sender: _userAddress
        }
      }).then(function(_events) {
        var _event, data, entry, i, len, results;
        results = [];
        for (i = 0, len = _events.length; i < len; i++) {
          _event = _events[i];
          data = _event.returnValues;
          entry = {
            type: _type,
            timestamp: new Date(+data._timestamp * 1e3).toString()
          };
          results.push(betoken.getTokenSymbol(data._tokenAddress).then(function(_tokenSymbol) {
            return entry.token = _tokenSymbol;
          }).then(function() {
            return betoken.getTokenDecimals(data._tokenAddress);
          }).then(function(_tokenDecimals) {
            return entry.amount = BigNumber(data._tokenAmount).div(Math.pow(10, +_tokenDecimals)).toFormat(4);
          }).then(function() {
            var tmp;
            tmp = transactionHistory.get();
            tmp.push(entry);
            return transactionHistory.set(tmp);
          }));
        }
        return results;
      });
    };
    getTransactionHistory("Deposit");
    getTransactionHistory("Withdraw");
    betoken.contracts.controlToken.getPastEvents("Transfer", {
      fromBlock: 0,
      filter: {
        from: _userAddress
      }
    }).then(function(_events) {
      var _event, data, entry, i, len, results;
      results = [];
      for (i = 0, len = _events.length; i < len; i++) {
        _event = _events[i];
        data = _event.returnValues;
        entry = {
          type: "Transfer Out",
          token: "KRO",
          amount: BigNumber(data.value).div(1e18).toFormat(4)
        };
        results.push(web3.eth.getBlock(_event.blockNumber).then(function(_block) {
          var tmp;
          entry.timestamp = new Date(_block.timestamp * 1e3).toString();
          tmp = transactionHistory.get();
          tmp.push(entry);
          return transactionHistory.set(tmp);
        }));
      }
      return results;
    });
    betoken.contracts.controlToken.getPastEvents("Transfer", {
      fromBlock: 0,
      filter: {
        to: _userAddress
      }
    }).then(function(_events) {
      var _event, data, entry, i, len, results;
      results = [];
      for (i = 0, len = _events.length; i < len; i++) {
        _event = _events[i];
        data = _event.returnValues;
        entry = {
          type: "Transfer In",
          token: "KRO",
          amount: BigNumber(data.value).div(1e18).toFormat(4)
        };
        results.push(web3.eth.getBlock(_event.blockNumber).then(function(_block) {
          var tmp;
          entry.timestamp = new Date(_block.timestamp * 1e3).toString();
          tmp = transactionHistory.get();
          tmp.push(entry);
          return transactionHistory.set(tmp);
        }));
      }
      return results;
    });
    betoken.contracts.shareToken.getPastEvents("Transfer", {
      fromBlock: 0,
      filter: {
        from: _userAddress
      }
    }).then(function(_events) {
      var _event, data, entry, i, len, results;
      results = [];
      for (i = 0, len = _events.length; i < len; i++) {
        _event = _events[i];
        data = _event.returnValues;
        entry = {
          type: "Transfer Out",
          token: "BTKS",
          amount: BigNumber(data.value).div(1e18).toFormat(4)
        };
        results.push(web3.eth.getBlock(_event.blockNumber).then(function(_block) {
          var tmp;
          entry.timestamp = new Date(_block.timestamp * 1e3).toString();
          tmp = transactionHistory.get();
          tmp.push(entry);
          return transactionHistory.set(tmp);
        }));
      }
      return results;
    });
    return betoken.contracts.controlToken.getPastEvents("Transfer", {
      fromBlock: 0,
      filter: {
        to: _userAddress
      }
    }).then(function(_events) {
      var _event, data, entry, i, len, results;
      results = [];
      for (i = 0, len = _events.length; i < len; i++) {
        _event = _events[i];
        data = _event.returnValues;
        entry = {
          type: "Transfer In",
          token: "BTKS",
          amount: BigNumber(data.value).div(1e18).toFormat(4)
        };
        results.push(web3.eth.getBlock(_event.blockNumber).then(function(_block) {
          var tmp;
          entry.timestamp = new Date(_block.timestamp * 1e3).toString();
          tmp = transactionHistory.get();
          tmp.push(entry);
          return transactionHistory.set(tmp);
        }));
      }
      return results;
    });
  });
  //Get cycle data
  betoken.getPrimitiveVar("cyclePhase").then(function(_cyclePhase) {
    return cyclePhase.set(+_cyclePhase);
  });
  betoken.getPrimitiveVar("startTimeOfCyclePhase").then(function(_startTime) {
    return startTimeOfCyclePhase.set(+_startTime);
  });
  betoken.getPrimitiveVar("getPhaseLengths").then(function(_phaseLengths) {
    return phaseLengths.set(_phaseLengths.map(function(x) {
      return +x;
    }));
  });
  betoken.getPrimitiveVar("commissionRate").then(function(_result) {
    return commissionRate.set(BigNumber(_result).div(1e18));
  });
  betoken.getPrimitiveVar("paused").then(function(_result) {
    return paused.set(_result);
  });
  betoken.getPrimitiveVar("allowEmergencyWithdraw").then(function(_result) {
    return allowEmergencyWithdraw.set(_result);
  });
  betoken.getPrimitiveVar("totalCommission").then(function(_result) {
    return cycleTotalCommission.set(BigNumber(_result));
  });
  //Get contract addresses
  kairoAddr.set(betoken.addrs.controlToken);
  sharesAddr.set(betoken.addrs.shareToken);
  betoken.getPrimitiveVar("kyberAddr").then(function(_kyberAddr) {
    return kyberAddr.set(_kyberAddr);
  });
  //Get statistics
  prevROI.set(BigNumber(0));
  avgROI.set(BigNumber(0));
  prevCommission.set(BigNumber(0));
  historicalTotalCommission.set(BigNumber(0));
  betoken.getPrimitiveVar("cycleNumber").then(function(_result) {
    return cycleNumber.set(+_result);
  }).then(function() {
    chart.data.datasets[0].data = [];
    chart.update();
    betoken.contracts.betokenFund.getPastEvents("ROI", {
      fromBlock: 0
    }).then(function(_events) {
      var ROI, _event, data, i, len, results;
      results = [];
      for (i = 0, len = _events.length; i < len; i++) {
        _event = _events[i];
        data = _event.returnValues;
        ROI = BigNumber(data._afterTotalFunds).minus(data._beforeTotalFunds).div(data._afterTotalFunds).mul(100);
        //Update chart data
        chart.data.datasets[0].data.push({
          x: data._cycleNumber,
          y: ROI.toString()
        });
        chart.update();
        //Update previous cycle ROI
        if (+data._cycleNumber === cycleNumber.get() || +data._cycleNumber === cycleNumber.get() - 1) {
          prevROI.set(ROI);
        }
        //Update average ROI
        receivedROICount += 1;
        results.push(avgROI.set(avgROI.get().add(ROI.minus(avgROI.get()).div(receivedROICount))));
      }
      return results;
    });
    return betoken.contracts.betokenFund.getPastEvents("CommissionPaid", {
      fromBlock: 0
    }).then(function(_events) {
      var _event, commission, data, i, len, results;
      results = [];
      for (i = 0, len = _events.length; i < len; i++) {
        _event = _events[i];
        data = _event.returnValues;
        commission = BigNumber(data._totalCommissionInWeis);
        //Update previous cycle commission
        if (+data._cycleNumber === cycleNumber.get() - 1) {
          prevCommission.set(commission);
        }
        //Update total commission
        results.push(historicalTotalCommission.set(historicalTotalCommission.get().add(commission)));
      }
      return results;
    });
  });
};

$("document").ready(function() {
  $(".menu .item").tab();
  $("table").tablesort();
  if (typeof web3 !== "undefined") {
    web3.eth.net.getId().then(function(_id) {
      if (_id !== 4) {
        showError("Please switch to Rinkeby Testnet in order to try Betoken Alpha");
      }
    });
    clock();
    chart = new Chart($("#myChart"), {
      type: "line",
      data: {
        datasets: [
          {
            label: "ROI Per Cycle",
            backgroundColor: "rgba(0, 0, 100, 0.5)",
            borderColor: "rgba(0, 0, 100, 1)",
            data: []
          }
        ]
      },
      options: {
        scales: {
          xAxes: [
            {
              type: "linear",
              position: "bottom",
              scaleLabel: {
                display: true,
                labelString: "Investment Cycle"
              },
              ticks: {
                stepSize: 1
              }
            }
          ],
          yAxes: [
            {
              type: "linear",
              position: "left",
              scaleLabel: {
                display: true,
                labelString: "Percent"
              },
              ticks: {
                beginAtZero: true
              }
            }
          ]
        }
      }
    });
    //Initialize Betoken object
    betoken.init().then(loadFundData);
  }
  if (!hasWeb3) {
    return showError("Betoken can only be used in a Web3 enabled browser. Please install <a href=\"https://metamask.io/\">MetaMask</a> or switch to another browser that supports Web3. You can currently view the fund's data, but cannot make any interactions.");
  }
});

Template.body.helpers({
  transaction_hash: function() {
    return transactionHash.get();
  },
  network_prefix: function() {
    return networkPrefix.get();
  },
  error_msg: function() {
    return errorMessage.get();
  },
  success_msg: function() {
    return successMessage.get();
  }
});

Template.body.events({
  "click .copyable": function(event) {
    return copyTextToClipboard(event.target.innerText);
  }
});

Template.top_bar.helpers({
  show_countdown: function() {
    return showCountdown.get();
  },
  paused: function() {
    return paused.get();
  },
  allow_emergency_withdraw: function() {
    if (allowEmergencyWithdraw.get()) {
      return "";
    } else {
      return "disabled";
    }
  },
  betoken_addr: function() {
    return betoken_addr.get();
  },
  kairo_addr: function() {
    return kairoAddr.get();
  },
  shares_addr: function() {
    return sharesAddr.get();
  },
  kyber_addr: function() {
    return kyberAddr.get();
  },
  network_prefix: function() {
    return networkPrefix.get();
  }
});

Template.top_bar.events({
  "click .next_phase": function(event) {
    var error;
    try {
      return betoken.endPhase(cyclePhase.get(), showTransaction);
    } catch (error1) {
      error = error1;
      return console.log(error);
    }
  },
  "click .emergency_withdraw": function(event) {
    return betoken.emergencyWithdraw(showTransaction);
  },
  "click .change_contract": function(event) {
    return $("#change_contract_modal").modal({
      onApprove: function(e) {
        var error, new_addr;
        try {
          new_addr = $("#contract_addr_input")[0].value;
          if (!web3.utils.isAddress(new_addr)) {
            throw "";
          }
          betoken_addr.set(new_addr);
          betoken = new Betoken(betoken_addr.get());
          return betoken.init().then(loadFundData);
        } catch (error1) {
          error = error1;
          return showError("Oops! That wasn't a valid contract address!");
        }
      }
    }).modal("show");
  },
  "click .info_button": function(event) {
    return $("#contract_info_modal").modal("show");
  }
});

Template.countdown_timer.helpers({
  day: function() {
    return countdownDay.get();
  },
  hour: function() {
    return countdownHour.get();
  },
  minute: function() {
    return countdownMin.get();
  },
  second: function() {
    return countdownSec.get();
  }
});

Template.phase_indicator.helpers({
  phase_active: function(index) {
    if (cyclePhase.get() === index) {
      return "active";
    }
    return "";
  }
});

Template.sidebar.helpers({
  network_name: function() {
    return networkName.get();
  },
  user_address: function() {
    return userAddress.get();
  },
  user_balance: function() {
    return displayedInvestmentBalance.get().toFormat(18);
  },
  balance_unit: function() {
    return displayedInvestmentUnit.get();
  },
  user_kairo_balance: function() {
    return displayedKairoBalance.get().toFormat(18);
  },
  kairo_unit: function() {
    return displayedKairoUnit.get();
  },
  can_redeem_commission: function() {
    return cyclePhase.get() === 4 && lastCommissionRedemption.get() < cycleNumber.get();
  },
  expected_commission: function() {
    if (kairoTotalSupply.get().greaterThan(0)) {
      if (cyclePhase.get() === 4) {
        // Actual commission that will be redeemed
        return kairoBalance.get().div(kairoTotalSupply.get()).mul(cycleTotalCommission.get()).div(1e18).toFormat(18);
      }
      // Expected commission based on previous average ROI
      return kairoBalance.get().div(kairoTotalSupply.get()).mul(totalFunds.get().div(1e18)).mul(avgROI.get().div(100)).mul(commissionRate.get()).toFormat(18);
    }
    return BigNumber(0).toFormat(18);
  }
});

Template.sidebar.events({
  "click .kairo_unit_switch": function(event) {
    if (event.target.checked) {
      if (!kairoTotalSupply.get().isZero()) {
        displayedKairoBalance.set(kairoBalance.get().div(kairoTotalSupply.get()).times("100"));
      }
      return displayedKairoUnit.set("%");
    } else {
      //Display Kairo
      displayedKairoBalance.set(BigNumber(web3.utils.fromWei(kairoBalance.get().toString(), "ether")));
      return displayedKairoUnit.set("KRO");
    }
  },
  "click .balance_unit_switch": function(event) {
    if (event.target.checked) {
      //Display BTKS
      displayedInvestmentBalance.set(sharesBalance.get().div(1e18));
      return displayedInvestmentUnit.set("BTKS");
    } else {
      if (!sharesTotalSupply.get().isZero()) {
        displayedInvestmentBalance.set(sharesBalance.get().div(sharesTotalSupply.get()).mul(totalFunds.get()).div(1e18));
      }
      return displayedInvestmentUnit.set("ETH");
    }
  }
});

Template.transact_box.onCreated(function() {
  Template.instance().depositInputHasError = new ReactiveVar(false);
  Template.instance().withdrawInputHasError = new ReactiveVar(false);
  Template.instance().sendTokenAmountInputHasError = new ReactiveVar(false);
  return Template.instance().sendTokenRecipientInputHasError = new ReactiveVar(false);
});

Template.transact_box.helpers({
  is_disabled: function(_type) {
    if ((cyclePhase.get() !== 0 && _type !== "token") || (cycleNumber.get() === 1 && _type === "withdraw") || (cyclePhase.get() === 4 && _type === "token")) {
      return "disabled";
    }
  },
  has_error: function(input_id) {
    var hasError;
    hasError = false;
    switch (input_id) {
      case 0:
        hasError = Template.instance().depositInputHasError.get();
        break;
      case 1:
        hasError = Template.instance().withdrawInputHasError.get();
        break;
      case 2:
        hasError = Template.instance().sendTokenAmountInputHasError.get();
        break;
      case 3:
        hasError = Template.instance().sendTokenRecipientInputHasError.get();
    }
    if (hasError) {
      return "error";
    }
  },
  transaction_history: function() {
    return transactionHistory.get();
  }
});

Template.transact_box.events({
  "click .deposit_button": function(event) {
    var amount;
    try {
      Template.instance().depositInputHasError.set(false);
      amount = BigNumber(web3.utils.toWei($("#deposit_input")[0].value));
      if (!amount.greaterThan(0)) {
        Template.instance().sendTokenAmountInputHasError.set(true);
        return;
      }
      return betoken.deposit(amount, showTransaction);
    } catch (error1) {
      return Template.instance().depositInputHasError.set(true);
    }
  },
  "click .withdraw_button": function(event) {
    var amount, error;
    try {
      Template.instance().withdrawInputHasError.set(false);
      amount = BigNumber(web3.utils.toWei($("#withdraw_input")[0].value));
      if (!amount.greaterThan(0)) {
        Template.instance().sendTokenAmountInputHasError.set(true);
        return;
      }
      // Check that Betoken balance is > withdraw amount
      if (amount.greaterThan(sharesBalance.get().div(sharesTotalSupply.get()).mul(totalFunds.get()))) {
        showError("Oops! You tried to withdraw more Ether than you have in your account!");
        Template.instance().withdrawInputHasError.set(true);
        return;
      }
      return betoken.withdraw(amount, showTransaction);
    } catch (error1) {
      error = error1;
      return Template.instance().withdrawInputHasError.set(true);
    }
  },
  "click .token_send_button": function(event) {
    var amount, toAddress, tokenType;
    try {
      Template.instance().sendTokenAmountInputHasError.set(false);
      Template.instance().sendTokenRecipientInputHasError.set(false);
      amount = BigNumber(web3.utils.toWei($("#send_token_amount_input")[0].value));
      toAddress = $("#send_token_recipient_input")[0].value;
      tokenType = $("#send_token_type")[0].value;
      if (!amount.greaterThan(0)) {
        Template.instance().sendTokenAmountInputHasError.set(true);
        return;
      }
      if (!web3.utils.isAddress(toAddress)) {
        Template.instance().sendTokenRecipientInputHasError.set(true);
        return;
      }
      if (tokenType === "KRO") {
        if (amount.greaterThan(kairoBalance.get())) {
          Template.instance().sendTokenAmountInputHasError.set(true);
          return;
        }
        return betoken.sendKairo(toAddress, amount, showTransaction);
      } else if (tokenType === "BTKS") {
        if (amount.greaterThan(sharesBalance.get())) {
          Template.instance().sendTokenAmountInputHasError.set(true);
          return;
        }
        return betoken.sendShares(toAddress, amount, showTransaction);
      }
    } catch (error1) {
      return Template.instance().sendTokenAmountInputHasError.set(true);
    }
  }
});

Template.stats_tab.helpers({
  cycle_length: function() {
    return BigNumber(phaseLengths.get().reduce(function(t, n) {
      return t + n;
    })).div(24 * 60 * 60).toDigits(3);
  },
  total_funds: function() {
    return totalFunds.get().div("1e18").toFormat(2);
  },
  prev_roi: function() {
    return prevROI.get().toFormat(2);
  },
  avg_roi: function() {
    return avgROI.get().toFormat(2);
  },
  prev_commission: function() {
    return prevCommission.get().div(1e18).toFormat(2);
  },
  historical_commission: function() {
    return historicalTotalCommission.get().div(1e18).toFormat(2);
  }
});

Template.proposals_tab.helpers({
  proposal_list: function() {
    return proposalList.get();
  },
  should_have_actions: function() {
    return cyclePhase.get() === 3;
  },
  wei_to_eth: function(_weis) {
    return BigNumber(_weis).div(1e18).toFormat(4);
  },
  redeem_kro_is_disabled: function(_isSold) {
    if (_isSold) {
      return "disabled";
    } else {
      return "";
    }
  },
  new_proposal_is_disabled: function() {
    if (cyclePhase.get() === 1) {
      return "";
    } else {
      return "disabled";
    }
  }
});

Template.proposals_tab.events({
  "click .execute_proposal": function(event) {
    var id;
    id = this.id;
    if (cyclePhase.get() === 3) {
      return betoken.sellProposalAsset(id, showTransaction);
    }
  },
  "click .new_proposal": function(event) {
    return $("#new_proposal_modal").modal({
      onApprove: function(e) {
        var address, error, kairoAmountInWeis;
        try {
          address = $("#address_input_new")[0].value;
          if (!web3.utils.isAddress(address)) {
            throw "Invalid token address.";
          }
          kairoAmountInWeis = BigNumber($("#stake_input_new")[0].value).times("1e18");
          checkKairoAmountError(kairoAmountInWeis);
          return betoken.createProposal(address, kairoAmountInWeis, showTransaction);
        } catch (error1) {
          error = error1;
          return showError(error.toString() || INPUT_ERR);
        }
      }
    }).modal("show");
  }
});

checkKairoAmountError = function(kairoAmountInWeis) {
  if (!kairoAmountInWeis.greaterThan(0)) {
    throw "Stake amount should be positive.";
  }
  if (kairoAmountInWeis.greaterThan(kairoBalance.get())) {
    throw "You can't stake more Kairos than you have!";
  }
};

//# sourceMappingURL=body.js.map
