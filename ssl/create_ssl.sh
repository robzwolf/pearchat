if [ -z "$1" ]
then
  echo "Please supply a local IP address";
  echo "e.g. 192.168.0.101"
  exit;
fi

while true; do
	echo "WARNING: This will delete all pre-existing certificates in the ssl/ directory."
	read -p "Proceed? [Y/N]: " yn
	case $yn in
		[Yy]* ) break;;
		[Nn]* ) echo "Exiting..."; exit;;
		* ) echo "Please answer (y)es or (n)o.";;
	esac
done

echo "Running ssl/create_ca.sh..."
echo ""
ssl/create_ca.sh

echo "Running ssl/create_ct.sh..."
echo ""
ssl/create_ct.sh $1
