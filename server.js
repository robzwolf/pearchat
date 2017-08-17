/*
    ____                  ________          __
   / __ \___  ____  _____/ ____/ /_  ____  / /_
  / /_/ / _ \/ __ \/ ___/ /   / __ \/ __ \/ __/
 / ____/ ___/ /_/ / /  / /___/ / / / /_/ / /_
/_/    \___/\__,_/_/   \____/_/ /_/\__,_/\__/

Created by Robbie Jakob-Whitworth during the summer of 2017

See README.md for documentation and other information

*/

var express = require("express");
var app = express();

var bodyParser = require("body-parser");
var ip = require("ip");
var fs = require("fs");
var crypto = require("crypto");
//var cryptico = require("cryptico");


/* The port on which to listen for incoming connections. Change this and restart node to use a
 * different port */
var SERVER_PORT = 1337;
var sessions = [];
var usedTokens = [];


// Create application/x-www-form-urlencoded parser for handling POST requests
var urlencodedParser = bodyParser.urlencoded({"extended":false});


app.use(express.static('public'));


// Set view engine to ejs (templating application) https://scotch.io/tutorials/use-ejs-to-template-your-node-application
app.set("view engine", "ejs");


// root
app.get("/", function(req, res) {
	res.send("<script>window.location.href='/chat';</script>");
	console.log("Got GET request for / from " + ipV6toV4(req.ip) + ", sent '<script>window.location.href=\"chat\";</script>'");

});


// test_ejs
app.get("/test_ejs", function(req, res) {
	res.render("ejs_pages/test");
});


// /ip
app.get("/ip", function(req, res) {
	response = {
		"host":		ip.address(),
		"visitor":	ipV6toV4(req.ip)
	}
	res.send(JSON.stringify(response));
	// res.send("<pre>Host IP:    " + ip.address() + "<br />Visitor IP: " + ipV6toV4(req.ip) + " (" + req.ip + ")" + "</pre>");
});

app.post("/ip", urlencodedParser, function(req, res) {
	// Check that they actually sent wcToken
	if(req.body.wcToken == undefined) {
		asyncChatSendResponse({"success": false, "errString": "No wcToken provided"}, req, res);
	}

	console.log(ipV6toV4(req.ip) + " sent POST to /ip with wcToken " + req.body.wcToken);
	
	var wcToken = req.body.wcToken;
	cs = getChatSessionFromWCToken(wcToken);

	if(cs == null) {
		asyncChatSendResponse({"success": false, "errString": "No ChatSession was found with which the given wcToken is associated", "wcToken": wcToken}, req, res);
	}
	
	response = {
		"host":		ip.address(),
		"visitor":	cs.visitor
	}
	
	res.send(JSON.stringify(response));
});



// /gen_mtoken
app.get("/gen_mtoken", function(req, res) {
	var responseObj = {
		"mToken": generateRandomToken()
	};
	res.send(JSON.stringify(responseObj));
	console.log(ipV6toV4(req.ip) + " requested mToken and was given " + responseObj.mToken);
});



// /chat
app.get("/chat", function(req, res) {
	console.log("Got GET request for /chat from " + ipV6toV4(req.ip));

	/* Do chat setup */
	var visitor = ipV6toV4(req.ip);
	var h_or_v = isHostOrVisitor(ipV6toV4(req.ip));

	var cs;

	if(h_or_v == "host") {
		var unpairedSessions = getUnpairedChatSessions();
		if(unpairedSessions.length == 1) {
			cs = unpairedSessions[0];
		} else {
			res.render("ejs_pages/no_unpaired_sessions");
			return;
		}
	} else if (h_or_v == "visitor") {
		var sToken = generateRandomToken();
		var hToken = generateRandomToken();
		var vToken = generateRandomToken();
		cs = new ChatSession(visitor, sToken, hToken, vToken);
		sessions[sessions.length] = cs;
	}

	var esjData = {
		"wcToken": ""
	}

	if(h_or_v == "host") {
		esjData.wcToken = cs.hToken;
		cs.hostHasJoined = true;
	} else if (h_or_v == "visitor") {
		esjData.wcToken = cs.vToken;
		cs.visitorHasJoined = true;
	}

	res.render("ejs_pages/chat_client_interface", esjData);
	console.log("Set up new ChatSession:", cs);


});


// /chat_send
app.post("/chat_send", urlencodedParser, function(req, res) {
	// Do something with a sent message
	console.log(ipV6toV4(req.ip) + " sent jqXHR:", JSON.stringify(req.body));

	var cs = getChatSessionFromWCToken(req.body.wcToken);
	if(cs == null) {
		asyncChatSendResponse({"success":false, "mToken": req.body.mToken, "errString": "No existing ChatSession with wcToken " + req.body.wcToken + " could be found"}, req, res);
	}
	var mToken;
	var sender;
	var content;
	var timestamp;
	var h_or_v;

	// Do validation checks
	// Check mToken
	if(req.body.mToken == undefined) {
		asyncChatSendResponse({"success":false, "mToken": null, "errString": "No mToken was specified"}, req, res);
		return;
	} else {
		mToken = req.body.mToken;
	}
	// Check wcToken
	if(cs.hToken == req.body.wcToken) { 		// Request is from host
		sender = req.ip;
		h_or_v = "host";
	} else if (cs.vToken == req.body.wcToken) { // Request is from visitor
		sender = ip.address();
		h_or_v = "visitor";
	} else { 									// Token not recognised
		asyncChatSendResponse({"success": false, "mToken": req.body.mToken, "errString": "Token not recognised"}, req, res);
		return;
	}
	// Check message content
	if(req.body.message == undefined) {
		asyncChatSendResponse({"success":false, "mToken": req.body.mToken, "errString": "No message body sent"}, req, res);
		return;
	} else if(req.body.message.match(/^\s*$/)) {
		asyncChatSendResponse({"success":false, "mToken": req.body.mToken, "errString": "Message cannot be pure-whitespace"}, req, res);
		return;
	} else {
		content = req.body.message;
	}
	// Check timestamp
	if(req.body.timestamp == undefined) {
		asyncChatSendResponse({"success":false, "mToken": req.body.mToken, "errString": "Timestamp not specified"}, req, res);
		return;
	} else {
		timestamp = req.body.timestamp;
	}

	var msg = new Message(sender, content, mToken, timestamp);

	if(h_or_v == "host") {
		cs.pendingVMessages[cs.pendingVMessages.length] = msg;
		console.log("Appended message " + mToken + " to pendingVMessages. pvm is now " + cs.pendingVMessages.length + " long.");
	} else if (h_or_v == "visitor") {
		cs.pendingHMessages[cs.pendingHMessages.length] = msg;
		console.log("Appended message " + mToken + " to pendingHMessages. phm is now " + cs.pendingHMessages.length + " long.");
	} else {
		// Something went wrong
	}

	// Assuming everything went well
	asyncChatSendResponse({"success": true, "mToken": req.body.mToken}, req, res);
});

var asyncChatSendResponse = function(response, req, res) {
	res.send(JSON.stringify(response));
	console.log("Sent, to " + ipV6toV4(req.ip) + ", " + JSON.stringify(response));
}


// /chat_pull
app.post("/chat_pull", urlencodedParser, function(req, res) {

	// Check that they actually sent wcToken
	if(req.body.wcToken == undefined) {
		asyncChatSendResponse({"success": false, "errString": "No wcToken provided"}, req, res);
	}

	console.log(ipV6toV4(req.ip) + " sent POST to /chat_pull with wcToken " + req.body.wcToken);

	var wcToken = req.body.wcToken;
	cs = getChatSessionFromWCToken(wcToken);

	if(cs === null) {
		asyncChatSendResponse({"success": false, "errString": "No ChatSession was found with which the given wcToken is associated", "wcToken": wcToken}, req, res);
		return;
	}

	// Push the queued messages to the web client
	var refreshTime = 50; // Time to wait before rechecking the queue for new messages (milliseconds)
	if(cs.vToken == wcToken) {
		// Continually check for queued messages
		var timesChecked = 0;
		var loopID = setInterval(function(){
			timesChecked++;
			if(timesChecked * refreshTime > req.body.timeout) {
				clearInterval(loopID);
				console.log("Cleared interval vToken");
			}
			if(cs.pendingVMessages.length > 0) {
				console.log("cs.pendingVMessages.length = " + cs.pendingVMessages.length);
				res.send(JSON.stringify({"messages":cs.pendingVMessages}));
				console.log("Sent " + cs.pendingVMessages.length + " messages to visitor /chat_pull");
				clearInterval(loopID);
				console.log("Cleared interval vToken");
				cs.messages = cs.messages.concat(cs.pendingVMessages);
				cs.pendingVMessages = [];
			}
		}, refreshTime);
	} else if (cs.hToken == wcToken) {
		// Continually check for queued messages
		var timesChecked = 0;
		var loopID = setInterval(function(){
			timesChecked++;
			if(timesChecked * refreshTime > req.body.timeout) {
				clearInterval(loopID);
				console.log("Cleared interval hToken");
			}
			if(cs.pendingHMessages.length > 0) {
				console.log("cs.pendingHMessages.length = " + cs.pendingHMessages.length);
				res.send(JSON.stringify({"messages":cs.pendingHMessages}));
				console.log("Sent " + cs.pendingHMessages.length + " messages to host /chat_pull");
				clearInterval(loopID);
				console.log("Cleared interval hToken");
				cs.messages = cs.messages.concat(cs.pendingHMessages);
				cs.pendingHMessages = [];
			}
		}, refreshTime);
	}


});



var ipV6toV4 = function(ip) {
	// console.log("Called ipV6toV4 with arg " + ip);
	var toReturn = ip === "::1" ? "localhost" : (ip.split(".").length-1 > 0 ? ip.substring(ip.lastIndexOf(":")+1) : ip);
	// console.log("Returned " + toReturn);
	return toReturn;
}

/* Guaranteed to return a unique token (unless, by some miracle, we've exhausted the 16^40 address space!) */
var generateRandomToken = function() {
	var tokenToReturn = "";
	do {
		tokenToReturn = crypto.randomBytes(20).toString("hex");
	} while(tokenToReturn in usedTokens)
		usedTokens[usedTokens.length] = tokenToReturn;
	console.log("usedTokens.length = " + usedTokens.length);
	return tokenToReturn;
}

var prettyTimeNow = function() {
	var d = new Date(),
    h = (d.getHours()<10?'0':'') + d.getHours(),
    m = (d.getMinutes()<10?'0':'') + d.getMinutes();
	s = (d.getSeconds()<10?'0':'') + d.getSeconds();
	return h + ':' + m + ':' + s;
}

// From https://stackoverflow.com/a/7228322/2176546
var randomIntFromInterval = function(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

/* Returns "host" or "visitor" depending upon with whom the given IP address
 * is associated.
 * req_ip can be IPv6 or IPv4 format; this function handles the conversion. */
var isHostOrVisitor = function(req_ip) {
	console.log("isHostOrVisitor called with arg " + req_ip);
	req_ip = ipV6toV4(req_ip);
	if(req_ip === "localhost" || req_ip == "::1" || req_ip.indexOf("127.") === 0 || req_ip === ip.address()) {
		return "host";
	} else {
		return "visitor";
	}
}

/* Returns a ChatSession object which has the given wcToken associated with it
 * Returns null if no ChatSession found which matches the given criteria */
var getChatSessionFromWCToken = function(wcToken) {
	if(!usedTokens.includes(wcToken)) { // The token was never used, so it cannot be associated with a ChatSession
		console.log("wcToken " + wcToken + " was not in usedTokens");
		console.log(usedTokens);
		return null;
	} else {
		for(i = 0; i < sessions.length; i++) {
			if(sessions[i].hToken == wcToken || sessions[i].vToken == wcToken) {
				return sessions[i];
			}
		}
	}
	return null;
}


/* Returns a list of sessions which have not yet been PAIRED (where both the host and visitor have joined) */
var getUnpairedChatSessions = function() {
	returnables = [];
	for(i = 0; i < sessions.length; i++) {
		var cs = sessions[i];
		if(!cs.hostHasJoined || !cs.visitorHasJoined) {
			returnables[returnables.length] = cs;
		}
	}
	return returnables;
}


/* Create a ChatSession class */
var ChatSession = function(visitor, sToken, hToken, vToken) {
	this.visitor = visitor;				// Visitor's IP
	this.startTime = prettyTimeNow();	// Start time of the
	this.messages = [];					// Messages that have already been sent, these can probably be periodically removed
	this.pendingHMessages = [];			// Messages sent FROM the visitor that are waiting to be sent TO the host
	this.pendingVMessages = [];			// Messages sent FROM the host that are waiting to be sent TO the visitor
	this.sToken = sToken;				// ChatSession identifier token
	this.hToken = hToken;				// Host identifier token
	this.vToken = vToken;				// Visitor identifier token
	this.hostHasJoined = false;			// Has the host yet been sent their hToken?
	this.visitorHasJoined = false;		// Has the visitor yet been sent their vToken?
}

/* Create a Message class */
var Message = function(sender, content, mToken, timestamp) {
	this.sender = ipV6toV4(sender);
	this.content = content;
	this.mToken = mToken;
	this.timestamp = timestamp;
}



// Start the server
var server = app.listen(SERVER_PORT, function() {
	var host = ip.address();
	var port = server.address().port;

	console.log("App listening at http://%s:%s", host, port);
});
