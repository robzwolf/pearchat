if [ -z "$1" ]
then
  echo "Please supply a local IP address";
  echo "e.g. 10.0.2.15"
  exit;
fi

echo "Creating certificate authority, please wait..."
echo ""

# Clean up files from last time, if we have to
rm -f ssl/pear.crt
rm -f ssl/pear.csr
rm -f ssl/pear.key
rm -f ssl/rootCA.key
rm -f ssl/rootCA.pem
rm -f ssl/rootCA.srl

# Create the root certificate and key
openssl genrsa -out ssl/rootCA.key 2048
#; echo GB; echo UK; echo ; echo PearChat; echo ; echo PearChat; echo;
echo "Created key rootCA.key"
openssl req -x509 -new -nodes -key ssl/rootCA.key -sha256 -days 1024 -out ssl/rootCA.pem -subj '/CN=PearChat/O=PearChat/C=GB'
echo "Created certificate rootCA.pem"

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


echo "Created certificate and private key."


