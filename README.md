# PearChat

## Documentation

### Introduction
PearChat is a pseudo-peer-to-peer messaging client. I call it pseudo because one
of the two peers needs to be running a node.js server. 

The idea is as follows:

There are two people, Alice and Bob, who are on the same network and wish to
communicate with each other. In this scenario, Alice will be the server and Bob
will be a client. However, note that Alice will also be a client. To avoid this
confusion, we term Alice's computer the HOST and Bob's computer the VISITOR.

Alice (the host) needs to run a node.js instance on her computer. We will call
this node.js instance the SERVER to indicate that is it the application which
manages the communication between the host and the visitor.
Alice will then connect	to her own computer using a web browser to
http://localhost:(SERVER_PORT), and Bob (the visitor) will connect to Alice via his web browser
at http://(Alice's internal IP):(SERVER_PORT). As both web browsers act as clients to the server,
we shall call them the WEB CLIENT. This term is used to indicate that it is
unimportant whether it is the host's web browser or the visitor's web browser
requesting data from the server.

Through this setup, Alice and Bob can send messages to each other. 



### Setup
1) Install node.js on one of the two machines that wish to communicate. Reboot if
necessary.
2) Run 'node server.js' from the PearChat directory.
3) Navigate to http://localhost:(SERVER_PORT) on the server and http://(Server's internal IP):(SERVER_PORT) on
the client.



### Sessions
1) Host starts server
2) Visitor connects to http://(host's IP):(SERVER_PORT)



### Structure

node.js runs server.js on the server. This listens for HTTP connections on port 1337.
Various URLs are treated as follows:

#### /
Redirects to /chat

#### /ip
Returns a JSON object with the host IP (hostIP) and the visitor IP (visitorIP).
Used for printing IPs on the web client side.
JSON object is as follows:

    {
        "host":		<hostIP,>
        "visitor":	<visitorIP>
    }

#### /gen_mtoken
Returns a JSON object with a randomly generated message token from generateRandomToken(). Used as an identifier for messages on both the host and visitor.  
JSON object is as follows:

    {
        "mToken":	<generateRandomToken()>
    }

#### /chat
Sends the user interface for PearChat (chat_client_interface.html) to whoever is requesting it (either the host or the visitor).  
TODO: Starts a session

#### /chat_send
Accepts POST requests from a web client which is sending a message. The incoming POST data should include the message text ("message"), its identifying token ("token") and the timestamp at which it was sent ("timestamp").  
TODO: Work out and document storage of messages in a ChatSession  
When the message has been accepted, we call asyncChatSendResponse(), which sends a JSON response back to the web client acknowledging receipt of the message. If the web client does not receive a 'success:true' response, then the web client handles this appropriately.  
JSON object is as follows:

    {
        "success":	true,
        "mToken":	<token>
    }

#### /chat_pull
Used by the web client to receive messages from the server.  
The web client sends an AJAX request to /chat_pull, and the server deliberately delays its response. 




### Other Notes
`vToken ` - visitor 	 identifier token  
`hToken ` - host	 	   identifier token  
`sToken ` - session 	 identifier token (ChatSession unique identifier)  
`mToken ` - message 	 identifier token  
`wcToken` - web client identifier token (used by the web client as it does not know whether it is a host or a visitor)  
