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
	You should use sendcommand(options, callback) to send a command to asterisk and recieve a response from asterisk in the callback.
	The options parameter is the same as what you would pass to action.
	*/

	manager.sendcommand({
	    'action':'queuesummary'
	}, function(err, res) {
		console.log(res);
	});

	/*
	The following is an example response from sendcommand().
	*/
	[ { event: 'queuesummary',
	    queue: '12345',
	    loggedin: '1',
	    available: '1',
	    callers: '0',
	    holdtime: '0',
	    talktime: '0',
	    longestholdtime: '0',
	    actionid: '1331637239672302' },
    { event: 'queuesummary',
	    queue: '67890',
	    loggedin: '1',
	    available: '1',
	    callers: '0',
	    holdtime: '0',
	    talktime: '0',
	    longestholdtime: '0',
	    actionid: '1331637239672302' },
  	{ event: 'queuesummarycomplete',
    	actionid: '1331637239672302' } ]

	/*
		Variables are automatically put in the right format. Aside from that everything is passed straight through to Asterisk. See Manager API documentation for what is possible.
	*/

	manager.disconnect();

## Contributors

 * [Philipp Dunkel](https://github.com/phidelta)
 * [Tekay](https://github.com/Tekay)
 * [Kofi Hagan](https://github.com/kofibentum)
 * [Hugo Chinchilla Carbonell](https://github.com/hugochinchilla)
 * [Nick Mooney](https://github.com/Gnewt)
 * [Asp3ctus](https://github.com/Asp3ctus)
 * [Christian Gutierrez](https://github.com/chesstrian)
 * [bchavet](https://github.com/bchavet)

## License

MIT License
-----------

Copyright (C) 2012 by
  Philipp Dunkel <https://github.com/phidelta>
  Tekay <https://github.com/Tekay>
  abroweb <https://github.com/abroweb>
  Kofi Hagan <https://github.com/kofibentum>

Based on a work Copyright (C) 2010 Brian White <mscdex@gmail.com>, but radically altered thereafter so as to constitute a new work.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
