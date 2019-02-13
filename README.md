# Asterisk Manager API

For a project of mine I needed a low level interface to the Asterisk Manager API. I looked around and found https://github.com/mscdex/node-asterisk . While it was a good starting point, it had too many abstractions for my taste. Which is why I based my version on it an then radically refactored it. In the end there now is very little in common with it.

So this is basically a different piece of work, but since there is a shared DNA and I got a good start by depending on Brian's work, I feel like giving credit is appropriate.

## Install

```
$ npm install asterisk-manager
```

## Usage
```javascript
/**
 * port:  port server
 * host: host server
 * username: username for authentication
 * password: username's password for authentication
 * events: this parameter determines whether events are emited.
 **/
var ami = new require('asterisk-manager')('port','host','username','password', true);

// In case of any connectiviy problems we got you coverd.
ami.keepConnected();

// Listen for any/all AMI events.
ami.on('managerevent', function(evt) {});

// Listen for specific AMI events. A list of event names can be found at
// https://wiki.asterisk.org/wiki/display/AST/Asterisk+11+AMI+Events
ami.on('hangup', function(evt) {});
ami.on('confbridgejoin', function(evt) {});

// Listen for Action responses.
ami.on('response', function(evt) {});

// Perform an AMI Action. A list of actions can be found at
// https://wiki.asterisk.org/wiki/display/AST/Asterisk+11+AMI+Actions
ami.action({
  'action':'originate',
  'channel':'SIP/myphone',
  'context':'default',
  'exten':1234,
  'priority':1,
  'variable':{
    'name1':'value1',
    'name2':'value2'
  }
}, function(err, res) {});
```
## Contributors

 * [Philipp Dunkel](https://github.com/pipobscure)
 * [Igor Escobar](https://github.com/igorescobar)
 * [Tekay](https://github.com/Tekay)
 * [Kofi Hagan](https://github.com/kofibentum)
 * [Hugo Chinchilla Carbonell](https://github.com/hugochinchilla)
 * [Nick Mooney](https://github.com/Gnewt)
 * [Asp3ctus](https://github.com/Asp3ctus)
 * [Christian Gutierrez](https://github.com/chesstrian)
 * [bchavet](https://github.com/bchavet)
 * [Joserwan](https://github.com/joserwan)
 * [Joseph Garrone](https://github.com/garronej)

## License

MIT License
-----------

Copyright (C) 2012 - 2017 by
  [Philipp Dunkel](https://github.com/pipobscure)
  [abroweb](https://github.com/abroweb)
  [Igor Escobar](https://github.com/igorescobar)
  [Tekay](https://github.com/Tekay)
  [Kofi Hagan](https://github.com/kofibentum)
  [Hugo Chinchilla Carbonell](https://github.com/hugochinchilla)
  [Nick Mooney](https://github.com/Gnewt)
  [Asp3ctus](https://github.com/Asp3ctus)
  [Christian Gutierrez](https://github.com/chesstrian)
  [bchavet](https://github.com/bchavet)
  [Joserwan](https://github.com/joserwan)
  [Joseph Garrone](https://github.com/garronej)

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
