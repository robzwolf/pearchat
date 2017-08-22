if [ -z "$1" ]
then
  echo "Please supply a local IP address";
  echo "e.g. 10.0.2.15"
  exit;
fi

# Create a new private key if one doesn't exist, or use the existing one if it does
# if [ -f device.key ]; then
  # KEY_OPT="-key"
# else
  # KEY_OPT="-keyout"
# fi

# Always create a new private key
KEY_OPT="-keyout"

# Clean-up v3.ext if it exists from last time
rm -f v3.ext;

echo "
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = $1
IP.2 = 127.0.0.1
DNS.1 = localhost" >> v3.ext


DOMAIN=$1
COMMON_NAME=${2:-*.$1}
SUBJECT="/C=CA/ST=None/L=NB/O=None/CN=$COMMON_NAME"
NUM_OF_DAYS=999
openssl req -new -newkey rsa:2048 -sha256 -nodes $KEY_OPT ssl/pear.key -subj "$SUBJECT" -out ssl/pear.csr
cat v3.ext | sed s/%%DOMAIN%%/$COMMON_NAME/g > /tmp/__v3.ext
openssl x509 -req -in ssl/pear.csr -CA ssl/rootCA.pem -CAkey ssl/rootCA.key -CAcreateserial -out ssl/pear.crt -days $NUM_OF_DAYS -sha256 -extfile /tmp/__v3.ext 

# move output files to final filenames
# mv device.csr $DOMAIN.csr
# cp device.crt $DOMAIN.crt
#mv pear.csr pear.csr
#mv pear.crt pear.crt

# remove temp file
#rm -f pear.crt;

echo "Created certificate and private key."

# echo 
# echo "###########################################################################"
# echo Done! 
# echo "###########################################################################"
# echo "To use these files on your server, simply copy both $DOMAIN.csr and"
# echo "device.key to your webserver, and use like so (if Apache, for example)"
# echo 
# echo "    SSLCertificateFile    /path_to_your_files/$DOMAIN.crt"
# echo "    SSLCertificateKeyFile /path_to_your_files/device.key"
