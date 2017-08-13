// chat_script.js

/* Global variable declarations */
PearChat.TIMEOUT_CONST = 10000;

$(document).ready(function(){
	
	/* Get IPs and fill them on screen */
	var ipAJAX = $.getJSON({
		type: "GET",
		url: "/ip"
	})
	.done(function(response){
		$("#my-ip span").text(response.visitor).parent().show();
		$("#friend-ip span").text(response.host).parent().show();
	});
	
	/* Messages send handling */
	$("footer form").submit(function(e){
		e.preventDefault();
		
		var messageText = $("#message_textbox").val();
		if($.trim(messageText).length == 0) { return; }
		timestamp = prettyTimeNow();
		mTokenToUse = PearChat.ajaxRequestMToken();
		
		var msgAJAX = $.getJSON({
			type: "POST",
			url: "/chat_send",
			data: {
				"message": messageText,
				"mToken": mTokenToUse,
				"wcToken": PearChat.wcToken,
				"timestamp": timestamp
			},
			beforeSend: function(xhr){
				PearChat.appendMessageToDOM(PearChat.TransmitTypeEnum.SEND, messageText, timestamp, mTokenToUse, true);
				$("#message_textbox").val("");
			}
		})
		.done(function(response){
			console.log("msgAJAX response = ", response);
			if(response.success){
				PearChat.getDirectMessageElementFromDOM(response.mToken).removeClass("faded-msg");
			} else {
				// TODO: Handle failed message send
			}
		});
	});
	
		
	/* Start the long polling */
	PearChat.doLongPoll();
	
});


/* Message long-polling handling */
PearChat.doLongPoll = function() {
	
	console.log("Starting long poll. GET /chat_pull, timeout " + PearChat.TIMEOUT_CONST + "ms. wcToken used is " + PearChat.wcToken);
	
	var pollAJAX = $.getJSON({
		"type": "POST",
		"url": "/chat_pull",
		"timeout": PearChat.TIMEOUT_CONST,
		data: {
			"wcToken": PearChat.wcToken,
			"timeout": PearChat.TIMEOUT_CONST,
		}
	})
	.done(function(response){
		console.log("From long poll, received ", response);
		PearChat.doLongPoll();
		
		if(!!response.messages){			
			for(i = 0; i < response.messages.length; i++) {
				var msg = response.messages[i];
				PearChat.appendMessageToDOM(PearChat.TransmitTypeEnum.RECEIVE, msg.content, msg.timestamp, msg.mToken, false);
			}
		}
	})
	.fail(function(jqXHR, textStatus){
		console.log("Long poll unsuccessful:", textStatus, jqXHR);
		if(textStatus === "timeout"){
			console.log("Long poll received no response after " + PearChat.TIMEOUT_CONST + "ms. ");
		} else {
			console.log("Something weird happened with long poll:", textStatus, jqXHR);
		}
		setTimeout(PearChat.doLongPoll, 200);
	});
}


PearChat.TransmitTypeEnum = {
	SEND: 1,
	RECEIVE: 2
};


PearChat.appendMessageToDOM = function(transmitType, msg, timestamp, mToken, faded) {
	if(faded == undefined)
	{
		faded = false;
	}
	
	// Append the new message to main
	$("main").append('<div class="msg-wrapper" id="msg-' + mToken + '"><div class="msg ' + (transmitType == PearChat.TransmitTypeEnum.SEND ? 'sent' : 'rcvd') + '-msg' + (faded ? ' faded-msg' : '') + '"><p class="msg-text">' + msg + '</p><p class="msg-timestamp">' + timestamp + '</p></div></div>');
		
	// Scroll to the bottom of main	
	$("main")[0].scrollTop = $("main")[0].scrollHeight;
}


PearChat.getDirectMessageElementFromDOM = function(token){
	return $("#msg-" + token + " .msg");
}


PearChat.ajaxRequestMToken = function() {
	var mTokenToReturn = "";
	$.ajax({
		dataType:	"json",
		url:		"/gen_mtoken",
		async:		false
	}).done(function(response){
		mTokenToReturn = response.mToken;
	});
	return mTokenToReturn;
}