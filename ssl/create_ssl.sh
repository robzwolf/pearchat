if [ -z "$1" ]
then
  echo "Please supply a local IP address";
  echo "e.g. 192.168.0.101"
  exit;
fi

echo "Running ssl/create_ca.sh..."
echo ""
ssl/create_ca.sh

echo "Running ssl/create_ct.sh..."
echo ""
ssl/create_ct.sh $1
