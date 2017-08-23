# Check that a rootCA.key and a rootCA.pem file exist
# (i.e. that ssl/create_ca.sh has been run)
if [ -f "ssl/rootCA.key" ] && [ -f "ssl/rootCA.pem" ]
then
	echo "";
else
	echo "ERROR: Run ssl/create_ca.sh first.";
	exit;
fi

if [ -z "$1" ]
then
  echo "Please supply a local IP address";
  echo "e.g. 192.168.0.101"
  exit;
fi

echo "Creating certificate authority, please wait..."
echo ""

# Clean up files from last time, if we have to
rm -f ssl/pear.crt
rm -f ssl/pear.csr
rm -f ssl/pear.key

# Always create a new private key
KEY_OPT="-keyout"

# Clean-up v3.ext if it exists from last time
rm -f ssl/v3.ext;

echo "
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = $1
IP.2 = 127.0.0.1
DNS.1 = localhost" >> ssl/v3.ext

DOMAIN=$1
COMMON_NAME=${2:-*.$1}
SUBJECT="/C=GB/ST=None/L=NB/O=PearChat/CN=$COMMON_NAME"
NUM_OF_DAYS=999
openssl req -new -newkey rsa:2048 -sha256 -nodes $KEY_OPT ssl/pear.key -subj "$SUBJECT" -out ssl/pear.csr
cat ssl/v3.ext | sed s/%%DOMAIN%%/$COMMON_NAME/g > /tmp/__v3.ext
openssl x509 -req -in ssl/pear.csr -CA ssl/rootCA.pem -CAkey ssl/rootCA.key -CAcreateserial -out ssl/pear.crt -days $NUM_OF_DAYS -sha256 -extfile /tmp/__v3.ext 

# Clean-up v3.ext
rm -f ssl/v3.ext

echo " "
echo " +=======================================+"
echo " | Created certificate and private key.  |"
echo " | Remember to install rootCA.pem on all |"
echo " | machines which will use PearChat!     |"
echo " | Run node server_https.js when ready.  |"
echo " +=======================================+"
echo ""
