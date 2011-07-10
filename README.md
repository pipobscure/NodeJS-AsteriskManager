# NodeJS Asterisk Manager API

For a project of mine I needed a low level interface to the Asterisk Manager API. I looked around and found https://github.com/mscdex/node-asterisk . While it was a good starting point, it had too many abstractions for my taste. Which is why I based my version on it an then radically refactored it. In the end there now is very little in common with it.

So this is basically a different piece of work, but since there is a shared DNA and I got a good start by depending on Brian's work, I feel like giving credit is appropriate.

## API Overview

	var manager = new (require('asterisk'))(5038, 'localhost');
	
	manager.on('connect', function(err, val) {
		manager.authenticate('username', 'password');
	});
	
	manager.on('close', function() {});
	manager.on('error', function(err) {});
	manager.on('managerevent', function(evt) {});
	manager.on('response', function(res) { /* This is done because we can, not because it is needed! */});
	manager.connect();
	/*
	Possible parameters to connect() are username, password, and a boolean indicating whether the connection should be reconnected if it fails.
	All parameters are optional and are only used for reconnection not for the first authentication!
	*/
	
	manager.action({
		'action':'originate',
		'channel':'SIP/myphone',
		'context':'default',
		'extension':1234,
		'priority':1,
		'variables':{
			'name1':'value1',
			'name2':'value2'
		}
	}, function(err, res) {});
	/*
		Variables are automatically put in the right format. Aside from that everything is passed straight through to Asterisk. See Manager API documentation for what is possible.
	*/
	
	manager.disconnect();