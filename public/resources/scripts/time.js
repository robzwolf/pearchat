var prettyTimeNow = function() {
	var d = new Date(),
    h = (d.getHours()<10?'0':'') + d.getHours(),
    m = (d.getMinutes()<10?'0':'') + d.getMinutes();
	s = (d.getSeconds()<10?'0':'') + d.getSeconds();
	return h + ':' + m + ':' + s;
}

/* This function is repeated in server.js */