/*
 * NodeJS Asterisk Manager API
 * (Based on https://github.com/mscdex/node-asterisk.git)
 * But radically altered thereafter so as to constitute a new work.
 *
 * © See LICENSE file
 *
 */
/* jshint node:true, newcap:false */
'use strict';
var debug = false;

var EventEmitter = require('events').EventEmitter;
var Net = require('net')
var Utils = require('./utils');

var Manager = function Manager(port, host, username, password, events) {

  var obj = {};
  var context = { backoff: 10000 };
  var properties = ['on', 'once', 'addListener', 'removeListener', 'removeAllListeners',
                    'listeners', 'setMaxListeners', 'emit'];

  context.emitter = new EventEmitter();
  context.held = [];

  properties.map(function(property){
    Object.defineProperty(obj, property, {
      value: context.emitter[property].bind(context.emitter)
    });
  })

  obj.options = {
    port: port,
    host: host || "",
    username: username || "",
    password: password || "",
    events: events || false
  };

  obj.connect = ManagerConnect.bind(obj, context);
  obj.keepConnected = ManagerKeepConnected.bind(obj, context);
  obj.login = ManagerLogin.bind(obj, context);
  obj.action = ManagerAction.bind(obj, context);
  obj.disconnect = ManagerDisconnect.bind(obj, context);
  obj.isConnected = ManagerIsConnected.bind(obj, context);
  obj.connected = obj.isConnected;

  obj.on('rawevent', ManagerEvent.bind(obj, context));
  obj.on('error', function (err) {});
  obj.on('connect', ManagerResetBackoff.bind(obj, context ));

  if (port){
    obj.connect(
      obj.options.port,
      obj.options.host,
      obj.options.username ? obj.login.bind(obj, obj.options.username, password, events) : undefined
    );
  }

  return obj;
};

function ManagerConnect(context, port, host, callback) {
  callback = Utils.defaultCallback(callback);

  context.connection = (context.connection && (context.connection.readyState != 'closed')) ? context.connection : undefined;

  if (context.connection)
    return callback.call(this, null);

  context.authenticated = false;
  context.connection = Net.createConnection(port, host);
  context.connection.setKeepAlive(true);
  context.connection.setNoDelay(true);
  context.connection.setEncoding('utf-8');
  context.connection.once('connect', callback.bind(this, null));
  context.connection.on('connect', this.emit.bind(this, 'connect'));
  context.connection.on('close', this.emit.bind(this, 'close'));
  context.connection.on('end', this.emit.bind(this, 'end'));
  context.connection.on('data', ManagerReader.bind(this, context));
  context.connection.on('error', ManagerConnectionError.bind(this, context));

}

function ManagerConnectionError(context, error) {
  this.emit('error', error);
  if (debug) {
    error = String(error.stack).split(/\r?\n/);
    var msg = error.shift();
    error = error.map(function(line) {
      return ' ↳ ' + line.replace(/^\s*at\s+/, '');
    });
    error.unshift(msg);
    error.forEach(function(line) {
      process.stderr.write(line + '\n');
    });
  }
}

function ManagerReader(context, data) {

  context.lines = context.lines || [];
  context.leftOver = context.leftOver || '';
  context.leftOver += String(data);
  context.lines = context.lines.concat(context.leftOver.split(/\r?\n/));
  context.leftOver = context.lines.pop();

  var lines = [];
  var follow = 0
  var item = {};
  while (context.lines.length) {
    var line = context.lines.shift();
    if (!lines.length && (line.substr(0, 21) === 'Asterisk Call Manager')) {
      // Ignore Greeting
    } else if (!lines.length && (line.substr(0, 9).toLowerCase() === 'response:') && (line.toLowerCase().indexOf('follow') > -1)) {
      follow = 1;
      lines.push(line);
    } else if (follow && ((line === '--END COMMAND--') || (line === '--END SMS EVENT--'))) {
      follow = 2;
      lines.push(line);
    } else if ((follow > 1) && !line.length) {
      follow = 0;
      lines.pop();
      item = {
        'response': 'follows',
        'content': lines.join('\n')
      };

      var matches = item.content.match(/actionid: ([^\r\n]+)/i);
      item.actionid = matches ? matches[1] : item.actionid;

      lines = [];
      this.emit('rawevent', item);
    } else if (!follow && !line.length) {
      // Have a Complete Item
      lines = lines.filter(Utils.stringHasLength);
      item = {};
      while (lines.length) {
        line = lines.shift();
        line = line.split(': ');
        var key = Utils.removeSpaces(line.shift()).toLowerCase();
        line = line.join(': ');

        if (key === 'variable' || key === 'chanvariable') {

          // Handle special case of one or more variables attached to an event and
          // create a variables subobject in the event object
          if (typeof(item[key]) !== 'object')
            item[key] = {};
          line = line.split('=');
          var subkey = line.shift();
          item[key][subkey] = line.join('=');
        } else {
          // Generic case of multiple copies of a key in an event.
          // Create an array of values.
          if (key in item) {
            if (Array.isArray(item[key]))
              item[key].push(line);
            else
              item[key] = [item[key], line];
          } else
            item[key] = line;
        }
      }
      context.follow = false;
      lines = [];
      this.emit('rawevent', item);
    } else {
      lines.push(line);
    }
  }
  context.lines = lines;
}

function ManagerEvent(context, event) {
  var emits = [];
  if (event.response && event.actionid && typeof event.response == "string") {
    // This is the response to an Action
    emits.push(this.emit.bind(this, event.actionid, (event.response.toLowerCase() == 'error') ? event : undefined, event));
    emits.push(this.emit.bind(this, 'response', event));
  } else if (event.response && event.content) {
    // This is a follows response
    emits.push(this.emit.bind(this, context.lastid, undefined, event));
    emits.push(this.emit.bind(this, 'response', event));
  }

  if (event.event) {
    // This is a Real-Event
    event.event = Array.isArray(event.event) ? event.event.shift() : event.event;
    event.event += ''; // Make Sure that this is always a string
    emits.push(this.emit.bind(this, 'managerevent', event));
    emits.push(this.emit.bind(this, event.event.toLowerCase(), event));
    if (('userevent' === event.event.toLowerCase()) && event.userevent)
      emits.push(this.emit.bind(this, 'userevent-' + event.userevent.toLowerCase(), event));

  } else {
    // Ooops I dont know what this is
    emits.push(this.emit.bind(this, 'asterisk', event));
  }
  emits.forEach(process.nextTick.bind(process));
}

function ManagerLogin(context, callback) {
  callback = Utils.defaultCallback(callback);
  var options = this.options;

  this.action({
    'action': 'login',
    'username': options.username,
    'secret': options.password,
    'event': options.events ? 'on' : 'off'
  }, (function(err) {
    if (err) return callback(err);

    process.nextTick(callback.bind(this));
    context.authenticated = true;

    var held = context.held;
    context.held = [];
    held.forEach((function(held) {
      this.action(held.action, held.callback);
    }).bind(this));

  }).bind(this));

  return;
}

function ManagerKeepConnected(context) {
  if (this.reconnect) return;
  if (this.isConnected() === false) {
    this.reconnect = ManagerReconnect.bind(this, context);
    this.on('close', this.reconnect);
  }
}
function ManagerReconnect(context) {
  console.log('Trying to reconnect to AMI in '+ (context.backoff / 1000) +' seconds');

  var connect = this.connect.bind(context, this.options.port, this.options.host, this.login.bind(this));
  setTimeout(connect, context.backoff);
  if(context.backoff < 60000){ //The maximum reconection time is 60 seconds
    context.backoff += 10000; //Increase reconnection time by 10 seconds
  }
}
function ManagerResetBackoff(context) {
    context.backoff = 10000;
}

function MakeManagerAction(req, id) {
  var msg = [];
  msg.push('ActionID: ' + id);

  Object.keys(req).forEach(function (key) {
    var nkey = Utils.removeSpaces(key).toLowerCase();
    if (!nkey.length || ('actionid' == nkey))
      return;

    var nval = req[key];

    nkey = nkey.substr(0, 1).toUpperCase() + nkey.substr(1);

    switch (typeof nval) {
      case 'undefined':
        return;
      case 'object':
        if (!nval) return;
        if (nval instanceof Array) {
          nval = nval.map(function(e) {
            return String(e);
          }).join(',');
        } else if (nval instanceof RegExp === false) {
          Object.keys(nval).forEach( function(name) {
            msg.push( nkey + ": " + name + "=" + nval[name].toString() );
          });
          return;
        }
        break;
      default:
        nval = String(nval);
        break;
    }

    msg.push([nkey, nval].join(': '));
  });

  msg.sort();

  return msg.join('\r\n') + '\r\n\r\n';

}

function ManagerAction(context, action, callback) {
  action = action || {};
  callback = Utils.defaultCallback(callback);

  var id = action.actionid || String((new Date()).getTime());

  while (this.listeners(id).length)
    id += String(Math.floor(Math.random() * 9));

  if (action.actionid)
    delete action.actionid;

  if (!context.authenticated && (action.action !== 'login')) {
    context.held = context.held || [];
    action.actionid = id;
    context.held.push({
      action: action,
      callback: callback
    });
    return id;
  }

  try {

    if (!context.connection) {
      throw new Error('There is no connection yet');
    }

    context.connection.write(MakeManagerAction(action, id), 'utf-8');
  } catch (e) {

    console.log('ERROR: ', e);

    context.held = context.held || [];
    action.actionid = id;
    context.held.push({
      action: action,
      callback: callback
    });

    return id;
  }

  this.once(id, callback);

  return context.lastid = id;
}


function ManagerDisconnect(context, callback) {

  if (this.reconnect) {
    this.removeListener('close', this.reconnect);
  }

  if (context.connection && context.connection.readyState === 'open') {
    context.connection.end();
  }

  delete context.connection;

  if ('function' === typeof callback) {
    setImmediate(callback);
  }
}

function ManagerIsConnected(context) {
  return (context.connection && context.connection.readyState === 'open');
}

// Expose `Manager`.
module.exports = Manager;
