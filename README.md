	/*
	    ____                  ________          __
	   / __ \___  ____  _____/ ____/ /_  ____  / /_
	  / /_/ / _ \/ __ \/ ___/ /   / __ \/ __ \/ __/
	 / ____/ ___/ /_/ / /  / /___/ / / / /_/ / /_
	/_/    \___/\__,_/_/   \____/_/ /_/\__,_/\__/

	Created by Robbie Jakob-Whitworth during the summer of 2017

	*/

_View this README in a markdown viewer (e.g. http://dillinger.io/) to ensure commands are rendered correctly onscreen_

# PearChat

## Documentation

### Introduction
PearChat is a pseudo-peer-to-peer messaging client. I call it pseudo because one of the two peers needs to be running a node.js server. 

The idea is as follows:

There are two people, Alice and Bob, who are on the same network and wish to communicate with each other. In this scenario, Alice will be the server and Bob will be a client. However, note that Alice will also be a client. To avoid this confusion, we term Alice's computer the HOST and Bob's computer the VISITOR.

Alice (the host) needs to run a node.js instance on her computer. We will call this node.js instance the SERVER to indicate that is it the application which manages the communication between the host and the visitor. Alice will then connect to her own computer using a web browser to `https://localhost:(SERVER_PORT)`, and Bob (the visitor) will connect to Alice via his web browser at `https://(ALICE_IP):(SERVER_PORT)`. As both web browsers act as clients to the server, we shall call them the WEB CLIENT. This term is used to indicate that it is unimportant whether it is the host's web browser or the visitor's web browser requesting data from the server.

Through this setup, Alice and Bob can send messages to each other. 


### Setup
Because PearChat uses HTTPS, a little initial setup is required.
1) Install node.js on one of the two machines that wish to communicate (must be UNIX-based). Reboot if necessary.
2) Navigate to the `pearchat/` directory using a terminal.
3) We need to set execute permissions on the scripts in the `pearchat/ssl/` directory.  
   Run `find ssl/. -name "*.sh" | xargs chmod 777`.
4) Determine the private IP address of the host and the visitor. 
5) Run `ssl/create_ssl.sh <HOST IP>` to create a new certificate authority and a device certificate.  
   For example, if your host's private IP is `192.168.1.150`, then you would run `ssl/create_ssl.sh 192.168.1.150` from the terminal.  
   At the warning about deleting pre-existing certificates, type `Y` to confirm deletion of any pre-existing CA certificates from the `ssl/` directory.
6) On both the host and the visitor, you need to install the newly created PearChat CA certificate. Securely transfer `ssl/rootCA.pem` to the visitor machine, then follow the instructions according to your browser:

   On Chrome:
	1) Navigate to `Settings` > `Manage certificates` > `Trusted Root Certification Authorities` > `Import...`
	2) Import the `pearchat/ssl/`**`rootCA.pem`** (**NOT `pear.crt`**) file. You may have to switch the file type 
	   to `All Files (*.*)`.
	3) At the `Security Warning` alert box, click on `Yes` to install certificate.
	4) Close the certificate manager and exit Chrome settings.
	5) **Restart Chrome.**
	
   On Firefox:
    1) Navigate to `Preferences` > `Advanced` > `Certificates` > `View Certificates` > `Import...`
	2) Import the `pearchat/ssl/`**`rootCA.pem`** (**NOT `pear.crt`**) file.
	3) Tick `Trust this CA to identify web sites` at the `Downloading Certificate` window.
	4) Click `OK` to import the certificate.
	5) Click `OK` to close the certificate manager. Exit preferences.  
	   There is no need to restart Firefox.
	   
7) Run `node server_https.js` to start the PearChat server on the default port (`8443`).  
   To specify another port, simply run `node server_https.js [port]`. For example, to run the server on port `8000`, run `node server_https.js 8000`.	
8) Navigate to `https://(HOST IP):(SERVER_PORT)` on the visitor and `https://localhost:(SERVER_PORT)` on the host.

#### Note
Whenever the host changes their private IP address, a new certificate authority and device certificate need to be created. To do this, simply remove the old rootCA.pem certificate from both the host's and visitor's browsers, and then repeat steps 2-5 above.


### Custom Port
By default, `server_https.js` will run on port `8443`. This can be changed by specifying the port from the command line. For example, to run the server on port `8000`, run `node server_https.js 8000`.


### `ChatSessions`
1) Host starts server.
2) Visitor connects to `https://(HOST_IP):(SERVER_PORT)`.
3) Host connects to `https://localhost:(SERVER_PORT)`.
4) A new `ChatSession` object is created on the server. 

If the host access `https://localhost:(SERVER_PORT)` before the visitor does, they will be greeted with a message (`views/ejs_pages/no_unpaired_sessions.js`) asking them to refresh the page after the visitor has connected to `https://(HOST_IP):(SERVER_PORT)`.


### Finish
When the host and visitor have finished messaging each other, the host should end the node.js instance.


### URLs

node.js runs `server_https.js` on the server. This listens for HTTPS connections on port 8443 by default. See the note on custom ports above to run on a different port.

Various URLs are treated as follows:

#### /
Redirects to /chat

#### /ip
Can accept GET or POST requests. GET will simply set visitorIP to the requester's IP, whereas POST (when given a valid `wcToken`) will set visitorIP to the `ChatSession` associated with that wcToken's visitor IP.
Returns a JSON object with the host IP (hostIP) and the visitor IP (visitorIP).
Used for printing IPs on the web client side.
JSON response object is as follows:

    {
        "host":		<hostIP>,
        "visitor":	<visitorIP>
    }

#### /gen_mtoken
Returns a JSON object with a randomly generated message token from `generateRandomToken()`. Used as an identifier for messages on both the host and visitor.  
JSON response object is as follows:

    {
        "mToken":	<generateRandomToken()>
    }

#### /chat
If the web client is a visitor, a new `ChatSession` is created. If the web client is a host, we check for an existing `ChatSession` and attach them to it, otherwise we send the `no_unpaired_sessions.ejs` page.

Sends the user interface for PearChat (`views/ejs_pages/chat_client_interface.ejs`) to whoever is requesting it (either the host or the visitor).

A random identifier token for the web client is generated and sent with the page (embedded in an inline script). If the web client is a visitor, a new `ChatSession` is created and the token is attached to it. If the web client is a host, and a `ChatSession` already exists, we locate that `ChatSession` and attach our newly created host's token to it. 

#### /chat_send
Accepts POST requests from a web client which is sending a message. The incoming POST data should include the message text (`"message"`), its identifying message token (`"mToken"`), the web client's identifying token (`"wcToken"`) and the timestamp at which it was sent (`"timestamp"`).  

When the message has been accepted, we call asyncChatSendResponse(), which sends a JSON response back to the web client acknowledging receipt of the message. If the web client does not receive a `success:true` response, then the web client handles this appropriately.  
JSON response object is as follows:

    {
        "success":	true,
        "mToken":	<token>
    }
	
When a message is received, we add it to the queue of messages to send to the other web client, ready to be pushed. 

#### /chat_pull
Accepts POST requests from a web client who wants to receive messages from the server. The web client is identified by the `wcToken` in the JSON object they POST.
The web client sends an AJAX request to `/chat_pull`, and the server checks if there are any messages to send. If not, the server holds the connection open (by not responding at all) until either a message appears in the queue, or the web client's connection times out (as specified by `PearChat.TIMEOUT_CONST` in `script.js`.

The upshot of using a system like this is that we do not need to wait for the web client to poll the server for new messages. Instead, by holding the connection open and only sending a response when we have something to send, we've effectively created a framework to push data to the web client on demand, rather than them having to periodically fetch it. We call this framework 'long polling'.


### chat_script.js Structure
`chat_script.js` is the main script that runs the web client. All data on the client side is stored in the `window.PearChat` object. 

When the web client page is loaded, it goes a little like this:

1) `window.PearChat` is created. `PearChat.wcToken` is set to whatever is provided inline with the webpage (as generated by the server).
2) When the DOM is ready to be manipulated (`$(document).ready()`), we first make a POST request to `/ip` (sending our `wcToken` as POST data to identify us), and the server sends back our IP and the host's IP, for rendering in `aside div#my-ip span` and `aside div#friend-ip span`, respectively.
3) We then start the so-called 'long polling' (`PearChat.doLongPoll()`). This function does the following:
    1) Makes a POST request to `/chat_pull`, setting the timeout to whatever was declared at the beginning of the script (`PearChat.TIMEOUT_CONST`) and sending our `wcToken` and our timeout constant in the POST data.
	2) If we receive a response, parse the response for messages and render them on the screen as appropriate.
	3) If we do not receive a response, we wait 200ms and then call the function again.

When the user clicks on 'Submit', the following happens:

1) Cancel the default submit action (`e.preventDefault()`).
2) Check if the user input is empty or entirely white space. If so, exit the function.
3) Get the time now (`prettyTimeNow()`, from `time.js`).
4) Request an `mToken` - a unique identifying token for this message - by sending a GET request to `/gen_mtoken`.
5) Draw the message on screen with the `faded-msg` CSS class to signify that it is still sending.
5) POST, to `/chat_send`, the message text, the requested `mToken`, our `wcToken` and the timestamp of the message.
6) Assuming we receive `success:true` in the response from the server, remove the `faded-msg` class from the message DOM object to signify that it has been successfully sent to the server.  
_Note: In practice, this can often happen so quickly that it is not even visible that the DOM message has been rendered as faded. Try sending lots of messages in quick succession to see this more visibly._


### time.js
This JavaScript file contains just one function `prettyTimeNow()`, which returns the current timestamp in the format `hh:mm:ss`.


### server_https.js Structure
_Note: For URL information, read the section entitled `URLs` above._
When `node server_https.js` is run, the following happens:

1) Attempt to read the server certificate and the server's private key from the `ssl/` directory. If we fail, print an error to the console and exit.
2) Check if a port was specified on the command line. If not, use the default `8443`, otherwise use the one specified by the user.
3) Setup `express` and URL-handling.
4) Start the HTTPS server.

#### asyncChatSendResponse(response, req, res)
Send `response` back using `res` and print it to the console.

#### ipV6toV4(ip)
Newer versions of Windows use IPv6, so node.js often returns IP addresses like `::ffff:10.0.2.71`. This function just returns the last part - in this example, `10.0.2.71`. 

#### generateRandomToken()
Guaranteed to return a unique "token" - a 20-byte (40-character) long string generated by node.js's `crypto` library and stores it in the global `usedTokens` array to ensure that token is never used again.
Technically, if we use up all available 20-byte tokens, this function will loop forever.

#### prettyTimeNow()
Same as in `time.js`.

#### randomIntFromInterval(min, max)
From https://stackoverflow.com/a/7228322/2176546.

Returns a random integer between `min` and `max`, inclusive.

#### isHostOrVisitor(req_ip)
Returns `"host"` or `"visitor"`, depending on whether the provided request IP (`req_ip`) is the host's IP address or the visitor's IP address, respectively.

#### getChatSessionFromWCToken(wcToken)
Returns a `ChatSession` object which has the provided `wcToken` associated with either that `ChatSession`'s host or visitor.

#### getUnpairedChatSessions()
Returns a list of sessions which have not yet been PAIRED (where both the host and visitor have joined).

#### Class: ChatSession(visitor, sToken, hToken, vToken)
Class with the following fields:

    visitor				- Visitor's IP address
	startTime			- Start time of the chat session
	messages			- Messages that have already been sent, these can probably be periodically removed
	pendingHMessages	- Messages sent FROM the visitor that are waiting to be sent TO the host
	pendingVMessages	- Messages sent FROM the host that are waiting to be sent TO the visitor
	sToken				- ChatSession identifier token
	hToken				- Host identifier token
	vToken				- Visitor identifier token
	hostHasJoined		- Has the host yet been sent their hToken?
	visitorHasJoined	- Has the visitor yet been sent their vToken?

#### Class: Message(sender, content, mToken, timestamp)
Class with the following fields:

    sender		- IPv4 address of the sender (corresponding to either the host or visitor)
	content		- Message text
	mToken		- Message identifier token
	timestamp	- Timestamp of the message
	


### ssl/create_ssl.sh <host IP>
Creates a certificate authority on the host (in the `ssl/` directory) and an associated certificate for sending with HTTPS requests.

1) Checks the user supplied a local IP address when running the script. Warns the user and exits if they didn't.
2) Warns the user that this script will delete all pre-existing certificates in the `ssl/` directory and prompts them to continue.
3) Runs `ssl/create_ca.sh`, which creates the certificate authority.
4) Runs `ssl/create_ct.sh <host IP>`, which create the certificate for the host IP address.



### Other Notes
`vToken ` - visitor    identifier token  
`hToken ` - host	   identifier token  
`sToken ` - session    identifier token (`ChatSession` unique identifier)  
`mToken ` - message    identifier token  
`wcToken` - web client identifier token (used by the web client as it does not know whether it is a host or a visitor)  
