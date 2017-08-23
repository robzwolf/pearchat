# PearChat

## Documentation

### Introduction
PearChat is a pseudo-peer-to-peer messaging client. I call it pseudo because one of the two peers needs to be running a node.js server. 

The idea is as follows:

There are two people, Alice and Bob, who are on the same network and wish to communicate with each other. In this scenario, Alice will be the server and Bob will be a client. However, note that Alice will also be a client. To avoid this confusion, we term Alice's computer the HOST and Bob's computer the VISITOR.

Alice (the host) needs to run a node.js instance on her computer. We will call this node.js instance the SERVER to indicate that is it the application which manages the communication between the host and the visitor. Alice will then connect to her own computer using a web browser to `https://localhost(SERVER_PORT)`, and Bob (the visitor) will connect to Alice via his web browser at `https://(Alice's internal IP):(SERVER_PORT)`. As both web browsers act as clients to the server, we shall call them the WEB CLIENT. This term is used to indicate that it is unimportant whether it is the host's web browser or the visitor's web browser requesting data from the server.

Through this setup, Alice and Bob can send messages to each other. 



### Setup
Because PearChat uses HTTPS, a little initial setup is required.
1) Install node.js on one of the two machines that wish to communicate (must be UNIX-based). Reboot if necessary.
2) Navigate to the `pearchat/` directory using a terminal.
3) Determine the private IP address of the host and the visitor. 
4) Run `ssl/create_ssl.sh <HOST IP>` to create a new certificate authority and a device certificate.  
   For example, if your host's private IP is `192.168.1.150`, then you would run `ssl/create_ssl.sh 192.168.1.150` from the terminal.  
   At the warning about deleting pre-existing certificates, type `Y` to confirm deletion of any pre-existing CA certificates from the `ssl/` directory.
5) On both the host and the visitor, you need to install the newly created PearChat CA certificate.

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
	   
6) Run `node server_https.js` to start the PearChat server on the default port (`8443`).  
   To specify another port, simply run `node server_https.js [port]`. For example, to run the server on port `8000`, run `node server_https.js 8000`.
	
7) Navigate to `https://(HOST IP):(SERVER_PORT)` on the visitor and `https://localhost:(SERVER_PORT)` on the host.

#### Note
Whenever the host changes their private IP address, a new certificate authority and device certificate need to be created. To do this, simply remove the old rootCA.pem certificate from both the host's and visitor's browsers, and then repeat steps 2-5 above.

### Sessions
1) Host starts server
2) Visitor connects to https://(Host's internal IP):(SERVER_PORT)


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
