/*
 * NodeJS Asterisk Manager API
 * (Based on https://github.com/mscdex/node-asterisk.git)
 * But radically altered thereafter so as to constitute a new work.
 *
 * © See LICENSE file
 *
 */
var microtime = require('microtime');
var net = require('net');
var EventEmitter = require('events').EventEmitter;
var readline = (function() {
	var module={ exports:{} };
	(function (exports, module) {
		// experimental function that adds supports for lines using streams
		// only works if the stream is encoded with either 'ascii' or 'utf8'
		// adds a writeln function which is a shorthand for write(str + "\n")
		// adds a 'line' event to readable streams which buffers any data
		// until it encounters EOL
		var _stream_writeln = function writeln(str) {
		  this.write(str + '\r\n');
		};
		// this function is called when a listener for 'line' has been added
		// to the stream. it is not nested in the setup function to prevent
		// any unnecessary closured data
		function _setupLines(stream) {
		  this.writeln = _stream_writeln;
		  // we buffer incoming data until a full line is buffered
		  // then the line event is emitted with the content of the
		  // line (without the newline character)
		  var line_buffer = '';
		  stream.on('data', function(data) {
		    if(typeof(data) != 'string') {
		      line_buffer = '';
		      return;
		    }
		    var split = data.split(/\r?\n/);
		    // if the chunk contains more than one line
		    // we make sure that all the lines are emitted in the right order
		    // and that the end of the chunk is buffered
		    var end = split.pop();
		    while(split.length) {
		      line_buffer += split.shift();
		      this.emit('line', line_buffer);
		      line_buffer = '';
		    }
		    line_buffer += end;
		  });
		  function endlistener () {
		    // when the stream reaches its end, emit the last bit of buffered data
		    // FIXME: find a way to make sure that these data are emitted
		    // before any other 'end' listeners are called
		    if(line_buffer != '') this.emit('line', line_buffer);
		  }
		  stream.on('end', endlistener);
		}

		module.exports = function lines(stream) {
		  // we can start consuming incoming data when at least
		  // one listener is set. note that 'data' can still be listened to.
		  // however, if lines() is called after data have started being consumed
		  // the first lines of the message will be missing.
		  stream.on('newListener', function(type, listener) {
		    if(type === 'line') {
		      _setupLines(this);
		    }
		  });
		  stream.writeln = _stream_writeln;
		};
	}).call(module.exports, module.exports, module);
	return module.exports;
})();

function makeVars(vars) {
	var items=[];
	var item;
	for (item in vars) {
		if (vars.hasOwnProperty(item)) {
			items.push([item,vars[item]].join('='));
		}
	}
	return items.join(',');
};

var Manager = function(port, host) {
	if (this.constructor !== Manager) return new Manager(port, host);
	EventEmitter.call(this);
	host = host || '127.0.0.1';
	port = port || 5038;

	var connection = null;
	var commands = {};
	var authenticated = false;
	this.__defineGetter__('authenticated', function() { return authenticated; });

	this.isConnected = function(){
		return connection ? true : false;
    	};

	var credentials = {};
	this.connect = function(username, password, reconn) {
		credentials.username = username || credentials.username;
		credentials.password = password || credentials.password;
		reconnect = reconn || reconnect;
		var that = this;
		if (!connection || (connection.readyState === 'closed')) {
			console.log("Connecting to "+host+":"+port);
			connection = net.createConnection(port, host);
			connection.on('connect', function() { reconnectDelay=100; that.emit('connect'); });
			connection.on('close', function() { reconnectDelay*=2; if (connection) connection.destroy(); connection=null; that.emit('close'); });
			connection.on('end', function() { reconnectDelay*=2; if (connection) connection.destroy(); connection=null; that.emit('close'); });
			connection.on('error', function(err) { reconnectDelay*=2; if (connection) connection.destroy(); connection=null; that.emit('error', err); that.emit('close'); });
			connection.setEncoding('utf8');
			readline(connection);
			var lines=[];
			connection.on('line', function(line) {
				if (line.substr(0, 21) === "Asterisk Call Manager") return; // Ignore Hello
				if (line.length) {
					lines.push(line);
				} else {
					var item = {};
					while (lines.length) {
						line = lines.shift().split(/\s*:\s*/);
						item[line.shift().toLowerCase()] = line.join(':');
					}
					if (item.response && item.actionid) {
						if (commands[item.actionid]) {
							line = commands[item.actionid];
							commands[item.actionid] = undefined;
							if ("function" === typeof line.callback) {
								line.response = item;
								if (item.response.toLowerCase() === "error") {
									line.callback.call(that, new Error(item.message), line);
								} else {
									line.callback.call(that, undefined, line);
								}
							} else {
								that.emit('response', item);
							}
						} else {
							that.emit('response', item);
						}
					} else if (item.event) {
						item.event = String(item.event).toLowerCase();
						that.emit('managerevent', item);
						that.emit(item.event, item);
					}
				}
			});

		}
	};
	var reconnect = false;
	Object.defineProperty(this, 'reconnect', { value:reconnect, writable:true });

	this.disconnect = function() {
		reconnect = false;
		if (connection && connection.readyState === 'open') {
			connection.end();
		}
	};
	this.action = function(request, callback) {
		if (!connection) {
			if ("function" === typeof callback) callback.call(this, new Error('Not Connected'), undefined);
			return undefined;
		}
		var actionid = request.actionid || microtime.now();
		if ("object" === typeof request.variable) {
			request.variable = makeVars(request.variable);
		}
		commands[actionid] = { request: request, callback: callback};
		var msg = [
			[ 'actionid', actionid ].join(': ')
		];
		for (var key in request) {
			if (request.hasOwnProperty(key)) {
				msg.push([ key, request[key] ].join(': '));
			}
		}
		msg.push('');
		msg.push('');
		return connection.write(msg.join("\r\n"), 'utf-8');
	};
	var reconnectDelay = 100;
	this.authenticate = function(username, password, events, callback) {
		if (!callback && ("function" === typeof events)) {
			callback = events;
			events = 'on';
		}

		events = events || 'on';
		if (!connection || !connection.readyState==='open') {
			if ("function" === typeof callback) callback.call(this, new Error("Not Connected"), undefined);
			return;
		}
		if (this.authenticated) {
			if ("function" === typeof callback) callback.call(this, new Error("Already Authenticated"), undefined);
			return;
		}
		var that = this;
		this.action({
			action:'login',
			username:username,
			secret:password,
			events:events
		}, function(err, val) {
			if (err || !val) {
				that.emit('error', err);
			} else {
				that.emit('authenticate', val);
			}
			if ("function" === typeof callback) callback.call(that, err, val);
		});
	};
	this.on('close', function() {
		if (reconnect) {
			var that = this;
			setTimeout(function() {
				that.connect();
			}, reconnectDelay);
		}
	});
	this.on('connect', function() {
		if (credentials.username) this.authenticate(credentials.username, credentials.password);
	});
	var funcblock = {};
	var datablock = {};
	var timeoutProtect = {};
	this.sendcommand = function(request, callback) {
		if (!connection || !connection.readyState==='open') {
			if ("function" === typeof callback) callback.call(new Error("Not Connected"), null);
			return;
		}

		var that = this;
		this.action(request, function(err, val) {
			if (err || !val) {
				that.emit('error', err);
				if ("function" === typeof callback) callback.call(err, null);
			} else {//console.log("in send command");console.log(val);
				funcblock[val.response.actionid] = callback;
				datablock[val.response.actionid] = [];
				//that.emit('result', val);
				if((val.response.response == "Success") && val.response.message && (val.response.message.indexOf("will follow") < 0)){
					datablock[val.response.actionid].push(val.response);
					funcblock[val.response.actionid](null, datablock[val.response.actionid]);
				}else{
					// Setup the timeout handler
					timeoutProtect[val.response.actionid] = null;
					timeoutProtect[val.response.actionid] = setTimeout(function() {
					  // Clear the local timer variable, indicating the timeout has been triggered.
					  timeoutProtect[val.response.actionid] = null;
					  // Execute the callback with an error argument.
					  funcblock[val.response.actionid]('async timed out', null);
					  //callback({error:'async timed out'});

					}, 1000);
				}
			}
		});
	};
	this.on('managerevent', function(evt){
		//console.log(evt);
		if(evt && datablock[evt.actionid]){
			var EOR = ['queuestatuscomplete','queuesummarycomplete','dahdishowchannelscomplete','peerlistcomplete','dbgetresponse']
			datablock[evt.actionid].push(evt);
			if(EOR.indexOf(evt.event) > -1  /*evt.event == funcblock[evt.actionid].EOR*/){
				if (timeoutProtect[evt.actionid]){
				    // Clear the scheduled timeout handler
				    clearTimeout(timeoutProtect[evt.actionid]);

					funcblock[evt.actionid](null, datablock[evt.actionid]);
				}
			}
		}
	});
};
require('util').inherits(Manager, EventEmitter);

module.exports = Manager;
