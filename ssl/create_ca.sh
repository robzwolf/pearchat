while true; do
	echo "WARNING: This will delete all pre-existing certificates in the ssl folder."
	read -p "Proceed? [Y/N]: " yn
	case $yn in
		[Yy]* ) break;;
		[Nn]* ) echo "Exiting..."; exit;;
		* ) echo "Please answer (y)es or (n)o.";;
	esac
done

echo "Creating root certificate authority, please wait..."
echo ""

# Clean up files from last time, if we have to
rm -f ssl/pear.crt
rm -f ssl/pear.csr
rm -f ssl/pear.key
rm -f ssl/rootCA.key
rm -f ssl/rootCA.pem
rm -f ssl/rootCA.srl
rm -f v3.ext

# Create the root certificate and key
echo "Creating rootCA.key..."
openssl genrsa -out ssl/rootCA.key 2048
echo "Created key rootCA.key."

echo "Creating rootCA.pem..."
openssl req -x509 -new -nodes -key ssl/rootCA.key -sha256 -days 1024 -out ssl/rootCA.pem -subj '/CN=PearChat/O=PearChat/C=GB'
echo "Created certificate rootCA.pem."

echo ""
echo " +=================================================+"
echo " | Successfully created new certificate authority. |"
echo " | Install ssl/rootCA.pem on all machines which    |"
echo " | will use PearChat with this device.             |"
echo " | Next, run ssl/create_ct.sh <local IP>           |"
echo " +=================================================+"
echo " "
