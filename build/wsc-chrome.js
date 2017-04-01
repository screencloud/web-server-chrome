(function() {
function Buffer(opts) {
    /*
      FIFO queue type that lets you check when able to consume the
      right amount of data.

     */
    this.opts = opts;
    this.max_buffer_size = 104857600;
    this._size = 0;
    this.deque = [];
}

Buffer.prototype = {
    clear: function() {
        this.deque = [];
        this._size = 0;
    },
    flatten: function() {
        if (this.deque.length == 1) { return this.deque[0]; }
        // flattens the buffer deque to one element
        var totalSz = 0;
        for (var i=0; i<this.deque.length; i++) {
            totalSz += this.deque[i].byteLength;
        }
        var arr = new Uint8Array(totalSz);
        var idx = 0;
        for (var i=0; i<this.deque.length; i++) {
            arr.set(new Uint8Array(this.deque[i]), idx);
            idx += this.deque[i].byteLength;
        }
        this.deque = [arr.buffer];
        return arr.buffer;
    },
    add: function(data) {
        console.assert(data instanceof ArrayBuffer);
		//console.assert(data.byteLength > 0)
        this._size = this._size + data.byteLength;
        this.deque.push(data);
    },
    consume_any_max: function(maxsz) {
        if (this.size() <= maxsz) {
            return this.consume(this.size());
        } else {
            return this.consume(maxsz);
        }
    },
    consume: function(sz,putback) {
        // returns a single array buffer of size sz
        if (sz > this._size) {
            console.assert(false);
            return false;
        }

        var consumed = 0;

        var ret = new Uint8Array(sz);
        var curbuf;
        // consume from the left

        while (consumed < sz) {
            curbuf = this.deque[0];
            console.assert(curbuf instanceof ArrayBuffer);

            if (consumed + curbuf.byteLength <= sz) {
                // curbuf fits in completely to return buffer
                ret.set( new Uint8Array(curbuf), consumed );
                consumed = consumed + curbuf.byteLength;
                this.deque.shift();
            } else {
                // curbuf too big! this will be the last buffer
                var sliceleft = new Uint8Array( curbuf, 0, sz - consumed );
                //console.log('left slice',sliceleft)

                ret.set( sliceleft, consumed );
                // we spliced off data, so set curbuf in deque

                var remainsz = curbuf.byteLength - (sz - consumed);
                var sliceright = new Uint8Array(curbuf, sz - consumed, remainsz);
                //console.log('right slice',sliceright)
                var remain = new Uint8Array(remainsz);
                remain.set(sliceright, 0);
                //console.log('right slice (newbuf)',remain)

                this.deque[0] = remain.buffer;
                break;
            }
        }
        if (putback) {
            this.deque = [ret.buffer].concat(this.deque);
        } else {
            this._size -= sz;
        }
        return ret.buffer;
    },
    size: function() {
        return this._size;
    }
};


function test_buffer() {
    var b = new Buffer();
    b.add( new Uint8Array([1,2,3,4]).buffer );
    console.assert( b.size() == 4 );
    b.add( new Uint8Array([5,6,7]).buffer );
    console.assert( b.size() == 7 );
    b.add( new Uint8Array([8,9,10,11,12]).buffer );
    console.assert( b.size() == 12 );
    var data;

    data = b.consume(1);
    console.assert(new Uint8Array(data)[0] == 1);
    console.assert( data.byteLength == 1 );

    data = b.consume(1);
    console.assert(new Uint8Array(data)[0] == 2);
    console.assert( data.byteLength == 1 );

    data = b.consume(2);
    console.assert( data.byteLength == 2 );
    console.assert(new Uint8Array(data)[0] == 3);
    console.assert(new Uint8Array(data)[1] == 4);
}

function test_buffer2() {
    var b = new Buffer();
    b.add( new Uint8Array([1,2,3,4]).buffer );
    console.assert( b.size() == 4 );
    b.add( new Uint8Array([5,6,7]).buffer );
    console.assert( b.size() == 7 );
    b.add( new Uint8Array([8,9,10,11,12]).buffer );
    console.assert( b.size() == 12 );
    var data;

    data = b.consume(6);
    var adata = new Uint8Array(data);
    console.assert(data.byteLength == 6);
    console.assert(adata[0] == 1);
    console.assert(adata[1] == 2);
    console.assert(adata[2] == 3);
    console.assert(adata[3] == 4);
    console.assert(adata[4] == 5);
    console.assert(adata[5] == 6);
}

function test_buffer3() {
    var b = new Buffer();
    b.add( new Uint8Array([1,2,3,4]).buffer );
    b.add( new Uint8Array([5,6,7]).buffer );
    b.add( new Uint8Array([8,9,10,11,12]).buffer );
    var data;
    data = b.consume_any_max(1024);
    var adata = new Uint8Array(data);
    console.assert(data.byteLength == 12);
    for (var i=0;i<12;i++) {
        console.assert(adata[i] == i+1);
    }
}

function test_buffer4() {
    var b = new Buffer();
    b.add( new Uint8Array([1,2,3,4]).buffer );
    b.add( new Uint8Array([5,6,7]).buffer );
    b.add( new Uint8Array([8,9,10,11,12]).buffer );
    var data;
    data = b.consume_any_max(10);
    var adata = new Uint8Array(data);
    console.assert(data.byteLength == 10);
    for (var i=0;i<10;i++) {
        console.assert(adata[i] == i+1);
    }
}


if (false) {
    test_buffer();
    test_buffer2();
    test_buffer3();
    test_buffer4();
}
WSC.Buffer = Buffer;
})();

(function() {
    function ui8IndexOf(arr, s, startIndex) {
        // searches a ui8array for subarray s starting at startIndex
        startIndex = startIndex || 0;
        var match = false;
        for (var i=startIndex; i<arr.length - s.length + 1; i++) {
            if (arr[i] == s[0]) {
                match = true;
                for (var j=1; j<s.length; j++) {
                    if (arr[i+j] != s[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    return i;
                }
            }
        }
        return -1;
    }


    function ChromeSocketXMLHttpRequest() {
        this.onload = null;
        this._finished = false;
        this.onerror = null;
        this.opts = null;

        this.timedOut = false;
        this.timeout = 0;
        this.timeoutId = null;

        this.stream = null;
        
        this.connecting = false;
        this.writing = false;
        this.haderror = false;
        this.closed = false;

        this.sockInfo = null;
        this.responseType = null;

        this.extraHeaders = {};

        this.headersReceived = false;
        this.responseHeaders = null;
        this.responseHeadersParsed = null;
        this.responseBody = null;
        this.responseLength = null;
        this.responseBytesRead = null;
        this.requestBody = null;

        this.secured = false;
    }

    ChromeSocketXMLHttpRequest.prototype = {
        open: function(method, url, async) {
            this.opts = { method:method,
                          url:url,
                          async:true };
            this.uri = WSC.parseUri(this.opts.url);
            //console.assert(this.uri.protocol == 'http:') // https not supported for chrome.socket yet
        },
        setRequestHeader: function(key, val) {
            this.extraHeaders[key] = val;
        },
        cancel: function() {
            if (! this.stream.closed) { this.stream.close(); }
        },
        send: function(data) {
            //console.log('xhr send payload',this.opts.method, data)
            this.requestBody = data;
            chrome.sockets.tcp.create({}, _.bind(this.onCreate, this));
            if (this.timeout !== 0) {
                this.timeoutId = setTimeout( _.bind(this.checkTimeout, this), this.timeout );
            }
        },
        createRequestHeaders: function() {
            var lines = [];
            var headers = {//'Connection': 'close',
                           //'Accept-Encoding': 'identity', // servers will send us chunked encoding even if we dont want it, bastards
//                           'Accept-Encoding': 'identity;q=1.0 *;q=0', // servers will send us chunked encoding even if we dont want it, bastards
                           //                       'User-Agent': 'uTorrent/330B(30235)(server)(30235)', // setRequestHeader /extra header is doing this
                           'Host': this.uri.host};
            _.extend(headers, this.extraHeaders);
            if (this.opts.method == 'GET') {
                //                headers['Content-Length'] == '0'
            } else if (this.opts.method == 'POST') {
                if (this.requestBody) {
                    headers['Content-Length'] = this.requestBody.byteLength.toString();
                } else {
                    headers['Content-Length'] = '0';
                    // make sure content-length 0 included ?
                }
            } else {
                this.error('unsupported method');
            }
            lines.push(this.opts.method + ' ' + this.uri.pathname + this.uri.search + ' HTTP/1.1');
            //console.log('making request',lines[0],headers)
            for (var key in headers) {
                lines.push( key + ': ' + headers[key] );
            }
            return lines.join('\r\n') + '\r\n\r\n';
        },
        checkTimeout: function() {
            if (! this._finished) {
                this.error({error:'timeout'}); // call ontimeout instead
            }
        },
        error: function(data) {
            this._finished = true;
            //console.log('error:',data)
            this.haderror = true;
            if (this.onerror) {
                console.assert(typeof data == "object");
                data.target = {error:true};
                this.onerror(data);
            }
            if (! this.stream.closed) {
                this.stream.close();
            }
        },
        onStreamClose: function(evt) {
            //console.log('xhr closed')
            if (! this._finished) {
                this.error({error:'stream closed'});
            }
        },
        onCreate: function(sockInfo) {
            if (this.closed) { return; }
            this.stream = new WSC.IOStream(sockInfo.socketId);
            this.stream.addCloseCallback(this.onStreamClose.bind(this));
            this.sockInfo = sockInfo;
            this.connecting = true;
            var host = this.getHost();
            var port = this.getPort();
            //console.log('connecting to',host,port)
            chrome.sockets.tcp.setPaused( sockInfo.socketId, true, function() {
                chrome.sockets.tcp.connect( sockInfo.socketId, host, port, _.bind(this.onConnect, this) );
            }.bind(this));
        },
        onConnect: function(result) {
            //console.log('connected to',this.getHost())
            var lasterr = chrome.runtime.lastError;
            if (this.closed) { return; }
            this.connecting = false;
            if (this.timedOut) {
                return;
            } else if (lasterr) {
                this.error({error:lasterr.message});
            } else if (result < 0) {
                this.error({error:'connection error',
                            code:result});
            } else {
                if (this.uri.protocol == 'https:' && ! this.secured) {
                    this.secured = true;
                    //console.log('securing socket',this.sockInfo.socketId)
                    chrome.sockets.tcp.secure(this.sockInfo.socketId, this.onConnect.bind(this));
                    return;
                }
                var headers = this.createRequestHeaders();
                //console.log('request to',this.getHost(),headers)
                this.stream.writeBuffer.add( new TextEncoder('utf-8').encode(headers).buffer );
                if (this.requestBody) {
                    this.stream.writeBuffer.add( this.requestBody );
                    this.requestBody = null;
                }
                this.stream.tryWrite();
                this.stream.readUntil('\r\n\r\n', this.onHeaders.bind(this));
                chrome.sockets.tcp.setPaused( this.sockInfo.socketId, false, function(){});
            }
        },
        getHost: function() {
            return this.uri.hostname;
        },
        getPort: function() {
            if (this.uri.protocol == 'https:') {
                return parseInt(this.uri.port) || 443;
            } else {
                return parseInt(this.uri.port) || 80;
            }
        },
        onHeaders: function(data) {
            // not sure what encoding for headers is exactly, latin1 or something? whatever.
            var headers = WSC.ui82str(new Uint8Array(data));
            //console.log('found http tracker response headers', headers)
            this.headersReceived = true;
            this.responseHeaders = headers;
            var response = parseHeaders(this.responseHeaders);
            this.responseDataParsed = response;
            this.responseHeadersParsed = response.headers;
            //console.log(this.getHost(),'parsed http response headers',response)
            this.responseLength = parseInt(response.headers['content-length']);
            this.responseBytesRead = this.stream.readBuffer.size();

            if (response.headers['transfer-encoding'] &&
                response.headers['transfer-encoding'] == 'chunked') {
                this.chunks = new WSC.Buffer();
                //console.log('looking for an \\r\\n')
                this.stream.readUntil("\r\n", this.getNewChunk.bind(this));
                //this.error('chunked encoding')
            } else {
                if (! response.headers['content-length']) {
                    this.error("no content length in response");
                } else {
                    //console.log('read bytes',this.responseLength)
                    this.stream.readBytes(this.responseLength, this.onBody.bind(this));
                }
            }
        },
        onChunkDone: function(data) {
            this.chunks.add(data);
            this.stream.readUntil("\r\n", this.getNewChunk.bind(this));
        },
        getNewChunk: function(data) {
            var s = WSC.ui82str(new Uint8Array(data.slice(0,data.byteLength-2)));
            var len = parseInt(s,16);
            if (isNaN(len)) {
                this.error('invalid chunked encoding response');
                return;
            }
            //console.log('looking for new chunk of len',len)
            if (len == 0) {
                //console.log('got all chunks',this.chunks)
                var body = this.chunks.flatten();
                this.onBody(body);
            } else {
                this.stream.readBytes(len+2, this.onChunkDone.bind(this));
            }
        },
        onBody: function(body) {
            this.responseBody = body;
            var evt = {target: {headers:this.responseDataParsed.headers,
                                code:this.responseDataParsed.code, /* code is wrong, should be status */
                                status:this.responseDataParsed.code,
                                responseHeaders:this.responseHeaders,
                                responseHeadersParsed:this.responseHeadersParsed,
                                response:body}
                      };
            if (this.responseType && this.responseType.toLowerCase() == 'xml') {
                evt.target.responseXML = (new DOMParser()).parseFromString(new TextDecoder('utf-8').decode(body), "text/xml");
            }
            this.onload(evt);
            this._finished = true;
            if (! this.stream.closed) { this.stream.close(); }
            // all done!!! (close connection...)
        }
    };

    function parseHeaders(s) {
        var lines = s.split('\r\n');
        var firstLine = lines[0].split(/ +/);
        var proto = firstLine[0];
        var code = firstLine[1];
        var status = firstLine.slice(2,firstLine.length).join(' ');
        var headers = {};

        for (var i=1; i<lines.length; i++) {
            var line = lines[i];
            if (line) {
                var j = line.indexOf(':');
                var key = line.slice(0,j).toLowerCase();
                headers[key] = line.slice(j+1,line.length).trim();
            }
        }
        return {code: code,
                status: status,
                proto: proto,
                headers: headers};
    }
    WSC.ChromeSocketXMLHttpRequest = ChromeSocketXMLHttpRequest;

    window.testxhr = function() {
        console.log('creating XHR');
        var xhr = new ChromeSocketXMLHttpRequest();
        xhr.open("GET","https://www.google.com");
        xhr.timeout = 8000;
        xhr.onload = xhr.onerror = xhr.ontimeout = function(evt) {
            console.log('xhr result:',evt);
        };
        xhr.send();
        window.txhr = xhr;
    };
})();

(function() {

	window.WSC = {store_id:"ofhbbkphhbklhfoeikjpcbhemlocgigb"};
	WSC.DEBUG = false;
	WSC.VERBOSE = false;

function getchromeversion() {
    var version;
    var match = navigator.userAgent.match(/Chrome\/([\d]+)/);
    if (match) {
        var version = parseInt(match[1]);
    }
    return version;
}
WSC.getchromeversion = getchromeversion;


	WSC.maybePromise = function(maybePromiseObj, resolveFn, ctx) {
		if(maybePromiseObj && maybePromiseObj.then) {
			return maybePromiseObj.then(function(ret){ return resolveFn.call(ctx, ret); });
		} else {
			return resolveFn.call(ctx, maybePromiseObj);
		}
	};
	WSC.strformat = function(s) {
		var args = Array.prototype.slice.call(arguments,1,arguments.length);
		return s.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined'
			    ? args[number]
			    : match
			;
		});
	};
	WSC.parse_header = function(line) {

	};
	WSC.encode_header = function(name, d) {
		if (!d) {
			return name;
		}
		var out = [name];
		for (var k in d) {
			var v = d[k];
			if (! v) {
				out.push(k);
			} else {
				// quote?
				outpush(k + '=' + v);
			}
		}
		return out.join('; ');
	};
	
if (! String.prototype.endsWith) {
    String.prototype.endsWith = function(substr) {
        for (var i=0; i<substr.length; i++) {
            if (this[this.length - 1 - i] !== substr[substr.length - 1 - i]) {
                return false;
            }
        }
        return true;
    };
}
if (! String.prototype.startsWith) {
    String.prototype.startsWith = function(substr) {
        for (var i=0; i<substr.length; i++) {
            if (this[i] !== substr[i]) {
                return false;
            }
        }
        return true;
    };
}

// common stuff


    function EntryCache() {
        this.cache = {};
    }
    var EntryCacheprototype = {
        clearTorrent: function() {
            // todo
        },
        clearKey: function(skey) {
            var todelete = [];
            for (var key in this.cache) {
                if (key.startsWith(skey)) {
                    todelete.push(key);
                }
            }
            for (var i=0; i<todelete.length; i++) {
                delete this.cache[todelete[i]];
            }
        },
        clear: function() {
            this.cache = {};
        },
        unset: function(k) {
            delete this.cache[k];
        },
        set: function(k,v) {
            this.cache[k] = {v: v};
            // Copy the last-modified date for later verification.
            if (v.lastModifiedDate) {
                this.cache[k].lastModifiedDate = v.lastModifiedDate;
            }
        },
        get: function(k) {
            if (this.cache[k]) {
                var v = this.cache[k].v;
                // If the file was modified, then the file object's last-modified date
                // will be different (greater than) the copied date. In this case the
                // file object will have stale contents so we must invalidate the cache.
                // This happens when reading files from Google Drive.
                if (v.lastModifiedDate && this.cache[k].lastModifiedDate < v.lastModifiedDate) {
                    console.log("invalidate file by lastModifiedDate");
                    this.unset(k);
                    return null;
                } else {
                    return v;
                }
            }
        }
    };
    _.extend(EntryCache.prototype, EntryCacheprototype);

    window.WSC.entryCache = new EntryCache();
    window.WSC.entryFileCache = new EntryCache();

WSC.recursiveGetEntry = function(filesystem, path, callback) {
    var useCache = false;
    // XXX duplication with jstorrent
    var cacheKey = filesystem.filesystem.name +
        filesystem.fullPath +
        '/' + path.join('/');
    var inCache = WSC.entryCache.get(cacheKey);
    if (useCache && inCache) { 
        //console.log('cache hit');
        callback(inCache); return;
    }

    var state = {e:filesystem};

    function recurse(e) {
        if (path.length == 0) {
            if (e.name == 'TypeMismatchError') {
                state.e.getDirectory(state.path, {create:false}, recurse, recurse);
            } else if (e.isFile) {
                if (useCache) WSC.entryCache.set(cacheKey,e);
                callback(e);
            } else if (e.isDirectory) {
                //console.log(filesystem,path,cacheKey,state)
                if (useCache) WSC.entryCache.set(cacheKey,e);
                callback(e);
            } else {
                callback({error:'path not found'});
            }
        } else if (e.isDirectory) {
            if (path.length > 1) {
                // this is not calling error callback, simply timing out!!!
                e.getDirectory(path.shift(), {create:false}, recurse, recurse);
            } else {
                state.e = e;
                state.path = _.clone(path);
                e.getFile(path.shift(), {create:false}, recurse, recurse);
            }
        } else if (e.name == 'NotFoundError') {
            callback({error:e.name, message:e.message});
        } else {
            callback({error:'file exists'});
        }
    }
    recurse(filesystem);
};

WSC.parseHeaders = function(lines) {
    var headers = {};
    var line;
    // TODO - multi line headers?
    for (var i=0;i<lines.length;i++) {
        line = lines[i];
        var j = line.indexOf(':');
        headers[ line.slice(0,j).toLowerCase() ] = line.slice(j+1,line.length).trim();
    }
    return headers;
};
function ui82str(arr, startOffset) {
    console.assert(arr);
    if (! startOffset) { startOffset = 0; }
    var length = arr.length - startOffset; // XXX a few random exceptions here
    var str = "";
    for (var i=0; i<length; i++) {
        str += String.fromCharCode(arr[i + startOffset]);
    }
    return str;
}
function ui82arr(arr, startOffset) {
    if (! startOffset) { startOffset = 0; }
    var length = arr.length - startOffset;
    var outarr = [];
    for (var i=0; i<length; i++) {
        outarr.push(arr[i + startOffset]);
    }
    return outarr;
}
function str2ab(s) {
    var arr = [];
    for (var i=0; i<s.length; i++) {
        arr.push(s.charCodeAt(i));
    }
    return new Uint8Array(arr).buffer;
}
    WSC.ui82str = ui82str;
WSC.str2ab = str2ab;
    WSC.stringToUint8Array = function(string) {
        var encoder = new TextEncoder();
        return encoder.encode(string);
    };

    WSC.arrayBufferToString = function(buffer) {
        var decoder = new TextDecoder();
        return decoder.decode(buffer);
    };
/*
    var logToScreen = function(log) {
        logger.textContent += log + "\n";
    }

*/

function parseUri(str) {
    return new URL(str); // can throw exception, watch out!
}

    
WSC.parseUri = parseUri;

    
})();

(function() {
    _DEBUG = false;
    function HTTPConnection(stream) {
        this.stream = stream;
        this.curRequest = null;
        this.onRequestCallback = null;
        //this.log('new connection')
        this.closed = false;
    }

    HTTPConnection.prototype = {
        log: function(msg) {
            console.log(this.stream.sockId,msg);
        },
        tryRead: function() {
            this.stream.readUntil('\r\n\r\n',this.onHeaders.bind(this));
        },
        write: function(data) {
            if (typeof data == 'string') {
                // this is using TextEncoder with utf-8
                var buf = WSC.stringToUint8Array(data).buffer;
            } else {
                var buf = data;
            }
            this.stream.writeBuffer.add(buf);
            this.stream.tryWrite();
        },
        close: function() {
            console.log('http conn close');
            this.closed = true;
            this.stream.close();
        },
        addRequestCallback: function(cb) {
            this.onRequestCallback = cb; 
        },
        onHeaders: function(data) {
            // TODO - http headers are Latin1, not ascii...
            var datastr = WSC.arrayBufferToString(data);
            var lines = datastr.split('\r\n');
            var firstline = lines[0];
            var flparts = firstline.split(' ');
            var method = flparts[0];
            var uri = flparts[1];
            var version = flparts[2];

            var headers = WSC.parseHeaders(lines.slice(1,lines.length-2));
            this.curRequest = new WSC.HTTPRequest({headers:headers,
                                           method:method,
                                           uri:uri,
                                           version:version,
                                                   connection:this});
            if (_DEBUG) {
                this.log(this.curRequest.uri);
            }
            if (headers['content-length']) {
                var clen = parseInt(headers['content-length']);
                // TODO -- handle 100 continue..
                if (clen > 0) {
                    console.log('request had content length',clen);
                    this.stream.readBytes(clen, this.onRequestBody.bind(this));
                    return;
                } else {
                    this.curRequest.body = null;
                }
            }

            
            if (method == 'GET') {
                this.onRequest(this.curRequest);
            } else if (method == 'HEAD') {
                this.onRequest(this.curRequest);
            } else if (method == 'PUT') {
                // handle request BODY?
                this.onRequest(this.curRequest);
            } else {
                console.error('how to handle',this.curRequest);
            }
        },
        onRequestBody: function(body) {
            var req = this.curRequest;
            var ct = req.headers['content-type'];
            var default_charset = 'utf-8';
            if (ct) {
                ct = ct.toLowerCase();
                if (ct.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
                    var charset_i = ct.indexOf('charset=');
                    if (charset_i != -1) {
                        var charset = ct.slice(charset_i + 'charset='.length,
                                               ct.length);
                        console.log('using charset',charset);
                    } else {
                        var charset = default_charset;
                    }

                    var bodydata = new TextDecoder(charset).decode(body);
                    var bodyparams = {};
                    var items = bodydata.split('&');
                    for (var i=0; i<items.length; i++) {
                        var kv = items[i].split('=');
                        bodyparams[ decodeURIComponent(kv[0]) ] = decodeURIComponent(kv[1]);
                    }
                    req.bodyparams = bodyparams;
                }
            }
            this.curRequest.body = body;
            this.onRequest(this.curRequest);
        },
        onRequest: function(request) {
            this.onRequestCallback(request);
        }
    };

    WSC.HTTPConnection = HTTPConnection;

})();

(function(){
    _DEBUG = false;

    function getEntryFile( entry, callback ) {
        // XXX if file is 0 bytes, and then write some data, it stays cached... which is bad...
        
        var cacheKey = entry.filesystem.name + '/' + entry.fullPath;
        var inCache = WSC.entryFileCache.get(cacheKey);
        if (inCache) { 
            //console.log('file cache hit'); 
            callback(inCache); return; }
        
        entry.file( function(file) {
            if (false) {
                WSC.entryFileCache.set(cacheKey, file);
            }
            callback(file);
        }, function(evt) {
            // todo -- actually respond with the file error?
            // or cleanup the context at least
            console.error('entry.file() error',evt);

            evt.error = true;
            // could be NotFoundError
            callback(evt);
        });
    }

    function ProxyHandler(validator, request) {
        WSC.BaseHandler.prototype.constructor.call(this);
        this.validator = validator;
    }
    _.extend(ProxyHandler.prototype, {
        get: function() {
            if (! this.validator(this.request)) {
                this.responseLength = 0;
                this.writeHeaders(403);
                this.finish();
                return;
            }
            console.log('proxyhandler get',this.request);
            var url = this.request.arguments.url;
            var xhr = new WSC.ChromeSocketXMLHttpRequest();
            var chromeheaders = {
//                'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//                'Accept-Encoding':'gzip, deflate, sdch',
                'Accept-Language':'en-US,en;q=0.8',
                'Cache-Control':'no-cache',
//                'Connection':'keep-alive',
                'Pragma':'no-cache',
                'Upgrade-Insecure-Requests':'1',
                'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36'
            };
            for (var k in chromeheaders) {
                xhr.setRequestHeader(k, chromeheaders[k]);
            }
            xhr.open("GET", url);
            xhr.onload = this.onfetched.bind(this);
            xhr.send();
        },
        onfetched: function(evt) {
            for (var header in evt.target.headers) {
                this.setHeader(header, evt.target.headers[header]);
            }
            this.responseLength = evt.target.response.byteLength;
            this.writeHeaders(evt.target.code);
            this.write(evt.target.response);
            this.finish();
        }
    }, WSC.BaseHandler.prototype);
    WSC.ProxyHandler = ProxyHandler;

    function DirectoryEntryHandler(fs, request) {
        WSC.BaseHandler.prototype.constructor.call(this);
        this.fs = fs;
        //this.debugInterval = setInterval( this.debug.bind(this), 1000)
        this.entry = null;
        this.file = null;
        this.readChunkSize = 4096 * 16;
        this.fileOffset = 0;
        this.fileEndOffset = 0;
        this.bodyWritten = 0;
        this.isDirectoryListing = false;
        request.connection.stream.onclose = this.onClose.bind(this);
    }
    _.extend(DirectoryEntryHandler.prototype, {
        onClose: function() {
            //console.log('closed',this.request.path)
            clearInterval(this.debugInterval);
        },
        debug: function() {
            //console.log(this.request.connection.stream.sockId,'debug wb:',this.request.connection.stream.writeBuffer.size())
        },
        head: function() {
            this.get();
        },
        put: function() {
            if (! this.app.opts.optUpload) {
                this.responseLength = 0;
                this.writeHeaders(400);
                this.finish();
                return;
            }

            // if upload enabled in options...
            // check if file exists...
            this.fs.getByPath(this.request.path, this.onPutEntry.bind(this));
        },
        onPutEntry: function(entry) {
            var parts = this.request.path.split('/');
            var path = parts.slice(0,parts.length-1).join('/');
            var filename = parts[parts.length-1];

            if (entry && entry.error == 'path not found') {
                // good, we can upload it here ...
                this.fs.getByPath(path, this.onPutFolder.bind(this,filename));
            } else {
                var allowReplaceFile = true;
                console.log('file already exists', entry);
                if (allowReplaceFile) {
                    // truncate file
                    var onremove = function(evt) {
                        this.fs.getByPath(path, this.onPutFolder.bind(this,filename));
                    }.bind(this);
                    entry.remove( onremove, onremove );
                }
            }
        },
        onPutFolder: function(filename, folder) {
            var onwritten = function(evt) {
                console.log('write complete',evt);
                // TODO write 400 in other cases...
                this.responseLength = 0;
                this.writeHeaders(200);
                this.finish();
            }.bind(this);
            var body = this.request.body;
            function onfile(entry) {
                if (entry && entry.isFile) {
                    function onwriter(writer) {
                        writer.onwrite = writer.onerror = onwritten;
                        writer.write(new Blob([body]));
                    }
                    entry.createWriter(onwriter, onwriter);
                }
            }
            folder.getFile(filename, {create:true}, onfile, onfile);
        },
        get: function() {
            //this.request.connection.stream.onWriteBufferEmpty = this.onWriteBufferEmpty.bind(this)

            this.setHeader('accept-ranges','bytes');
            this.setHeader('connection','keep-alive');
            if (! this.fs) {
                this.write("error: need to select a directory to serve",500);
                return;
            }
            //var path = decodeURI(this.request.path)

            // strip '/' off end of path

            if (this.rewrite_to) {
                this.fs.getByPath(this.rewrite_to, this.onEntry.bind(this));
            } else if (this.fs.isFile) {
                this.onEntry(this.fs);
            } else {
                this.fs.getByPath(this.request.path, this.onEntry.bind(this));
            }
        },
        doReadChunk: function() {
            //console.log(this.request.connection.stream.sockId, 'doReadChunk', this.fileOffset)
            var reader = new FileReader();

            var endByte = Math.min(this.fileOffset + this.readChunkSize,
                                   this.fileEndOffset);
            if (endByte >= this.file.size) {
                console.error('bad readChunk');
                console.assert(false);
            }

            //console.log('doReadChunk',this.fileOffset,endByte-this.fileOffset)
            reader.onload = this.onReadChunk.bind(this);
            reader.onerror = this.onReadChunk.bind(this);
            var blobSlice = this.file.slice(this.fileOffset, endByte + 1);
            var oldOffset = this.fileOffset;
            this.fileOffset += (endByte - this.fileOffset) + 1;
            //console.log('offset',oldOffset,this.fileOffset)
            reader.readAsArrayBuffer(blobSlice);
        },
        onWriteBufferEmpty: function() {
            if (! this.file) {
                console.error('!this.file');

                return;
            }
            console.assert( this.bodyWritten <= this.responseLength );
            //console.log('onWriteBufferEmpty', this.bodyWritten, '/', this.responseLength)
            if (this.bodyWritten > this.responseLength) {
                console.assert(false);
            } else if (this.bodyWritten == this.responseLength) {
                this.request.connection.stream.onWriteBufferEmpty = null;
                this.finish();
                return;
            } else {
                if (this.request.connection.stream.remoteclosed) {
                    this.request.connection.close();
                    // still read?
                } else if (! this.request.connection.stream.closed) {
                    this.doReadChunk();
                }
            }
        },
        onReadChunk: function(evt) {
            //console.log('onReadChunk')
            if (evt.target.result) {
                this.bodyWritten += evt.target.result.byteLength;
                if (this.bodyWritten >= this.responseLength) {
                    //this.request.connection.stream.onWriteBufferEmpty = null
                }
                //console.log(this.request.connection.stream.sockId,'write',evt.target.result.byteLength)
                this.request.connection.write(evt.target.result);
            } else {
                console.error('onreadchunk error',evt.target.error);
                this.request.connection.close();
            }
        },
        onEntry: function(entry) {
            this.entry = entry;

            if (this.entry && this.entry.isDirectory && ! this.request.origpath.endsWith('/')) {
                var newloc = this.request.origpath + '/';
                this.setHeader('location', newloc); // XXX - encode latin-1 somehow?
                this.responseLength = 0;
                //console.log('redirect ->',newloc)
                this.writeHeaders(301);

                this.finish();
                return;
            }



            if (this.request.connection.stream.closed) {
                console.warn(this.request.connection.stream.sockId,'request closed while processing request');
                return;
            }
            if (! entry) {
                if (this.request.method == "HEAD") {
                    this.responseLength = 0;
                    this.writeHeaders(404);
                    this.finish();
                } else {
                    this.write('no entry',404);
                }
            } else if (entry.error) {
                if (this.request.method == "HEAD") {
                    this.responseLength = 0;
                    this.writeHeaders(404);
                    this.finish();
                } else {
                    this.write('entry not found: ' + (this.rewrite_to || this.request.path), 404);
                }
            } else if (entry.isFile) {
                this.renderFileContents(entry);
            } else {
                // directory
                var reader = entry.createReader();
                var allresults = [];
                this.isDirectoryListing = true;

                function onreaderr(evt) {
                    WSC.entryCache.unset(this.entry.filesystem.name + this.entry.fullPath);
                    console.error('error reading dir',evt);
                    this.request.connection.close();
                }

                function alldone(results) {
                    if (this.app.opts.optRenderIndex) {
                        for (var i=0; i<results.length; i++) {
                            if (results[i].name == 'index.html' || results[i].name == 'index.htm') {
                                this.setHeader('content-type','text/html; charset=utf-8');
                                this.renderFileContents(results[i]);
                                return;
                            }
                        }
                    }
                    if (this.request.arguments && this.request.arguments.json == '1' ||
                        (this.request.headers.accept && this.request.headers.accept.toLowerCase() == 'applicaiton/json')
                       ) {
                        this.renderDirectoryListingJSON(results);
                    } else if (this.request.arguments && this.request.arguments.static == '1' ||
                        this.request.arguments.static == 'true' ||
						this.app.opts.optStatic
                       ) {
                        this.renderDirectoryListing(results);
                    } else {
                        this.renderDirectoryListingTemplate(results);
                    }
                }

                function onreadsuccess(results) {
                    //console.log('onreadsuccess',results.length)
                    if (results.length == 0) {
                        alldone.bind(this)(allresults);
                    } else {
                        allresults = allresults.concat( results );
                        reader.readEntries( onreadsuccess.bind(this),
                                            onreaderr.bind(this) );
                    }
                }

                //console.log('readentries')
                reader.readEntries( onreadsuccess.bind(this),
                                    onreaderr.bind(this));
            }
        },
        renderFileContents: function(entry, file) {
            getEntryFile(entry, function(file) {
                if (file instanceof DOMException) {
                    this.write("File not found", 404);
                    this.finish();
                    return;
                }
                this.file = file;
                if (this.request.method == "HEAD") {
                    this.responseLength = this.file.size;
                    this.writeHeaders(200);
                    this.finish();

                } else if (this.file.size > this.readChunkSize * 8 ||
                           this.request.headers.range) {
                    this.request.connection.stream.onWriteBufferEmpty = this.onWriteBufferEmpty.bind(this);

                    if (this.request.headers.range) {
                        console.log(this.request.connection.stream.sockId,'RANGE',this.request.headers.range);

                        var range = this.request.headers.range.split('=')[1].trim();

                        var rparts = range.split('-');
                        if (! rparts[1]) {
                            this.fileOffset = parseInt(rparts[0]);
                            this.fileEndOffset = this.file.size - 1;
                            this.responseLength = this.file.size - this.fileOffset;
                            this.setHeader('content-range','bytes '+this.fileOffset+'-'+(this.file.size-1)+'/'+this.file.size);
                            if (this.fileOffset == 0) {
                                this.writeHeaders(200);
                            } else {
                                this.writeHeaders(206);
                            }

                        } else {
                            //debugger // TODO -- add support for partial file fetching...
                            //this.writeHeaders(500)
                            this.fileOffset = parseInt(rparts[0]);
                            this.fileEndOffset = parseInt(rparts[1]);
                            this.responseLength = this.fileEndOffset - this.fileOffset + 1;
                            this.setHeader('content-range','bytes '+this.fileOffset+'-'+(this.fileEndOffset)+'/'+this.file.size);
                            this.writeHeaders(206);
                        }


                    } else {
                        if (_DEBUG) {
                            console.log('large file, streaming mode!');
                        }
                        this.fileOffset = 0;
                        this.fileEndOffset = this.file.size - 1;
                        this.responseLength = this.file.size;
                        this.writeHeaders(200);
                    }
                    
                    



                } else {
                    //console.log(entry,file)
                    var fr = new FileReader();
                    var cb = this.onReadEntry.bind(this);
                    fr.onload = cb;
                    fr.onerror = cb;
                    fr.readAsArrayBuffer(file);
                }
            }.bind(this));
        },
        entriesSortFunc: function(a,b) {
            var anl = a.name.toLowerCase();
            var bnl = b.name.toLowerCase();
            if (a.isDirectory && b.isDirectory) {
                return anl.localeCompare(bnl);
            } else if (a.isDirectory) {
                return -1;
            } else if (b.isDirectory) {
                return 1;
            } else {
                /// both files
                return anl.localeCompare(bnl);
            }
                
        },
        renderDirectoryListingJSON: function(results) {
            this.setHeader('content-type','application/json; charset=utf-8');
            this.write(JSON.stringify(results.map(function(f) { return { name:f.name,
                                                                         fullPath:f.fullPath,
                                                                         isFile:f.isFile,
                                                                         isDirectory:f.isDirectory };
                                                              }), null, 2));
        },
        renderDirectoryListingTemplate: function(results) {
            if (! WSC.template_data) {
                return this.renderDirectoryListing(results);
            }

            this.setHeader('transfer-encoding','chunked');
            this.writeHeaders(200);
            this.writeChunk(WSC.template_data );
            var html = ['<script>start("current directory...")</script>',
                        '<script>addRow("..","..",1,"170 B","10/2/15, 8:32:45 PM");</script>'];

            for (var i=0; i<results.length; i++) {
                var rawname = results[i].name;
                var name = encodeURIComponent(results[i].name);
                var isdirectory = results[i].isDirectory;
                var filesize = '""';
                //var modified = '10/13/15, 10:38:40 AM'
                var modified = '';
                // raw, urlencoded, isdirectory, size, 
                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+','+filesize+',"'+modified+'");</script>');
            }
            var data = html.join('\n');
            data = new TextEncoder('utf-8').encode(data).buffer;
            this.writeChunk(data);
            this.request.connection.write(WSC.str2ab('0\r\n\r\n'));
            this.finish();
        },
        renderDirectoryListing: function(results) {
            var html = ['<html>'];
            html.push('<style>li.directory {background:#aab}</style>');
            html.push('<a href="../?static=1">parent</a>');
            html.push('<ul>');
            results.sort( this.entriesSortFunc );
            
            // TODO -- add sorting (by query parameter?) show file size?

            for (var i=0; i<results.length; i++) {
                var name = _.escape(results[i].name);
                if (results[i].isDirectory) {
                    html.push('<li class="directory"><a href="' + name + '/?static=1">' + name + '</a></li>');
                } else {
                    html.push('<li><a href="' + name + '?static=1">' + name + '</a></li>');
                }
            }
            html.push('</ul></html>');
            this.setHeader('content-type','text/html; charset=utf-8');
            this.write(html.join('\n'));
        },
        onReadEntry: function(evt) {
            if (evt.type == 'error') {
                console.error('error reading',evt.target.error);
                // clear this file from cache...
                WSC.entryFileCache.unset( this.entry.filesystem.name + '/' + this.entry.fullPath );

                this.request.connection.close();
            } else {
            // set mime types etc?
                this.write(evt.target.result);
            }

        }
    }, WSC.BaseHandler.prototype);

    if (chrome.runtime.id == WSC.store_id) {
        
        chrome.runtime.getPackageDirectoryEntry( function(pentry) {
            var template_filename = 'directory-listing-template.html';
            var onfile = function(e) {
                if (e instanceof DOMException) {
                    console.error('template fetch:',e);
                } else {
                    var onfile = function(file) {
                        var onread = function(evt) {
                            WSC.template_data = evt.target.result;
                        };
                        var fr = new FileReader();
                        fr.onload = onread;
                        fr.onerror = onread;
                        fr.readAsArrayBuffer(file);
                    };
                    e.file( onfile, onfile );
                }
            };
            pentry.getFile(template_filename,{create:false},onfile,onfile);
        });
    }


    WSC.DirectoryEntryHandler = DirectoryEntryHandler;

})();

(function() {
var HTTPRESPONSES = {
    "200": "OK", 
    "201": "Created", 
    "202": "Accepted", 
    "203": "Non-Authoritative Information", 
    "204": "No Content", 
    "205": "Reset Content", 
    "206": "Partial Content", 
    "400": "Bad Request", 
    "401": "Unauthorized", 
    "402": "Payment Required", 
    "403": "Forbidden", 
    "404": "Not Found", 
    "405": "Method Not Allowed", 
    "406": "Not Acceptable", 
    "407": "Proxy Authentication Required", 
    "408": "Request Timeout", 
    "409": "Conflict", 
    "410": "Gone", 
    "411": "Length Required", 
    "412": "Precondition Failed", 
    "413": "Request Entity Too Large", 
    "414": "Request-URI Too Long", 
    "415": "Unsupported Media Type", 
    "416": "Requested Range Not Satisfiable", 
    "417": "Expectation Failed", 
    "100": "Continue", 
    "101": "Switching Protocols", 
    "300": "Multiple Choices", 
    "301": "Moved Permanently", 
    "302": "Found", 
    "303": "See Other", 
    "304": "Not Modified", 
    "305": "Use Proxy", 
    "306": "(Unused)", 
    "307": "Temporary Redirect", 
    "500": "Internal Server Error", 
    "501": "Not Implemented", 
    "502": "Bad Gateway", 
    "503": "Service Unavailable", 
    "504": "Gateway Timeout", 
    "505": "HTTP Version Not Supported"
}
WSC.HTTPRESPONSES = HTTPRESPONSES
})();

// add this file to your "blackbox" e.g. blackboxing, making devtools not show logs as coming from here
(function() {
	if (console.clog) { return; }
	var L = {
		UPNP: { show: true, color:'green' },
		WSC: { show: true, color:'green' }
	};
    Object.keys(L).forEach( function(k) { L[k].name = k; } );
    window.ORIGINALCONSOLE = {log:console.log, warn:console.warn, error:console.error};
    window.LOGLISTENERS = [];
    function wrappedlog(method) {
        var wrapped = function() {
            var args = Array.prototype.slice.call(arguments);
            ORIGINALCONSOLE[method].apply(console,args);
            if (method == 'error') {
                args = ['%cError','color:red'].concat(args);
            } else if (method == 'warn') {
                args = ['%cWarn','color:orange'].concat(args);
            }
        };
        return wrapped;
    }
    
    console.log = wrappedlog('log');
    console.warn = wrappedlog('warn');
    console.error = wrappedlog('error');
    console.clog = function() {
        if (! WSC.DEBUG) { return; }
        // category specific logging
        var tolog = arguments[0];
		tolog = L[tolog];
        if (tolog === undefined) {
            var args = Array.prototype.slice.call(arguments,1,arguments.length);
            args = ['%c' + 'UNDEF', 'color:#ac0'].concat(args);
            consolelog.apply(console,args);
        } else if (tolog.show) {
            var args = Array.prototype.slice.call(arguments,1,arguments.length);
            if (tolog.color) {
                args = ['%c' + tolog.name, 'color:'+tolog.color].concat(args);
            }
            ORIGINALCONSOLE.log.apply(console,args);
        }
    };
})();

(function() {
var MIMETYPES = {
  "123": "application/vnd.lotus-1-2-3", 
  "3dml": "text/vnd.in3d.3dml", 
  "3ds": "image/x-3ds", 
  "3g2": "video/3gpp2", 
  "3gp": "video/3gpp", 
  "7z": "application/x-7z-compressed", 
  "aab": "application/x-authorware-bin", 
  "aac": "audio/x-aac", 
  "aam": "application/x-authorware-map", 
  "aas": "application/x-authorware-seg", 
  "abw": "application/x-abiword", 
  "ac": "application/pkix-attr-cert", 
  "acc": "application/vnd.americandynamics.acc", 
  "ace": "application/x-ace-compressed", 
  "acu": "application/vnd.acucobol", 
  "acutc": "application/vnd.acucorp", 
  "adp": "audio/adpcm", 
  "aep": "application/vnd.audiograph", 
  "afm": "application/x-font-type1", 
  "afp": "application/vnd.ibm.modcap", 
  "ahead": "application/vnd.ahead.space", 
  "ai": "application/postscript", 
  "aif": "audio/x-aiff", 
  "aifc": "audio/x-aiff", 
  "aiff": "audio/x-aiff", 
  "air": "application/vnd.adobe.air-application-installer-package+zip", 
  "ait": "application/vnd.dvb.ait", 
  "ami": "application/vnd.amiga.ami", 
  "apk": "application/vnd.android.package-archive", 
  "appcache": "text/cache-manifest", 
  "application": "application/x-ms-application", 
  "apr": "application/vnd.lotus-approach", 
  "arc": "application/x-freearc", 
  "asc": "application/pgp-signature", 
  "asf": "video/x-ms-asf", 
  "asm": "text/x-asm", 
  "aso": "application/vnd.accpac.simply.aso", 
  "asx": "video/x-ms-asf", 
  "atc": "application/vnd.acucorp", 
  "atom": "application/atom+xml", 
  "atomcat": "application/atomcat+xml", 
  "atomsvc": "application/atomsvc+xml", 
  "atx": "application/vnd.antix.game-component", 
  "au": "audio/basic", 
  "avi": "video/x-msvideo", 
  "aw": "application/applixware", 
  "azf": "application/vnd.airzip.filesecure.azf", 
  "azs": "application/vnd.airzip.filesecure.azs", 
  "azw": "application/vnd.amazon.ebook", 
  "bat": "application/x-msdownload", 
  "bcpio": "application/x-bcpio", 
  "bdf": "application/x-font-bdf", 
  "bdm": "application/vnd.syncml.dm+wbxml", 
  "bed": "application/vnd.realvnc.bed", 
  "bh2": "application/vnd.fujitsu.oasysprs", 
  "bin": "application/octet-stream", 
  "blb": "application/x-blorb", 
  "blorb": "application/x-blorb", 
  "bmi": "application/vnd.bmi", 
  "bmp": "image/bmp", 
  "book": "application/vnd.framemaker", 
  "box": "application/vnd.previewsystems.box", 
  "boz": "application/x-bzip2", 
  "bpk": "application/octet-stream", 
  "btif": "image/prs.btif", 
  "bz": "application/x-bzip", 
  "bz2": "application/x-bzip2", 
  "c": "text/x-c", 
  "c11amc": "application/vnd.cluetrust.cartomobile-config", 
  "c11amz": "application/vnd.cluetrust.cartomobile-config-pkg", 
  "c4d": "application/vnd.clonk.c4group", 
  "c4f": "application/vnd.clonk.c4group", 
  "c4g": "application/vnd.clonk.c4group", 
  "c4p": "application/vnd.clonk.c4group", 
  "c4u": "application/vnd.clonk.c4group", 
  "cab": "application/vnd.ms-cab-compressed", 
  "caf": "audio/x-caf", 
  "cap": "application/vnd.tcpdump.pcap", 
  "car": "application/vnd.curl.car", 
  "cat": "application/vnd.ms-pki.seccat", 
  "cb7": "application/x-cbr", 
  "cba": "application/x-cbr", 
  "cbr": "application/x-cbr", 
  "cbt": "application/x-cbr", 
  "cbz": "application/x-cbr", 
  "cc": "text/x-c", 
  "cct": "application/x-director", 
  "ccxml": "application/ccxml+xml", 
  "cdbcmsg": "application/vnd.contact.cmsg", 
  "cdf": "application/x-netcdf", 
  "cdkey": "application/vnd.mediastation.cdkey", 
  "cdmia": "application/cdmi-capability", 
  "cdmic": "application/cdmi-container", 
  "cdmid": "application/cdmi-domain", 
  "cdmio": "application/cdmi-object", 
  "cdmiq": "application/cdmi-queue", 
  "cdx": "chemical/x-cdx", 
  "cdxml": "application/vnd.chemdraw+xml", 
  "cdy": "application/vnd.cinderella", 
  "cer": "application/pkix-cert", 
  "cfs": "application/x-cfs-compressed", 
  "cgm": "image/cgm", 
  "chat": "application/x-chat", 
  "chm": "application/vnd.ms-htmlhelp", 
  "chrt": "application/vnd.kde.kchart", 
  "cif": "chemical/x-cif", 
  "cii": "application/vnd.anser-web-certificate-issue-initiation", 
  "cil": "application/vnd.ms-artgalry", 
  "cla": "application/vnd.claymore", 
  "class": "application/java-vm", 
  "clkk": "application/vnd.crick.clicker.keyboard", 
  "clkp": "application/vnd.crick.clicker.palette", 
  "clkt": "application/vnd.crick.clicker.template", 
  "clkw": "application/vnd.crick.clicker.wordbank", 
  "clkx": "application/vnd.crick.clicker", 
  "clp": "application/x-msclip", 
  "cmc": "application/vnd.cosmocaller", 
  "cmdf": "chemical/x-cmdf", 
  "cml": "chemical/x-cml", 
  "cmp": "application/vnd.yellowriver-custom-menu", 
  "cmx": "image/x-cmx", 
  "cod": "application/vnd.rim.cod", 
  "com": "application/x-msdownload", 
  "conf": "text/plain", 
  "cpio": "application/x-cpio", 
  "cpp": "text/x-c", 
  "cpt": "application/mac-compactpro", 
  "crd": "application/x-mscardfile", 
  "crl": "application/pkix-crl", 
  "crt": "application/x-x509-ca-cert", 
  "cryptonote": "application/vnd.rig.cryptonote", 
  "csh": "application/x-csh", 
  "csml": "chemical/x-csml", 
  "csp": "application/vnd.commonspace", 
  "css": "text/css", 
  "cst": "application/x-director", 
  "csv": "text/csv", 
  "cu": "application/cu-seeme", 
  "curl": "text/vnd.curl", 
  "cww": "application/prs.cww", 
  "cxt": "application/x-director", 
  "cxx": "text/x-c", 
  "dae": "model/vnd.collada+xml", 
  "daf": "application/vnd.mobius.daf", 
  "dart": "application/vnd.dart", 
  "dataless": "application/vnd.fdsn.seed", 
  "davmount": "application/davmount+xml", 
  "dbk": "application/docbook+xml", 
  "dcr": "application/x-director", 
  "dcurl": "text/vnd.curl.dcurl", 
  "dd2": "application/vnd.oma.dd2+xml", 
  "ddd": "application/vnd.fujixerox.ddd", 
  "deb": "application/x-debian-package", 
  "def": "text/plain", 
  "deploy": "application/octet-stream", 
  "der": "application/x-x509-ca-cert", 
  "dfac": "application/vnd.dreamfactory", 
  "dgc": "application/x-dgc-compressed", 
  "dic": "text/x-c", 
  "dir": "application/x-director", 
  "dis": "application/vnd.mobius.dis", 
  "dist": "application/octet-stream", 
  "distz": "application/octet-stream", 
  "djv": "image/vnd.djvu", 
  "djvu": "image/vnd.djvu", 
  "dll": "application/x-msdownload", 
  "dmg": "application/x-apple-diskimage", 
  "dmp": "application/vnd.tcpdump.pcap", 
  "dms": "application/octet-stream", 
  "dna": "application/vnd.dna", 
  "doc": "application/msword", 
  "docm": "application/vnd.ms-word.document.macroenabled.12", 
  "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
  "dot": "application/msword", 
  "dotm": "application/vnd.ms-word.template.macroenabled.12", 
  "dotx": "application/vnd.openxmlformats-officedocument.wordprocessingml.template", 
  "dp": "application/vnd.osgi.dp", 
  "dpg": "application/vnd.dpgraph", 
  "dra": "audio/vnd.dra", 
  "dsc": "text/prs.lines.tag", 
  "dssc": "application/dssc+der", 
  "dtb": "application/x-dtbook+xml", 
  "dtd": "application/xml-dtd", 
  "dts": "audio/vnd.dts", 
  "dtshd": "audio/vnd.dts.hd", 
  "dump": "application/octet-stream", 
  "dvb": "video/vnd.dvb.file", 
  "dvi": "application/x-dvi", 
  "dwf": "model/vnd.dwf", 
  "dwg": "image/vnd.dwg", 
  "dxf": "image/vnd.dxf", 
  "dxp": "application/vnd.spotfire.dxp", 
  "dxr": "application/x-director", 
  "ecelp4800": "audio/vnd.nuera.ecelp4800", 
  "ecelp7470": "audio/vnd.nuera.ecelp7470", 
  "ecelp9600": "audio/vnd.nuera.ecelp9600", 
  "ecma": "application/ecmascript", 
  "edm": "application/vnd.novadigm.edm", 
  "edx": "application/vnd.novadigm.edx", 
  "efif": "application/vnd.picsel", 
  "ei6": "application/vnd.pg.osasli", 
  "elc": "application/octet-stream", 
  "emf": "application/x-msmetafile", 
  "eml": "message/rfc822", 
  "emma": "application/emma+xml", 
  "emz": "application/x-msmetafile", 
  "eol": "audio/vnd.digital-winds", 
  "eot": "application/vnd.ms-fontobject", 
  "eps": "application/postscript", 
  "epub": "application/epub+zip", 
  "es3": "application/vnd.eszigno3+xml", 
  "esa": "application/vnd.osgi.subsystem", 
  "esf": "application/vnd.epson.esf", 
  "et3": "application/vnd.eszigno3+xml", 
  "etx": "text/x-setext", 
  "eva": "application/x-eva", 
  "evy": "application/x-envoy", 
  "exe": "application/x-msdownload", 
  "exi": "application/exi", 
  "ext": "application/vnd.novadigm.ext", 
  "ez": "application/andrew-inset", 
  "ez2": "application/vnd.ezpix-album", 
  "ez3": "application/vnd.ezpix-package", 
  "f": "text/x-fortran", 
  "f4v": "video/x-f4v", 
  "f77": "text/x-fortran", 
  "f90": "text/x-fortran", 
  "fbs": "image/vnd.fastbidsheet", 
  "fcdt": "application/vnd.adobe.formscentral.fcdt", 
  "fcs": "application/vnd.isac.fcs", 
  "fdf": "application/vnd.fdf", 
  "fe_launch": "application/vnd.denovo.fcselayout-link", 
  "fg5": "application/vnd.fujitsu.oasysgp", 
  "fgd": "application/x-director", 
  "fh": "image/x-freehand", 
  "fh4": "image/x-freehand", 
  "fh5": "image/x-freehand", 
  "fh7": "image/x-freehand", 
  "fhc": "image/x-freehand", 
  "fig": "application/x-xfig", 
  "flac": "audio/x-flac", 
  "fli": "video/x-fli", 
  "flo": "application/vnd.micrografx.flo", 
  "flv": "video/x-flv", 
  "flw": "application/vnd.kde.kivio", 
  "flx": "text/vnd.fmi.flexstor", 
  "fly": "text/vnd.fly", 
  "fm": "application/vnd.framemaker", 
  "fnc": "application/vnd.frogans.fnc", 
  "for": "text/x-fortran", 
  "fpx": "image/vnd.fpx", 
  "frame": "application/vnd.framemaker", 
  "fsc": "application/vnd.fsc.weblaunch", 
  "fst": "image/vnd.fst", 
  "ftc": "application/vnd.fluxtime.clip", 
  "fti": "application/vnd.anser-web-funds-transfer-initiation", 
  "fvt": "video/vnd.fvt", 
  "fxp": "application/vnd.adobe.fxp", 
  "fxpl": "application/vnd.adobe.fxp", 
  "fzs": "application/vnd.fuzzysheet", 
  "g2w": "application/vnd.geoplan", 
  "g3": "image/g3fax", 
  "g3w": "application/vnd.geospace", 
  "gac": "application/vnd.groove-account", 
  "gam": "application/x-tads", 
  "gbr": "application/rpki-ghostbusters", 
  "gca": "application/x-gca-compressed", 
  "gdl": "model/vnd.gdl", 
  "geo": "application/vnd.dynageo", 
  "gex": "application/vnd.geometry-explorer", 
  "ggb": "application/vnd.geogebra.file", 
  "ggt": "application/vnd.geogebra.tool", 
  "ghf": "application/vnd.groove-help", 
  "gif": "image/gif", 
  "gim": "application/vnd.groove-identity-message", 
  "gml": "application/gml+xml", 
  "gmx": "application/vnd.gmx", 
  "gnumeric": "application/x-gnumeric", 
  "gph": "application/vnd.flographit", 
  "gpx": "application/gpx+xml", 
  "gqf": "application/vnd.grafeq", 
  "gqs": "application/vnd.grafeq", 
  "gram": "application/srgs", 
  "gramps": "application/x-gramps-xml", 
  "gre": "application/vnd.geometry-explorer", 
  "grv": "application/vnd.groove-injector", 
  "grxml": "application/srgs+xml", 
  "gsf": "application/x-font-ghostscript", 
  "gtar": "application/x-gtar", 
  "gtm": "application/vnd.groove-tool-message", 
  "gtw": "model/vnd.gtw", 
  "gv": "text/vnd.graphviz", 
  "gxf": "application/gxf", 
  "gxt": "application/vnd.geonext", 
  "h": "text/x-c", 
  "h261": "video/h261", 
  "h263": "video/h263", 
  "h264": "video/h264", 
  "hal": "application/vnd.hal+xml", 
  "hbci": "application/vnd.hbci", 
  "hdf": "application/x-hdf", 
  "hh": "text/x-c", 
  "hlp": "application/winhlp", 
  "hpgl": "application/vnd.hp-hpgl", 
  "hpid": "application/vnd.hp-hpid", 
  "hps": "application/vnd.hp-hps", 
  "hqx": "application/mac-binhex40", 
  "htke": "application/vnd.kenameaapp", 
  "htm": "text/html", 
  "html": "text/html", 
  "hvd": "application/vnd.yamaha.hv-dic", 
  "hvp": "application/vnd.yamaha.hv-voice", 
  "hvs": "application/vnd.yamaha.hv-script", 
  "i2g": "application/vnd.intergeo", 
  "icc": "application/vnd.iccprofile", 
  "ice": "x-conference/x-cooltalk", 
  "icm": "application/vnd.iccprofile", 
  "ico": "image/x-icon", 
  "ics": "text/calendar", 
  "ief": "image/ief", 
  "ifb": "text/calendar", 
  "ifm": "application/vnd.shana.informed.formdata", 
  "iges": "model/iges", 
  "igl": "application/vnd.igloader", 
  "igm": "application/vnd.insors.igm", 
  "igs": "model/iges", 
  "igx": "application/vnd.micrografx.igx", 
  "iif": "application/vnd.shana.informed.interchange", 
  "imp": "application/vnd.accpac.simply.imp", 
  "ims": "application/vnd.ms-ims", 
  "in": "text/plain", 
  "ink": "application/inkml+xml", 
  "inkml": "application/inkml+xml", 
  "install": "application/x-install-instructions", 
  "iota": "application/vnd.astraea-software.iota", 
  "ipfix": "application/ipfix", 
  "ipk": "application/vnd.shana.informed.package", 
  "irm": "application/vnd.ibm.rights-management", 
  "irp": "application/vnd.irepository.package+xml", 
  "iso": "application/x-iso9660-image", 
  "itp": "application/vnd.shana.informed.formtemplate", 
  "ivp": "application/vnd.immervision-ivp", 
  "ivu": "application/vnd.immervision-ivu", 
  "jad": "text/vnd.sun.j2me.app-descriptor", 
  "jam": "application/vnd.jam", 
  "jar": "application/java-archive", 
  "java": "text/x-java-source", 
  "jisp": "application/vnd.jisp", 
  "jlt": "application/vnd.hp-jlyt", 
  "jnlp": "application/x-java-jnlp-file", 
  "joda": "application/vnd.joost.joda-archive", 
  "jpe": "image/jpeg", 
  "jpeg": "image/jpeg", 
  "jpg": "image/jpeg", 
  "jpgm": "video/jpm", 
  "jpgv": "video/jpeg", 
  "jpm": "video/jpm", 
  "js": "application/javascript", 
  "json": "application/json", 
  "jsonml": "application/jsonml+json", 
  "kar": "audio/midi", 
  "karbon": "application/vnd.kde.karbon", 
  "kfo": "application/vnd.kde.kformula", 
  "kia": "application/vnd.kidspiration", 
  "kml": "application/vnd.google-earth.kml+xml", 
  "kmz": "application/vnd.google-earth.kmz", 
  "kne": "application/vnd.kinar", 
  "knp": "application/vnd.kinar", 
  "kon": "application/vnd.kde.kontour", 
  "kpr": "application/vnd.kde.kpresenter", 
  "kpt": "application/vnd.kde.kpresenter", 
  "kpxx": "application/vnd.ds-keypoint", 
  "ksp": "application/vnd.kde.kspread", 
  "ktr": "application/vnd.kahootz", 
  "ktx": "image/ktx", 
  "ktz": "application/vnd.kahootz", 
  "kwd": "application/vnd.kde.kword", 
  "kwt": "application/vnd.kde.kword", 
  "lasxml": "application/vnd.las.las+xml", 
  "latex": "application/x-latex", 
  "lbd": "application/vnd.llamagraphics.life-balance.desktop", 
  "lbe": "application/vnd.llamagraphics.life-balance.exchange+xml", 
  "les": "application/vnd.hhe.lesson-player", 
  "lha": "application/x-lzh-compressed", 
  "link66": "application/vnd.route66.link66+xml", 
  "list": "text/plain", 
  "list3820": "application/vnd.ibm.modcap", 
  "listafp": "application/vnd.ibm.modcap", 
  "lnk": "application/x-ms-shortcut", 
  "log": "text/plain", 
  "lostxml": "application/lost+xml", 
  "lrf": "application/octet-stream", 
  "lrm": "application/vnd.ms-lrm", 
  "ltf": "application/vnd.frogans.ltf", 
  "lvp": "audio/vnd.lucent.voice", 
  "lwp": "application/vnd.lotus-wordpro", 
  "lzh": "application/x-lzh-compressed", 
  "m13": "application/x-msmediaview", 
  "m14": "application/x-msmediaview", 
  "m1v": "video/mpeg", 
  "m21": "application/mp21", 
  "m2a": "audio/mpeg", 
  "m2v": "video/mpeg", 
  "m3a": "audio/mpeg", 
  "m3u": "audio/x-mpegurl", 
  "m3u8": "application/vnd.apple.mpegurl", 
  "m4u": "video/vnd.mpegurl", 
  "m4v": "video/x-m4v", 
  "ma": "application/mathematica", 
  "mads": "application/mads+xml", 
  "mag": "application/vnd.ecowin.chart", 
  "maker": "application/vnd.framemaker", 
  "man": "text/troff", 
  "mar": "application/octet-stream", 
  "mathml": "application/mathml+xml", 
  "mb": "application/mathematica", 
  "mbk": "application/vnd.mobius.mbk", 
  "mbox": "application/mbox", 
  "mc1": "application/vnd.medcalcdata", 
  "mcd": "application/vnd.mcd", 
  "mcurl": "text/vnd.curl.mcurl", 
  "mdb": "application/x-msaccess", 
  "mdi": "image/vnd.ms-modi", 
  "me": "text/troff", 
  "mesh": "model/mesh", 
  "meta4": "application/metalink4+xml", 
  "metalink": "application/metalink+xml", 
  "mets": "application/mets+xml", 
  "mfm": "application/vnd.mfmp", 
  "mft": "application/rpki-manifest", 
  "mgp": "application/vnd.osgeo.mapguide.package", 
  "mgz": "application/vnd.proteus.magazine", 
  "mid": "audio/midi", 
  "midi": "audio/midi", 
  "mie": "application/x-mie", 
  "mif": "application/vnd.mif", 
  "mime": "message/rfc822", 
  "mj2": "video/mj2", 
  "mjp2": "video/mj2", 
  "mk3d": "video/x-matroska", 
  "mka": "audio/x-matroska", 
  "mks": "video/x-matroska", 
  "mkv": "video/x-matroska", 
  "mlp": "application/vnd.dolby.mlp", 
  "mmd": "application/vnd.chipnuts.karaoke-mmd", 
  "mmf": "application/vnd.smaf", 
  "mmr": "image/vnd.fujixerox.edmics-mmr", 
  "mng": "video/x-mng", 
  "mny": "application/x-msmoney", 
  "mobi": "application/x-mobipocket-ebook", 
  "mods": "application/mods+xml", 
  "mov": "video/quicktime", 
  "movie": "video/x-sgi-movie", 
  "mp2": "audio/mpeg", 
  "mp21": "application/mp21", 
  "mp2a": "audio/mpeg", 
  "mp3": "audio/mpeg", 
  "mp4": "video/mp4", 
  "mp4a": "audio/mp4", 
  "mp4s": "application/mp4", 
  "mp4v": "video/mp4", 
  "mpc": "application/vnd.mophun.certificate", 
  "mpe": "video/mpeg", 
  "mpeg": "video/mpeg", 
  "mpg": "video/mpeg", 
  "mpg4": "video/mp4", 
  "mpga": "audio/mpeg", 
  "mpkg": "application/vnd.apple.installer+xml", 
  "mpm": "application/vnd.blueice.multipass", 
  "mpn": "application/vnd.mophun.application", 
  "mpp": "application/vnd.ms-project", 
  "mpt": "application/vnd.ms-project", 
  "mpy": "application/vnd.ibm.minipay", 
  "mqy": "application/vnd.mobius.mqy", 
  "mrc": "application/marc", 
  "mrcx": "application/marcxml+xml", 
  "ms": "text/troff", 
  "mscml": "application/mediaservercontrol+xml", 
  "mseed": "application/vnd.fdsn.mseed", 
  "mseq": "application/vnd.mseq", 
  "msf": "application/vnd.epson.msf", 
  "msh": "model/mesh", 
  "msi": "application/x-msdownload", 
  "msl": "application/vnd.mobius.msl", 
  "msty": "application/vnd.muvee.style", 
  "mts": "model/vnd.mts", 
  "mus": "application/vnd.musician", 
  "musicxml": "application/vnd.recordare.musicxml+xml", 
  "mvb": "application/x-msmediaview", 
  "mwf": "application/vnd.mfer", 
  "mxf": "application/mxf", 
  "mxl": "application/vnd.recordare.musicxml", 
  "mxml": "application/xv+xml", 
  "mxs": "application/vnd.triscape.mxs", 
  "mxu": "video/vnd.mpegurl", 
  "n-gage": "application/vnd.nokia.n-gage.symbian.install", 
  "n3": "text/n3", 
  "nb": "application/mathematica", 
  "nbp": "application/vnd.wolfram.player", 
  "nc": "application/x-netcdf", 
  "ncx": "application/x-dtbncx+xml", 
  "nfo": "text/x-nfo", 
  "ngdat": "application/vnd.nokia.n-gage.data", 
  "nitf": "application/vnd.nitf", 
  "nlu": "application/vnd.neurolanguage.nlu", 
  "nml": "application/vnd.enliven", 
  "nnd": "application/vnd.noblenet-directory", 
  "nns": "application/vnd.noblenet-sealer", 
  "nnw": "application/vnd.noblenet-web", 
  "npx": "image/vnd.net-fpx", 
  "nsc": "application/x-conference", 
  "nsf": "application/vnd.lotus-notes", 
  "ntf": "application/vnd.nitf", 
  "nzb": "application/x-nzb", 
  "oa2": "application/vnd.fujitsu.oasys2", 
  "oa3": "application/vnd.fujitsu.oasys3", 
  "oas": "application/vnd.fujitsu.oasys", 
  "obd": "application/x-msbinder", 
  "obj": "application/x-tgif", 
  "oda": "application/oda", 
  "odb": "application/vnd.oasis.opendocument.database", 
  "odc": "application/vnd.oasis.opendocument.chart", 
  "odf": "application/vnd.oasis.opendocument.formula", 
  "odft": "application/vnd.oasis.opendocument.formula-template", 
  "odg": "application/vnd.oasis.opendocument.graphics", 
  "odi": "application/vnd.oasis.opendocument.image", 
  "odm": "application/vnd.oasis.opendocument.text-master", 
  "odp": "application/vnd.oasis.opendocument.presentation", 
  "ods": "application/vnd.oasis.opendocument.spreadsheet", 
  "odt": "application/vnd.oasis.opendocument.text", 
  "oga": "audio/ogg", 
  "ogg": "audio/ogg", 
  "ogv": "video/ogg", 
  "ogx": "application/ogg", 
  "omdoc": "application/omdoc+xml", 
  "onepkg": "application/onenote", 
  "onetmp": "application/onenote", 
  "onetoc": "application/onenote", 
  "onetoc2": "application/onenote", 
  "opf": "application/oebps-package+xml", 
  "opml": "text/x-opml", 
  "oprc": "application/vnd.palm", 
  "org": "application/vnd.lotus-organizer", 
  "osf": "application/vnd.yamaha.openscoreformat", 
  "osfpvg": "application/vnd.yamaha.openscoreformat.osfpvg+xml", 
  "otc": "application/vnd.oasis.opendocument.chart-template", 
  "otf": "application/x-font-otf", 
  "otg": "application/vnd.oasis.opendocument.graphics-template", 
  "oth": "application/vnd.oasis.opendocument.text-web", 
  "oti": "application/vnd.oasis.opendocument.image-template", 
  "otp": "application/vnd.oasis.opendocument.presentation-template", 
  "ots": "application/vnd.oasis.opendocument.spreadsheet-template", 
  "ott": "application/vnd.oasis.opendocument.text-template", 
  "oxps": "application/oxps", 
  "oxt": "application/vnd.openofficeorg.extension", 
  "p": "text/x-pascal", 
  "p10": "application/pkcs10", 
  "p12": "application/x-pkcs12", 
  "p7b": "application/x-pkcs7-certificates", 
  "p7c": "application/pkcs7-mime", 
  "p7m": "application/pkcs7-mime", 
  "p7r": "application/x-pkcs7-certreqresp", 
  "p7s": "application/pkcs7-signature", 
  "p8": "application/pkcs8", 
  "pas": "text/x-pascal", 
  "paw": "application/vnd.pawaafile", 
  "pbd": "application/vnd.powerbuilder6", 
  "pbm": "image/x-portable-bitmap", 
  "pcap": "application/vnd.tcpdump.pcap", 
  "pcf": "application/x-font-pcf", 
  "pcl": "application/vnd.hp-pcl", 
  "pclxl": "application/vnd.hp-pclxl", 
  "pct": "image/x-pict", 
  "pcurl": "application/vnd.curl.pcurl", 
  "pcx": "image/x-pcx", 
  "pdb": "application/vnd.palm", 
  "pdf": "application/pdf", 
  "pfa": "application/x-font-type1", 
  "pfb": "application/x-font-type1", 
  "pfm": "application/x-font-type1", 
  "pfr": "application/font-tdpfr", 
  "pfx": "application/x-pkcs12", 
  "pgm": "image/x-portable-graymap", 
  "pgn": "application/x-chess-pgn", 
  "pgp": "application/pgp-encrypted", 
  "pic": "image/x-pict", 
  "pkg": "application/octet-stream", 
  "pki": "application/pkixcmp", 
  "pkipath": "application/pkix-pkipath", 
  "plb": "application/vnd.3gpp.pic-bw-large", 
  "plc": "application/vnd.mobius.plc", 
  "plf": "application/vnd.pocketlearn", 
  "pls": "application/pls+xml", 
  "pml": "application/vnd.ctc-posml", 
  "png": "image/png", 
  "pnm": "image/x-portable-anymap", 
  "portpkg": "application/vnd.macports.portpkg", 
  "pot": "application/vnd.ms-powerpoint", 
  "potm": "application/vnd.ms-powerpoint.template.macroenabled.12", 
  "potx": "application/vnd.openxmlformats-officedocument.presentationml.template", 
  "ppam": "application/vnd.ms-powerpoint.addin.macroenabled.12", 
  "ppd": "application/vnd.cups-ppd", 
  "ppm": "image/x-portable-pixmap", 
  "pps": "application/vnd.ms-powerpoint", 
  "ppsm": "application/vnd.ms-powerpoint.slideshow.macroenabled.12", 
  "ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow", 
  "ppt": "application/vnd.ms-powerpoint", 
  "pptm": "application/vnd.ms-powerpoint.presentation.macroenabled.12", 
  "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", 
  "pqa": "application/vnd.palm", 
  "prc": "application/x-mobipocket-ebook", 
  "pre": "application/vnd.lotus-freelance", 
  "prf": "application/pics-rules", 
  "ps": "application/postscript", 
  "psb": "application/vnd.3gpp.pic-bw-small", 
  "psd": "image/vnd.adobe.photoshop", 
  "psf": "application/x-font-linux-psf", 
  "pskcxml": "application/pskc+xml", 
  "ptid": "application/vnd.pvi.ptid1", 
  "pub": "application/x-mspublisher", 
  "pvb": "application/vnd.3gpp.pic-bw-var", 
  "pwn": "application/vnd.3m.post-it-notes", 
  "pya": "audio/vnd.ms-playready.media.pya", 
  "pyv": "video/vnd.ms-playready.media.pyv", 
  "qam": "application/vnd.epson.quickanime", 
  "qbo": "application/vnd.intu.qbo", 
  "qfx": "application/vnd.intu.qfx", 
  "qps": "application/vnd.publishare-delta-tree", 
  "qt": "video/quicktime", 
  "qwd": "application/vnd.quark.quarkxpress", 
  "qwt": "application/vnd.quark.quarkxpress", 
  "qxb": "application/vnd.quark.quarkxpress", 
  "qxd": "application/vnd.quark.quarkxpress", 
  "qxl": "application/vnd.quark.quarkxpress", 
  "qxt": "application/vnd.quark.quarkxpress", 
  "ra": "audio/x-pn-realaudio", 
  "ram": "audio/x-pn-realaudio", 
  "rar": "application/x-rar-compressed", 
  "ras": "image/x-cmu-raster", 
  "rcprofile": "application/vnd.ipunplugged.rcprofile", 
  "rdf": "application/rdf+xml", 
  "rdz": "application/vnd.data-vision.rdz", 
  "rep": "application/vnd.businessobjects", 
  "res": "application/x-dtbresource+xml", 
  "rgb": "image/x-rgb", 
  "rif": "application/reginfo+xml", 
  "rip": "audio/vnd.rip", 
  "ris": "application/x-research-info-systems", 
  "rl": "application/resource-lists+xml", 
  "rlc": "image/vnd.fujixerox.edmics-rlc", 
  "rld": "application/resource-lists-diff+xml", 
  "rm": "application/vnd.rn-realmedia", 
  "rmi": "audio/midi", 
  "rmp": "audio/x-pn-realaudio-plugin", 
  "rms": "application/vnd.jcp.javame.midlet-rms", 
  "rmvb": "application/vnd.rn-realmedia-vbr", 
  "rnc": "application/relax-ng-compact-syntax", 
  "roa": "application/rpki-roa", 
  "roff": "text/troff", 
  "rp9": "application/vnd.cloanto.rp9", 
  "rpss": "application/vnd.nokia.radio-presets", 
  "rpst": "application/vnd.nokia.radio-preset", 
  "rq": "application/sparql-query", 
  "rs": "application/rls-services+xml", 
  "rsd": "application/rsd+xml", 
  "rss": "application/rss+xml", 
  "rtf": "application/rtf", 
  "rtx": "text/richtext", 
  "s": "text/x-asm", 
  "s3m": "audio/s3m", 
  "saf": "application/vnd.yamaha.smaf-audio", 
  "sbml": "application/sbml+xml", 
  "sc": "application/vnd.ibm.secure-container", 
  "scd": "application/x-msschedule", 
  "scm": "application/vnd.lotus-screencam", 
  "scq": "application/scvp-cv-request", 
  "scs": "application/scvp-cv-response", 
  "scurl": "text/vnd.curl.scurl", 
  "sda": "application/vnd.stardivision.draw", 
  "sdc": "application/vnd.stardivision.calc", 
  "sdd": "application/vnd.stardivision.impress", 
  "sdkd": "application/vnd.solent.sdkm+xml", 
  "sdkm": "application/vnd.solent.sdkm+xml", 
  "sdp": "application/sdp", 
  "sdw": "application/vnd.stardivision.writer", 
  "see": "application/vnd.seemail", 
  "seed": "application/vnd.fdsn.seed", 
  "sema": "application/vnd.sema", 
  "semd": "application/vnd.semd", 
  "semf": "application/vnd.semf", 
  "ser": "application/java-serialized-object", 
  "setpay": "application/set-payment-initiation", 
  "setreg": "application/set-registration-initiation", 
  "sfd-hdstx": "application/vnd.hydrostatix.sof-data", 
  "sfs": "application/vnd.spotfire.sfs", 
  "sfv": "text/x-sfv", 
  "sgi": "image/sgi", 
  "sgl": "application/vnd.stardivision.writer-global", 
  "sgm": "text/sgml", 
  "sgml": "text/sgml", 
  "sh": "application/x-sh", 
  "shar": "application/x-shar", 
  "shf": "application/shf+xml", 
  "sid": "image/x-mrsid-image", 
  "sig": "application/pgp-signature", 
  "sil": "audio/silk", 
  "silo": "model/mesh", 
  "sis": "application/vnd.symbian.install", 
  "sisx": "application/vnd.symbian.install", 
  "sit": "application/x-stuffit", 
  "sitx": "application/x-stuffitx", 
  "skd": "application/vnd.koan", 
  "skm": "application/vnd.koan", 
  "skp": "application/vnd.koan", 
  "skt": "application/vnd.koan", 
  "sldm": "application/vnd.ms-powerpoint.slide.macroenabled.12", 
  "sldx": "application/vnd.openxmlformats-officedocument.presentationml.slide", 
  "slt": "application/vnd.epson.salt", 
  "sm": "application/vnd.stepmania.stepchart", 
  "smf": "application/vnd.stardivision.math", 
  "smi": "application/smil+xml", 
  "smil": "application/smil+xml", 
  "smv": "video/x-smv", 
  "smzip": "application/vnd.stepmania.package", 
  "snd": "audio/basic", 
  "snf": "application/x-font-snf", 
  "so": "application/octet-stream", 
  "spc": "application/x-pkcs7-certificates", 
  "spf": "application/vnd.yamaha.smaf-phrase", 
  "spl": "application/x-futuresplash", 
  "spot": "text/vnd.in3d.spot", 
  "spp": "application/scvp-vp-response", 
  "spq": "application/scvp-vp-request", 
  "spx": "audio/ogg", 
  "sql": "application/x-sql", 
  "src": "application/x-wais-source", 
  "srt": "application/x-subrip", 
  "sru": "application/sru+xml", 
  "srx": "application/sparql-results+xml", 
  "ssdl": "application/ssdl+xml", 
  "sse": "application/vnd.kodak-descriptor", 
  "ssf": "application/vnd.epson.ssf", 
  "ssml": "application/ssml+xml", 
  "st": "application/vnd.sailingtracker.track", 
  "stc": "application/vnd.sun.xml.calc.template", 
  "std": "application/vnd.sun.xml.draw.template", 
  "stf": "application/vnd.wt.stf", 
  "sti": "application/vnd.sun.xml.impress.template", 
  "stk": "application/hyperstudio", 
  "stl": "application/vnd.ms-pki.stl", 
  "str": "application/vnd.pg.format", 
  "stw": "application/vnd.sun.xml.writer.template", 
  "sub": "text/vnd.dvb.subtitle", 
  "sus": "application/vnd.sus-calendar", 
  "susp": "application/vnd.sus-calendar", 
  "sv4cpio": "application/x-sv4cpio", 
  "sv4crc": "application/x-sv4crc", 
  "svc": "application/vnd.dvb.service", 
  "svd": "application/vnd.svd", 
  "svg": "image/svg+xml", 
  "svgz": "image/svg+xml", 
  "swa": "application/x-director", 
  "swf": "application/x-shockwave-flash", 
  "swi": "application/vnd.aristanetworks.swi", 
  "sxc": "application/vnd.sun.xml.calc", 
  "sxd": "application/vnd.sun.xml.draw", 
  "sxg": "application/vnd.sun.xml.writer.global", 
  "sxi": "application/vnd.sun.xml.impress", 
  "sxm": "application/vnd.sun.xml.math", 
  "sxw": "application/vnd.sun.xml.writer", 
  "t": "text/troff", 
  "t3": "application/x-t3vm-image", 
  "taglet": "application/vnd.mynfc", 
  "tao": "application/vnd.tao.intent-module-archive", 
  "tar": "application/x-tar", 
  "tcap": "application/vnd.3gpp2.tcap", 
  "tcl": "application/x-tcl", 
  "teacher": "application/vnd.smart.teacher", 
  "tei": "application/tei+xml", 
  "teicorpus": "application/tei+xml", 
  "tex": "application/x-tex", 
  "texi": "application/x-texinfo", 
  "texinfo": "application/x-texinfo", 
  "text": "text/plain", 
  "tfi": "application/thraud+xml", 
  "tfm": "application/x-tex-tfm", 
  "tga": "image/x-tga", 
  "thmx": "application/vnd.ms-officetheme", 
  "tif": "image/tiff", 
  "tiff": "image/tiff", 
  "tmo": "application/vnd.tmobile-livetv", 
  "torrent": "application/x-bittorrent", 
  "tpl": "application/vnd.groove-tool-template", 
  "tpt": "application/vnd.trid.tpt", 
  "tr": "text/troff", 
  "tra": "application/vnd.trueapp", 
  "trm": "application/x-msterminal", 
  "tsd": "application/timestamped-data", 
  "tsv": "text/tab-separated-values", 
  "ttc": "application/x-font-ttf", 
  "ttf": "application/x-font-ttf", 
  "ttl": "text/turtle", 
  "twd": "application/vnd.simtech-mindmapper", 
  "twds": "application/vnd.simtech-mindmapper", 
  "txd": "application/vnd.genomatix.tuxedo", 
  "txf": "application/vnd.mobius.txf", 
  "txt": "text/plain", 
  "u32": "application/x-authorware-bin", 
  "udeb": "application/x-debian-package", 
  "ufd": "application/vnd.ufdl", 
  "ufdl": "application/vnd.ufdl", 
  "ulx": "application/x-glulx", 
  "umj": "application/vnd.umajin", 
  "unityweb": "application/vnd.unity", 
  "uoml": "application/vnd.uoml+xml", 
  "uri": "text/uri-list", 
  "uris": "text/uri-list", 
  "urls": "text/uri-list", 
  "ustar": "application/x-ustar", 
  "utz": "application/vnd.uiq.theme", 
  "uu": "text/x-uuencode", 
  "uva": "audio/vnd.dece.audio", 
  "uvd": "application/vnd.dece.data", 
  "uvf": "application/vnd.dece.data", 
  "uvg": "image/vnd.dece.graphic", 
  "uvh": "video/vnd.dece.hd", 
  "uvi": "image/vnd.dece.graphic", 
  "uvm": "video/vnd.dece.mobile", 
  "uvp": "video/vnd.dece.pd", 
  "uvs": "video/vnd.dece.sd", 
  "uvt": "application/vnd.dece.ttml+xml", 
  "uvu": "video/vnd.uvvu.mp4", 
  "uvv": "video/vnd.dece.video", 
  "uvva": "audio/vnd.dece.audio", 
  "uvvd": "application/vnd.dece.data", 
  "uvvf": "application/vnd.dece.data", 
  "uvvg": "image/vnd.dece.graphic", 
  "uvvh": "video/vnd.dece.hd", 
  "uvvi": "image/vnd.dece.graphic", 
  "uvvm": "video/vnd.dece.mobile", 
  "uvvp": "video/vnd.dece.pd", 
  "uvvs": "video/vnd.dece.sd", 
  "uvvt": "application/vnd.dece.ttml+xml", 
  "uvvu": "video/vnd.uvvu.mp4", 
  "uvvv": "video/vnd.dece.video", 
  "uvvx": "application/vnd.dece.unspecified", 
  "uvvz": "application/vnd.dece.zip", 
  "uvx": "application/vnd.dece.unspecified", 
  "uvz": "application/vnd.dece.zip", 
  "vcard": "text/vcard", 
  "vcd": "application/x-cdlink", 
  "vcf": "text/x-vcard", 
  "vcg": "application/vnd.groove-vcard", 
  "vcs": "text/x-vcalendar", 
  "vcx": "application/vnd.vcx", 
  "vis": "application/vnd.visionary", 
  "viv": "video/vnd.vivo", 
  "vob": "video/x-ms-vob", 
  "vor": "application/vnd.stardivision.writer", 
  "vox": "application/x-authorware-bin", 
  "vrml": "model/vrml", 
  "vsd": "application/vnd.visio", 
  "vsf": "application/vnd.vsf", 
  "vss": "application/vnd.visio", 
  "vst": "application/vnd.visio", 
  "vsw": "application/vnd.visio", 
  "vtu": "model/vnd.vtu",
  "vtt": "text/vtt",
  "vxml": "application/voicexml+xml", 
  "w3d": "application/x-director", 
  "wad": "application/x-doom", 
  "wav": "audio/x-wav", 
  "wax": "audio/x-ms-wax", 
  "wbmp": "image/vnd.wap.wbmp", 
  "wbs": "application/vnd.criticaltools.wbs+xml", 
  "wbxml": "application/vnd.wap.wbxml", 
  "wcm": "application/vnd.ms-works", 
  "wdb": "application/vnd.ms-works", 
  "wdp": "image/vnd.ms-photo", 
  "weba": "audio/webm", 
  "webm": "video/webm", 
  "webp": "image/webp", 
  "wg": "application/vnd.pmi.widget", 
  "wgt": "application/widget", 
  "wks": "application/vnd.ms-works", 
  "wm": "video/x-ms-wm", 
  "wma": "audio/x-ms-wma", 
  "wmd": "application/x-ms-wmd", 
  "wmf": "application/x-msmetafile", 
  "wml": "text/vnd.wap.wml", 
  "wmlc": "application/vnd.wap.wmlc", 
  "wmls": "text/vnd.wap.wmlscript", 
  "wmlsc": "application/vnd.wap.wmlscriptc", 
  "wmv": "video/x-ms-wmv", 
  "wmx": "video/x-ms-wmx", 
  "wmz": "application/x-msmetafile", 
  "woff": "application/x-font-woff", 
  "wpd": "application/vnd.wordperfect", 
  "wpl": "application/vnd.ms-wpl", 
  "wps": "application/vnd.ms-works", 
  "wqd": "application/vnd.wqd", 
  "wri": "application/x-mswrite", 
  "wrl": "model/vrml", 
  "wsdl": "application/wsdl+xml", 
  "wspolicy": "application/wspolicy+xml", 
  "wtb": "application/vnd.webturbo", 
  "wvx": "video/x-ms-wvx", 
  "x32": "application/x-authorware-bin", 
  "x3d": "model/x3d+xml", 
  "x3db": "model/x3d+binary", 
  "x3dbz": "model/x3d+binary", 
  "x3dv": "model/x3d+vrml", 
  "x3dvz": "model/x3d+vrml", 
  "x3dz": "model/x3d+xml", 
  "xaml": "application/xaml+xml", 
  "xap": "application/x-silverlight-app", 
  "xar": "application/vnd.xara", 
  "xbap": "application/x-ms-xbap", 
  "xbd": "application/vnd.fujixerox.docuworks.binder", 
  "xbm": "image/x-xbitmap", 
  "xdf": "application/xcap-diff+xml", 
  "xdm": "application/vnd.syncml.dm+xml", 
  "xdp": "application/vnd.adobe.xdp+xml", 
  "xdssc": "application/dssc+xml", 
  "xdw": "application/vnd.fujixerox.docuworks", 
  "xenc": "application/xenc+xml", 
  "xer": "application/patch-ops-error+xml", 
  "xfdf": "application/vnd.adobe.xfdf", 
  "xfdl": "application/vnd.xfdl", 
  "xht": "application/xhtml+xml", 
  "xhtml": "application/xhtml+xml", 
  "xhvml": "application/xv+xml", 
  "xif": "image/vnd.xiff", 
  "xla": "application/vnd.ms-excel", 
  "xlam": "application/vnd.ms-excel.addin.macroenabled.12", 
  "xlc": "application/vnd.ms-excel", 
  "xlf": "application/x-xliff+xml", 
  "xlm": "application/vnd.ms-excel", 
  "xls": "application/vnd.ms-excel", 
  "xlsb": "application/vnd.ms-excel.sheet.binary.macroenabled.12", 
  "xlsm": "application/vnd.ms-excel.sheet.macroenabled.12", 
  "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
  "xlt": "application/vnd.ms-excel", 
  "xltm": "application/vnd.ms-excel.template.macroenabled.12", 
  "xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template", 
  "xlw": "application/vnd.ms-excel", 
  "xm": "audio/xm", 
  "xml": "application/xml", 
  "xo": "application/vnd.olpc-sugar", 
  "xop": "application/xop+xml", 
  "xpi": "application/x-xpinstall", 
  "xpl": "application/xproc+xml", 
  "xpm": "image/x-xpixmap", 
  "xpr": "application/vnd.is-xpr", 
  "xps": "application/vnd.ms-xpsdocument", 
  "xpw": "application/vnd.intercon.formnet", 
  "xpx": "application/vnd.intercon.formnet", 
  "xsl": "application/xml", 
  "xslt": "application/xslt+xml", 
  "xsm": "application/vnd.syncml+xml", 
  "xspf": "application/xspf+xml", 
  "xul": "application/vnd.mozilla.xul+xml", 
  "xvm": "application/xv+xml", 
  "xvml": "application/xv+xml", 
  "xwd": "image/x-xwindowdump", 
  "xyz": "chemical/x-xyz", 
  "xz": "application/x-xz", 
  "yang": "application/yang", 
  "yin": "application/yin+xml", 
  "z1": "application/x-zmachine", 
  "z2": "application/x-zmachine", 
  "z3": "application/x-zmachine", 
  "z4": "application/x-zmachine", 
  "z5": "application/x-zmachine", 
  "z6": "application/x-zmachine", 
  "z7": "application/x-zmachine", 
  "z8": "application/x-zmachine", 
  "zaz": "application/vnd.zzazz.deck+xml", 
  "zip": "application/zip", 
  "zir": "application/vnd.zul", 
  "zirz": "application/vnd.zul", 
  "zmm": "application/vnd.handheld-entertainment+xml"
};
var MIMECATEGORIES = {'video':[],'audio':[]};
for (var key in MIMETYPES) {
    if (MIMETYPES[key].startsWith('video/')) {
        MIMECATEGORIES.video.push( key );
    } else if (MIMETYPES[key].startsWith('audio/')) {
        MIMECATEGORIES.audio.push( key );
    }
}
WSC.MIMECATEGORIES = MIMECATEGORIES;
WSC.MIMETYPES = MIMETYPES;
})();

(function() {
    function HTTPRequest(opts) {
        this.method = opts.method;
        this.uri = opts.uri;
        this.version = opts.version;
        this.connection = opts.connection;
        this.headers = opts.headers;
        this.body = null;
        this.bodyparams = null;

        this.arguments = {};
        var idx = this.uri.indexOf('?');
        if (idx != -1) {
            this.path = decodeURIComponent(this.uri.slice(0,idx));
            var s = this.uri.slice(idx+1);
            var parts = s.split('&');

            for (var i=0; i<parts.length; i++) {
                var p = parts[i];
                var idx2 = p.indexOf('=');
                this.arguments[decodeURIComponent(p.slice(0,idx2))] = decodeURIComponent(p.slice(idx2+1,s.length));
            }
        } else {
            this.path = decodeURIComponent(this.uri);
        }

        this.origpath = this.path;

        if (this.path[this.path.length-1] == '/') {
            this.path = this.path.slice(0,this.path.length-1);
        }
        
    }

    HTTPRequest.prototype = {
        isKeepAlive: function() {
            return this.headers.connection && this.headers.connection.toLowerCase() != 'close';
        }
    };

    WSC.HTTPRequest = HTTPRequest;
})();

(function() {

    var peerSockMap = {};
    WSC.peerSockMap = peerSockMap;

    function onTCPReceive(info) {
        var sockId = info.socketId;
        if (WSC.peerSockMap[sockId]) {
            WSC.peerSockMap[sockId].onReadTCP(info);
        }
    }

    chrome.sockets.tcp.onReceive.addListener( onTCPReceive );
    chrome.sockets.tcp.onReceiveError.addListener( onTCPReceive );

    var sockets = chrome.sockets;
    function IOStream(sockId) {
        this.sockId = sockId;
        peerSockMap[this.sockId] = this;
        this.readCallback = null;
        this.readUntilDelimiter = null;
        this.readBuffer = new WSC.Buffer();
        this.writeBuffer = new WSC.Buffer();
        this.writing = false;
        this.pleaseReadBytes = null;

        this.remoteclosed = false;
        this.closed = false;
        this.connected = true;

        this.halfclose = null;
        this.onclose = null;
        this.ondata = null;
        this.source = null;
        this._close_callbacks = [];

        this.onWriteBufferEmpty = null;
        chrome.sockets.tcp.setPaused(this.sockId, false, this.onUnpaused.bind(this));
    }

    IOStream.prototype = {
		set_close_callback: function(fn) {
			this._close_callbacks = [fn];
		},
		set_nodelay: function() {
			chrome.sockets.tcp.setNoDelay(this.sockId, true, function(){});
		},
        removeHandler: function() {
            delete peerSockMap[this.sockId];
        },
        addCloseCallback: function(cb) {
            this._close_callbacks.push(cb);
        },
        peekstr: function(maxlen) {
            return WSC.ui82str(new Uint8Array(this.readBuffer.deque[0], 0, maxlen));
        },
        removeCloseCallback: function(cb) {

        },
        runCloseCallbacks: function() {
            for (var i=0; i<this._close_callbacks.length; i++) {
                this._close_callbacks[i](this);
            }
            if (this.onclose) { this.onclose(); }
        },
        onUnpaused: function(info) {
            var lasterr = chrome.runtime.lastError;
            if (lasterr) {
                this.close('set unpause fail');
            }
            //console.log('sock unpaused',info)
        },
        readUntil: function(delimiter, callback) {
            this.readUntilDelimiter = delimiter;
            this.readCallback = callback;
            this.checkBuffer();
        },
        readBytes: function(numBytes, callback) {
            this.pleaseReadBytes = numBytes;
            this.readCallback = callback;
            this.checkBuffer();
        },
        tryWrite: function(callback) {
            if (this.writing) { 
                //console.warn('already writing..'); 
                return;
            }
            if (this.closed) { 
                console.warn(this.sockId,'cant write, closed'); 
                return; 
            }
            //console.log('tryWrite')
            this.writing = true;
            var data = this.writeBuffer.consume_any_max(4096);
            //console.log(this.sockId,'tcp.send',data.byteLength)
            //console.log(this.sockId,'tcp.send',WSC.ui82str(new Uint8Array(data)))
            sockets.tcp.send( this.sockId, data, this.onWrite.bind(this, callback) );
        },
		write: function(data) {
			this.writeBuffer.add(data);
			this.tryWrite();
		},
        onWrite: function(callback, evt) {
            var err = chrome.runtime.lastError;
            if (err) {
                //console.log('socket.send lastError',err)
                //this.tryClose()
                this.close('writeerr'+err);
                return;
            }

            // look at evt!
            if (evt.bytesWritten <= 0) {
                //console.log('onwrite fail, closing',evt)
                this.close('writerr<0');
                return;
            }
            this.writing = false;
            if (this.writeBuffer.size() > 0) {
                //console.log('write more...')
                if (this.closed) {
                } else {
                    this.tryWrite(callback);
                }
            } else {
                if (this.onWriteBufferEmpty) { this.onWriteBufferEmpty(); }
            }
        },
        onReadTCP: function(evt) {
            var lasterr = chrome.runtime.lastError;
            if (lasterr) {
                this.close('read tcp lasterr'+lasterr);
                return;
            }
            //console.log('onRead',WSC.ui82str(new Uint8Array(evt.data)))
            if (evt.resultCode == 0) {
                //this.error({message:'remote closed connection'})
                this.log('remote closed connection (halfduplex)');
                this.remoteclosed = true;
                if (this.halfclose) { this.halfclose(); }
                if (this.request) {
                    // do we even have a request yet? or like what to do ...
                }
            } else if (evt.resultCode < 0) {
                this.log('remote killed connection',evt.resultCode);
                this.error({message:'error code',errno:evt.resultCode});
            } else {
                this.readBuffer.add(evt.data);
                if (this.onread) { this.onread(); }
                this.checkBuffer();
            }
        },
        log: function(msg,msg2,msg3) {
			if (WSC.VERBOSE) {
				console.log(this.sockId,msg,msg2,msg3);
			}
        },
        checkBuffer: function() {
            //console.log('checkBuffer')
            if (this.readUntilDelimiter) {
                var buf = this.readBuffer.flatten();
                var str = WSC.arrayBufferToString(buf);
                var idx = str.indexOf(this.readUntilDelimiter);
                if (idx != -1) {
                    var callback = this.readCallback;
                    var toret = this.readBuffer.consume(idx+this.readUntilDelimiter.length);
                    this.readUntilDelimiter = null;
                    this.readCallback = null;
                    callback(toret);
                }
            } else if (this.pleaseReadBytes !== null) {
                if (this.readBuffer.size() >= this.pleaseReadBytes) {
                    var data = this.readBuffer.consume(this.pleaseReadBytes);
                    var callback = this.readCallback;
                    this.readCallback = null;
                    this.pleaseReadBytes = null;
                    callback(data);
                }
            }
        },
        close: function(reason) {
			if ( this.closed) { return; }
            this.connected = false;
            this.closed = true;
            this.runCloseCallbacks();
            //console.log('tcp sock close',this.sockId)
            delete peerSockMap[this.sockId];
            sockets.tcp.close(this.sockId, this.onClosed.bind(this,reason));
            //this.sockId = null
            this.cleanup();
        },
        onClosed: function(reason, info) {
            var lasterr = chrome.runtime.lastError;
            if (lasterr) {
                console.log('onClosed',reason,lasterr,info);
            } else {
                //console.log('onClosed',reason,info)
            }
        },
        error: function(data) {
            console.warn(this.sockId,'closed');
            //console.error(this,data)
            // try close by writing 0 bytes
            if (! this.closed) {
                this.close();
            }
        },
        checkedCallback: function(callback) {
            var err = chrome.runtime.lastError;
            if (err) {
                console.warn('socket callback lastError',err,callback);
            }
        },
        tryClose: function(callback) {
            if (!callback) { callback=this.checkedCallback; }
            if (! this.closed) {
                console.warn('cant close, already closed');
                this.cleanup();
                return;
            }
            console.log(this.sockId,'tryClose');
            sockets.tcp.send(this.sockId, new ArrayBuffer(), callback);
        },
        cleanup: function() {
            this.writeBuffer = new WSC.Buffer();
        }
    };

    WSC.IOStream = IOStream;

})();

// multiple devices are using the same extenal port. need to retry for other ports, or randomize chosen port based on GUID would be easiest.

// if switching from wlan to eth, it will fail to map the port because we mapped on the other interface.

// check current mappings and don't attempt to map to an externally bound port

// could choose port by hashing GUID + interface name

// inspiration from https://github.com/indutny/node-nat-upnp
(function() {
    function flatParseNode(node) {
        var d = {};
        for (var i=0; i<node.children.length; i++) {
            var c = node.children[i];
            if (c.children.length == 0) {
                d[c.tagName] = c.innerHTML;
            }
        }
        return d;
    }
    
    function UPNP(opts) {
        this.port = opts.port;
		this.name = opts.name || 'web-server-chrome upnp.js';
		this.searchtime = opts.searchtime || 2000;
        this.ssdp = new SSDP({port:opts.port, searchtime:this.searchtime});
        this.desiredServices = [
            'urn:schemas-upnp-org:service:WANIPConnection:1',
            'urn:schemas-upnp-org:service:WANPPPConnection:1'
        ];
        this.validGateway = null;
        this.interfaces = null;
        this.mapping = null;
        this.searching = false;
    }
    UPNP.prototype = {
        allDone: function(result) {
            if (this.callback) { this.callback(result); }
        },
        getInternalAddress: function() {
            var gatewayhost = this.validGateway.device.url.hostname;
            var gateparts = gatewayhost.split('.');
            var match = false;

            for (var i=gateparts.length-1;i--;i<1) {
                var pre = gateparts.slice(0, i).join('.');
                for (var j=0; j<this.interfaces.length; j++) {
                    if (this.interfaces[j].prefixLength == 24) {
                        var iparts = this.interfaces[j].address.split('.');
                        var ipre = iparts.slice(0,i).join('.');
                        if (ipre == pre) {
                            match = this.interfaces[j].address;
                            console.clog("UPNP","selected internal address",match);
                            return match;
                        }
                    }
                }

            }
        },
        reset: function(callback) {
            this.callback = callback;
            console.clog('UPNP', "search start");
            this.searching = true;
            chrome.system.network.getNetworkInterfaces( function(interfaces) {
                this.interfaces = interfaces;
                this.devices = [];
				// TODO -- remove event listeners
                this.ssdp.addEventListener('device',this.onDevice.bind(this));
                this.ssdp.addEventListener('stop',this.onSearchStop.bind(this));
                this.ssdp.search(); // stop searching after a bit.
            }.bind(this) );
        },
        onSearchStop: function(info) {
            console.clog('UPNP', "search stop");
            this.searching = false;
            this.getIP( function(gotIP) {
                if (! gotIP) { return this.allDone(false); }
                this.getMappings( function(mappings) {
                    if (! mappings) { return this.allDone(false); }
                    // check if already exists nice mapping we can use.
                    var internal = this.getInternalAddress();
                    console.clog('UPNP','got current mappings',mappings,'internal address',internal);
                    for (var i=0; i<mappings.length; i++) {
                        if (mappings[i].NewInternalClient == internal &&
                            mappings[i].NewInternalPort == this.port &&
                            mappings[i].NewProtocol == "TCP") {
                            // found it
                            console.clog('UPNP','already have port mapped');
                            this.mapping = mappings[i];
                            this.allDone(true);
                            return;
                        }
                    }
                    this.addMapping(this.port, 'TCP', function(result) {
                        console.clog('UPNP', 'add TCP mapping result',result);
                        if (this.wantUDP) {
                            this.addMapping(this.port, 'UDP', function(result) {
                                console.clog('UPNP', 'add UDP mapping result',result);
                                this.allDone(result);
                            });
                        } else {
                            this.allDone(result);
                        }
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        },
        onDevice: function(info) {
            console.clog('UPNP', 'found an internet gateway device',info);
            var device = new GatewayDevice(info);
            device.getDescription( function() {
                this.devices.push( device );
            }.bind(this) );
        },
        getWANServiceInfo: function() {
            var infos = [];
            for (var i=0; i<this.devices.length; i++) {
                var services = this.devices[i].getService(this.desiredServices);
                if (services.length > 0) {
                    for (var j=0; j<services.length; j++) {
                        infos.push( {service:services[j],
                                     device:this.devices[i]} );
                    }
                }
            }
            //console.log('found WAN services',infos)
            return infos;
        },
        addMapping: function(port, prot, callback) {
            this.changeMapping(port, prot, 1, callback);
        },
        removeMapping: function(port, prot, callback) {
            this.changeMapping(port, prot, 0, callback);
        },
        changeMapping: function(port, prot, enabled, callback) {
            if (! this.validGateway) {
                callback();
            } else {
                function onresult(evt) {
                    if (evt.target.code == 200) {
                        var resp = evt.target.responseXML.documentElement.querySelector(enabled?'AddPortMappingResponse':'DeletePortMappingResponse');
                        if (resp) {
                            callback(flatParseNode(resp));
                        } else {
                            callback({error:'unknown',evt:evt});
                        }
                    } else {
                        // maybe parse out the error all nice?
                        callback({error:evt.target.code,evt:evt});
                    }
                }
                var externalPort = port;
				if (enabled) {
					var args = [
						['NewEnabled',enabled],
						['NewExternalPort',externalPort],
						['NewInternalClient',this.getInternalAddress()],
						['NewInternalPort',port],
						['NewLeaseDuration',0],
						['NewPortMappingDescription',this.name],
						['NewProtocol',prot],
						['NewRemoteHost',""]
					];
				} else {
					var args = [
//						['NewEnabled',enabled],
						['NewExternalPort',externalPort],
//						['NewInternalClient',this.getInternalAddress()],
//						['NewInternalPort',port],
						['NewProtocol',prot],
						['NewRemoteHost',""]
					];
				}
                this.validGateway.device.runService(this.validGateway.service,
                                                    enabled?'AddPortMapping':'DeletePortMapping',
                                                    args, onresult);
            }
        },
        getMappings: function(callback) {
            if (! this.validGateway) {
                callback();
            } else {
                var info = this.validGateway;
                var idx = 0;
                var allmappings = [];

                function oneResult(evt) {
                    if (evt.target.code == 200) {
                        var resp = evt.target.responseXML.querySelector("GetGenericPortMappingEntryResponse");
                        var mapping = flatParseNode(resp);
                        allmappings.push(mapping);
                        getOne();
                    } else {
                        callback(allmappings);
                    }
                }

                function getOne() {
                    info.device.runService(info.service, 'GetGenericPortMappingEntry', [['NewPortMappingIndex',idx++]], oneResult);
                }
                getOne();
            }
        },
        getIP: function(callback) {
            var infos = this.getWANServiceInfo();
            var foundIP = null;
            var returned = 0;

            function oneResult(info, evt) {
                var doc = evt.target.responseXML; // doc undefined sometimes
                var ipelt = doc.documentElement.querySelector('NewExternalIPAddress');
                var ip = ipelt ? ipelt.innerHTML : null;

                returned++;
                info.device.externalIP = ip;
                if (ip) {
                    foundIP = ip;
                    this.validGateway = info;
                }
                
                if (returned == infos.length) {
                    callback(foundIP);
                }
            }
            
            if (infos && infos.length > 0) {
                for (var i=0; i<infos.length; i++) {
                    var info = infos[i];
                    info.device.runService(info.service,'GetExternalIPAddress',[],oneResult.bind(this, info));
                }
            } else {
                callback(null);
            }
        }
    };
    
    function GatewayDevice(info) {
        this.info = info;
        this.description_url = info.headers.location;
        this.url = new URL(this.description_url);
        this.services = [];
        this.devices = [];
        this.attributes = null;
        this.externalIP = null;
    }
    GatewayDevice.prototype = {
        runService: function(service, command, args, callback) {
            var xhr = new WSC.ChromeSocketXMLHttpRequest();
            var url = this.url.origin + service.controlURL;
            var body = '<?xml version="1.0"?>' +
                '<s:Envelope ' +
                'xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
                's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
                '<s:Body>' +
                '<u:' + command + ' xmlns:u=' +
                JSON.stringify(service.serviceType) + '>' +
                args.map(function(args) {
                    return '<' + args[0]+ '>' +
                        (args[1] === undefined ? '' : args[1]) +
                        '</' + args[0] + '>';
                }).join('') +
                '</u:' + command + '>' +
                '</s:Body>' +
                '</s:Envelope>';
            //console.log('req body',body)
            var payload = new TextEncoder('utf-8').encode(body).buffer;
            var headers = {
                'content-type':'text/xml; charset="utf-8"',
                'connection':'close',
                'SOAPAction': JSON.stringify(service.serviceType) + '#' + command
            };
            for (var k in headers) {
                xhr.setRequestHeader(k, headers[k]);
            }
            xhr.open("POST",url);
            xhr.setRequestHeader('connection','close');
            xhr.responseType = 'xml';
            xhr.send(payload);
            xhr.onload = xhr.onerror = xhr.ontimeout = callback;
        },
        getDescription: function(callback) {
            var xhr = new WSC.ChromeSocketXMLHttpRequest();
            console.clog('UPNP','query',this.description_url);
            xhr.open("GET",this.description_url);
            xhr.setRequestHeader('connection','close');
            xhr.responseType = 'xml';
            function onload(evt) {
                if (evt.target.code == 200) {
                    var doc = evt.target.responseXML;

                    var devices = doc.documentElement.querySelectorAll('device');
                    for (var i=0; i<devices.length; i++) {
                        this.devices.push( flatParseNode(devices[i]) );
                    }

                    var services = doc.documentElement.querySelectorAll('service');
                    for (var i=0; i<services.length; i++) {
                        this.services.push( flatParseNode(services[i]) );
                    }

                }
                //console.log('got service info',this)
                callback();
            }
            xhr.onload = xhr.onerror = xhr.ontimeout = onload.bind(this);
            xhr.send();
        },
        getService: function(desired) {
            var matches = this.services.filter( function(service) {
                return desired.indexOf(service.serviceType) != -1;
            });
            return matches;
        }
    };
    
    function SSDP(opts) {
        this.port = opts.port;
        this.wantUDP = opts.udp === undefined ? true : opts.udp;
		this.searchtime = opts.searchtime;
        this.multicast = '239.255.255.250';
        this.ssdpPort = 1900;
        this.boundPort = null;
        this.searchdevice = 'urn:schemas-upnp-org:device:InternetGatewayDevice:1';
        this._onReceive = this.onReceive.bind(this);
        chrome.sockets.udp.onReceive.addListener( this._onReceive );
        chrome.sockets.udp.onReceiveError.addListener( this._onReceive );
        this.sockMap = {};
        this.lastError = null;
        this.searching = false;
        this._event_listeners = {};
    }

    SSDP.prototype = {
        addEventListener: function(name, callback) {
            if (! this._event_listeners[name]) {
                this._event_listeners[name] = [];
            }
            this._event_listeners[name].push(callback);
        },
        trigger: function(name, data) {
            var cbs = this._event_listeners[name];
            if (cbs) {
                cbs.forEach( function(cb) { cb(data); } );
            }
        },
        onReceive: function(result) {
            var state = this.sockMap[result.socketId];
            var resp = new TextDecoder('utf-8').decode(result.data);
            if (! (resp.startsWith("HTTP") || resp.startsWith("NOTIFY"))) { return; }
            var lines = resp.split('\r\n');
            var headers = {};
            // Parse headers from lines to hashmap
            lines.forEach(function(line) {
                line.replace(/^([^:]*)\s*:\s*(.*)$/, function (_, key, value) {
                    headers[key.toLowerCase()] = value;
                });
            });
            if (headers.st == this.searchdevice) {
                //console.log('SSDP response',headers,result)
                var device = {
                    remoteAddress: result.remoteAddress,
                    remotePort: result.remotePort,
                    socketId: 977,
                    headers: headers
                };
                this.trigger('device',device);
            }
        },
        error: function(data) {
            this.lastError = data;
            console.clog('UPNP', "error",data);
            this.searching = false;
            // clear out all sockets in sockmap
            this.cleanup();
			this.allDone(false);
        },
        cleanup: function() {
            for (var socketId in this.sockMap) {
                chrome.sockets.udp.close(parseInt(socketId));
            }
            this.sockMap = {};
            chrome.sockets.udp.onReceive.removeListener( this._onReceive );
            chrome.sockets.udp.onReceiveError.removeListener( this._onReceive );
        },
        stopsearch: function() {
            console.clog('UPNP', "stopping ssdp search");
            // stop searching, kill all sockets
            this.searching = false;
            this.cleanup();
            this.trigger('stop');
        },
        search: function(opts) {
            if (this.searching) { return; }
            setTimeout( this.stopsearch.bind(this), this.searchtime );
            var state = {opts:opts};
            chrome.sockets.udp.create(function(sockInfo) {
                state.sockInfo = sockInfo;
                this.sockMap[sockInfo.socketId] = state;
                chrome.sockets.udp.setMulticastTimeToLive(sockInfo.socketId, 1, function(result) {
                    if (result < 0) {
                        this.error({error:'ttl',code:result});
                    } else {
                        chrome.sockets.udp.bind(state.sockInfo.socketId, '0.0.0.0', 0, this.onbound.bind(this,state));
                    }
                }.bind(this));
            }.bind(this));
        },
        onbound: function(state,result) {
            if (result < 0) {
                this.error({error:'bind error',code:result});
                return;
            }
            chrome.sockets.udp.getInfo(state.sockInfo.socketId, this.onInfo.bind(this,state));
        },
        onInfo: function(state, info) {
			var lasterr = chrome.runtime.lastError;
			if (lasterr) {
				// socket was deleted in the meantime?
				this.error(lasterr);
				return;
			}
            this.boundPort = info.localPort;
            //console.clog('UPNP','bound')
            chrome.sockets.udp.joinGroup(state.sockInfo.socketId, this.multicast, this.onjoined.bind(this,state));
        },
        onjoined: function(state, result) {
            var lasterr = chrome.runtime.lastError;
            if (lasterr) {
                this.error(lasterr);
                return;
            }
            if (result < 0) {
                this.error({error:'join multicast',code:result});
                return;
            }
            var req = 'M-SEARCH * HTTP/1.1\r\n' +
                'HOST: ' + this.multicast + ':' + this.ssdpPort + '\r\n' +
                'MAN: "ssdp:discover"\r\n' +
                'MX: 1\r\n' +
                'ST: ' + this.searchdevice + '\r\n' +
                '\r\n';

            chrome.sockets.udp.send(state.sockInfo.socketId, new TextEncoder('utf-8').encode(req).buffer, this.multicast, this.ssdpPort, this.onsend.bind(this));
            //console.clog('UPNP', 'sending to',this.multicast,this.ssdpPort)
        },
        onsend: function(result) {
            //console.clog('UPNP', 'sent result',result)
        }
    };
    WSC.UPNP = UPNP;
})();

(function(){
    var sockets = chrome.sockets;
    
    class PathAuthenticator {
        constructor(pattern = ".*", user = 'admin', pass = 'admin') {
            this.pattern = new RegExp(pattern);
            this.user = user;
            this.pass = pass;
        }

        isValidForPath(path) {
            return path && path.match(this.pattern);
        }

        authenticate({headers : {authorizations : authorizations = "boo"}} = {headers: {}}) {
            var [type,token] = authorizations.split(' ');
            
            // Only validate auth if basic auth was attempted
            // and a token (username and password) is provided
            if (token && type && type.toLowerCase() == 'basic') {
                var [user,pass] = atob(token).split(':');
                return user == this.user && pass == this.pass;
            }
            return false;
        }
    }
    
    function WebApplication(opts) {
        // need to support creating multiple WebApplication...
        if (WSC.DEBUG) {
            console.log('initialize webapp with opts',opts);
        }
        opts = opts || {};
        this.id = Math.random().toString();
        this.opts = opts;
        this.handlers = opts.handlers || [];
        this.init_handlers();
        this.sockInfo = null;
        this.lasterr = null;
        this.stopped = false;
        this.starting = false;
        this.start_callback = null;
        this._stop_callback = null;
        this.started = false;
        this.fs = null;
        this.streams = {};
        this.upnp = null;
        if (opts.retainstr) {
            // special option to setup a handler
            chrome.fileSystem.restoreEntry( opts.retainstr, function(entry) {
                if (entry) {
                    this.on_entry(entry);
                } else {
                    this.error('error setting up retained entry');
                }
            }.bind(this));
        }
        if (opts.entry) {
            this.on_entry(opts.entry);
        }
        this.host = this.get_host();
        this.port = parseInt(opts.port || 8887);

        this._idle_timeout_id = null;

        this.on_status_change = null;
        this.interfaces = [];
        this.interface_retry_count = 0;
        this.urls = [];
        this.extra_urls = [];
        if (this.port > 65535 || this.port < 1024) {
            var err = 'bad port: ' + this.port;
            this.error(err);
        }
        this.acceptQueue = [];
    }

    WebApplication.prototype = {
        processAcceptQueue: function() {
            console.log('process accept queue len',this.acceptQueue.length);
            while (this.acceptQueue.length > 0) {
                var sockInfo = this.acceptQueue.shift();
                this.onAccept(sockInfo);
            }
        },
        updateOption: function(k,v) {
            this.opts[k] = v;
            switch(k) {
            case 'optDoPortMapping':
                if (! v) {
                    if (this.upnp) {
                        this.upnp.removeMapping(this.port, 'TCP', function(result) {
                            console.log('result of removing port mapping',result);
                            this.extra_urls = [];
                            this.upnp = null;
                            //this.init_urls() // misleading because active connections are not terminated
                            //this.change()
                        }.bind(this));
                    }
                }
                break;
            }
        },
        get_info: function() {
            return {
                interfaces: this.interfaces,
                urls: this.urls,
                opts: this.opts,
                started: this.started,
                starting: this.starting,
                stopped: this.stopped,
                lasterr: this.lasterr
            };
        },
        updatedSleepSetting: function() {
            if (! this.started) {
                chrome.power.releaseKeepAwake();
                return;
            }
            if (this.opts.optPreventSleep) {
                console.log('requesting keep awake system');
                chrome.power.requestKeepAwake(chrome.power.Level.SYSTEM);
            } else {
                console.log('releasing keep awake system');
                chrome.power.releaseKeepAwake();
            }
        },
        on_entry: function(entry) {
            var fs = new WSC.FileSystem(entry);
            this.fs = fs;
            this.add_handler(new HandlerMatcher('.*',WSC.DirectoryEntryHandler.bind(null, fs)));
            this.init_handlers();
            if (WSC.DEBUG) {
                //console.log('setup handler for entry',entry)
            }
            //if (this.opts.optBackground) { this.start() }
        },
        get_host: function() {
            var host;
            if (WSC.getchromeversion() >= 44 && this.opts.optAllInterfaces) {
                if (this.opts.optIPV6) {
                    host = this.opts.host || '::';
                } else {
                    host = this.opts.host || '0.0.0.0';
                }
            } else {
                host = this.opts.host || '127.0.0.1';
            }
            return host;
        },
        add_handler: function(handler) {
            this.handlers.push(handler);
        },
        change: function() {
            if (this.on_status_change) { this.on_status_change(); }
        },
        start_success: function(data) {
            if (this.opts.optPreventSleep) {
                console.log('requesting keep awake system');
                chrome.power.requestKeepAwake(chrome.power.Level.SYSTEM);
            }
            var callback = this.start_callback;
            this.start_callback = null;
            this.registerIdle();
            if (callback) {
                callback(this.get_info());
            }
            this.change();
        },
        error: function(data) {
            if (this.opts.optPreventSleep) {
                chrome.power.releaseKeepAwake();
            }
            this.interface_retry_count=0;
            var callback = this.start_callback;
            this.starting = false;
            this.stopped = true;
            this.start_callback = null;
            console.error('webapp error:',data);
            this.lasterr = data;
            this.change();
            if (callback) {
                callback({error:data});
            }
        },
        stop: function(reason, callback) {
            this.lasterr = '';
            this.urls = [];
            this.change();
            if (callback) { this._stop_callback = callback; }
            console.log('webserver stop:',reason);
            if (this.starting) {
                console.error('cant stop, currently starting');
                return;
            }
            this.clearIdle();

            if (true || this.opts.optPreventSleep) {
                if (WSC.VERBOSE)
                    console.log('trying release keep awake');
				if (chrome.power)
					chrome.power.releaseKeepAwake();
            }
            // TODO: remove hidden.html ensureFirewallOpen
            // also - support multiple instances.

            if (! this.started) {
                // already stopped, trying to double stop
                console.warn('webserver already stopped...');
                this.change();
                return;
            }

            this.started = false;
            this.stopped = true;
            chrome.sockets.tcpServer.disconnect(this.sockInfo.socketId, this.onDisconnect.bind(this, reason));
            for (var key in this.streams) {
                this.streams[key].close();
            }
            this.change();
            // also disconnect any open connections...
        },
        onClose: function(reason, info) {
            var err = chrome.runtime.lastError;
            if (err) { console.warn(err); }
            this.stopped = true;
            this.started = false;
            if (this._stop_callback) {
                this._stop_callback(reason);
            }
            if (WSC.VERBOSE)
                console.log('tcpserver onclose',info);
        },
        onDisconnect: function(reason, info) {
            var err = chrome.runtime.lastError;
            if (err) { console.warn(err); }
            this.stopped = true;
            this.started = false;
            if (WSC.VERBOSE)
                console.log('tcpserver ondisconnect',info);
            if (this.sockInfo) {
                chrome.sockets.tcpServer.close(this.sockInfo.socketId, this.onClose.bind(this, reason));
            }
        },
        onStreamClose: function(stream) {
            console.assert(stream.sockId);
            if (this.opts.optStopIdleServer) {
                for (var key in this.streams) {
                    this.registerIdle();
                    break;
                }
            }
            delete this.streams[stream.sockId];
        },
        clearIdle: function() {
            if (WSC.VERBOSE)
                console.log('clearIdle');
            if (this._idle_timeout_id) {
                clearTimeout(this._idle_timeout_id);
                this._idle_timeout_id = null;
            }
        },
        registerIdle: function() {
            if (this.opts.optStopIdleServer) {
                console.log('registerIdle');
                this._idle_timeout_id = setTimeout( this.checkIdle.bind(this), this.opts.optStopIdleServer );
            }
        },
        checkIdle: function() {
            if (this.opts.optStopIdleServer) {
                if (WSC.VERBOSE)
                    console.log('checkIdle');
                for (var key in this.streams) {
                    console.log('hit checkIdle, but had streams. returning');
                    return;
                }
                this.stop('idle');
            }
        },
        start: function(callback) {
            this.lasterr = null;
            /*
            if (clear_urls === undefined) { clear_urls = true }
            if (clear_urls) {
                this.urls = []
            }*/
            if (this.starting || this.started) { 
                console.error("already starting or started");
                return;
            }
            this.start_callback = callback;
            this.stopped = false;
            this.starting = true;
            this.change();

            // need to setup some things
            if (this.interfaces.length == 0 && this.opts.optAllInterfaces) {
                this.getInterfaces({interface_retry_count:0}, this.startOnInterfaces.bind(this));
            } else {
                this.startOnInterfaces();
            }
        },
        startOnInterfaces: function() {
            // this.interfaces should be populated now (or could be empty, but we tried!)
            this.tryListenOnPort({port_attempts:0}, this.onListenPortReady.bind(this));
        },
        onListenPortReady: function(info) {
            if (info.error) {
                this.error(info);
            } else {
                if (WSC.VERBOSE)
                    console.log('listen port ready',info);
                this.port = info.port;
                if (this.opts.optAllInterfaces && this.opts.optDoPortMapping) {
                    console.clog("WSC","doing port mapping");
                    this.upnp = new WSC.UPNP({port:this.port,udp:false,searchtime:2000});
                    this.upnp.reset(this.onPortmapResult.bind(this));
                } else {
                    this.onReady();
                }
            }
        },
        onPortmapResult: function(result) {
            var gateway = this.upnp.validGateway;
            console.log('portmap result',result,gateway);
			if (result && ! result.error) {
				if (gateway.device && gateway.device.externalIP) {
					var extIP = gateway.device.externalIP;
					this.extra_urls = [{url:'http://'+extIP+':' + this.port}];
				}
			}
            this.onReady();
        },
        onReady: function() {
            this.ensureFirewallOpen();
            //console.log('onListen',result)
            this.starting = false;
            this.started = true;
            console.log('Listening on','http://'+ this.get_host() + ':' + this.port+'/');
            this.bindAcceptCallbacks();
            this.init_urls();
            this.start_success({urls:this.urls}); // initialize URLs ?
        },
        init_urls: function() {
            this.urls = [].concat(this.extra_urls);
            this.urls.push({url:'http://127.0.0.1:' + this.port});
            for (var i=0; i<this.interfaces.length; i++) {
                var iface = this.interfaces[i];
                if (iface.prefixLength > 24) {
                    this.urls.push({url:'http://['+iface.address+']:' + this.port});
                } else {
                    this.urls.push({url:'http://'+iface.address+':' + this.port});
                }
            }
            return this.urls;
        },
        computePortRetry: function(i) {
            return this.port + i*3 + Math.pow(i,2)*2;
        },
        tryListenOnPort: function(state, callback) {
            sockets.tcpServer.getSockets( function(sockets) {
                if (sockets.length == 0) {
                    this.doTryListenOnPort(state, callback);
                } else {
                    var match = sockets.filter( function(s) { return s.name == 'WSCListenSocket'; } );
                    if (match && match.length == 1) {
                        var m = match[0];
                        console.log('adopting existing persistent socket',m);
                        this.sockInfo = m;
                        this.port = m.localPort;
                        callback({port:m.localPort});
						return;
                    }
					this.doTryListenOnPort(state, callback);
                }
            }.bind(this));
        },
        doTryListenOnPort: function(state, callback) {
			var opts = this.opts.optBackground ? {name:"WSCListenSocket", persistent:true} : {};
            sockets.tcpServer.create(opts, this.onServerSocket.bind(this,state,callback));
        },
        onServerSocket: function(state,callback,sockInfo) {
            var host = this.get_host();
            this.sockInfo = sockInfo;
            var tryPort = this.computePortRetry(state.port_attempts);
            state.port_attempts++;
            //console.log('attempting to listen on port',host,tryPort)
            sockets.tcpServer.listen(this.sockInfo.socketId,
                                     host,
                                     tryPort,
                                     function(result) {
                                         var lasterr = chrome.runtime.lastError;
                                         if (lasterr || result < 0) {
                                             console.log('lasterr listen on port',tryPort, lasterr, result);
                                             if (this.opts.optTryOtherPorts && state.port_attempts < 5) {
                                                 this.tryListenOnPort(state, callback);
                                             } else {
                                                 var errInfo = {error:"Could not listen", attempts: state.port_attempts, code:result, lasterr:lasterr};
                                                 //this.error(errInfo)
                                                 callback(errInfo);
                                             }
                                         } else {
                                             callback({port:tryPort});
                                         }
                                     }.bind(this)
                                    );
        },
        getInterfaces: function(state, callback) {
            console.clog('WSC','no interfaces yet',state);
            chrome.system.network.getNetworkInterfaces( function(result) {
                console.log('network interfaces',result);
                if (result) {
                    for (var i=0; i<result.length; i++) {
                        if (this.opts.optIPV6 || result[i].prefixLength <= 24) {
                            if (result[i].address.startsWith('fe80::')) { continue; }
                            this.interfaces.push(result[i]);
                            console.log('found interface address: ' + result[i].address);
                        }
                    }
                }

                // maybe wifi not connected yet?
                if (this.interfaces.length == 0 && this.optRetryInterfaces) {
                    state.interface_retry_count++;
                    if (state.interface_retry_count > 5) {
                        callback();
                    } else {
                        setTimeout( function() {
                            this.getInterfaces(state, callback);
                        }.bind(this), 1000 );
                    }
                } else {
                    callback();
                }
            }.bind(this));
        },
        refreshNetworkInterfaces: function(callback) {
            this.stop( 'refreshNetworkInterfaces', function() {
                this.start(callback);
            }.bind(this));
        },
        /*
        refreshNetworkInterfaces: function(callback) {
            // want to call this if we switch networks. maybe better to just stop/start actually...
            this.urls = []
            this.urls.push({url:'http://127.0.0.1:' + this.port})
            this.interfaces = []
            chrome.system.network.getNetworkInterfaces( function(result) {
                console.log('refreshed network interfaces',result)
                if (result) {
                    for (var i=0; i<result.length; i++) {
                        if (result[i].prefixLength < 64) {
                            //this.urls.push({url:'http://'+result[i].address+':' + this.port})
                            this.interfaces.push(result[i])
                            console.log('found interface address: ' + result[i].address)
                        }
                    }
                }
                this.init_urls()
                callback(this.get_info())
            }.bind(this) )
        },*/
        ensureFirewallOpen: function() {
            // on chromeOS, if there are no foreground windows,
            if (this.opts.optAllInterfaces && chrome.app.window.getAll().length == 0) {
                if (chrome.app.window.getAll().length == 0) {
                    if (window.create_hidden) {
                        create_hidden(); // only on chrome OS
                    }
                }
            }
        },
        bindAcceptCallbacks: function() {
            sockets.tcpServer.onAcceptError.addListener(this.onAcceptError.bind(this));
            sockets.tcpServer.onAccept.addListener(this.onAccept.bind(this));
        },
        onAcceptError: function(acceptInfo) {
            if (acceptInfo.socketId != this.sockInfo.socketId) { return; }
            // need to check against this.socketInfo.socketId
            console.error('accept error',this.sockInfo.socketId,acceptInfo);
            // set unpaused, etc
        },
        onAccept: function(acceptInfo) {
            //console.log('onAccept',acceptInfo,this.sockInfo)
            if (acceptInfo.socketId != this.sockInfo.socketId) { return; }
            if (acceptInfo.socketId) {
                var stream = new WSC.IOStream(acceptInfo.clientSocketId);
                this.adopt_stream(acceptInfo, stream);
            }
        },
        adopt_stream: function(acceptInfo, stream) {
            this.clearIdle();
            //var stream = new IOStream(acceptInfo.socketId)
            this.streams[acceptInfo.clientSocketId] = stream;
            stream.addCloseCallback(this.onStreamClose.bind(this));
            var connection = new WSC.HTTPConnection(stream);
            connection.addRequestCallback(this.onRequest.bind(this,stream,connection));
            connection.tryRead();
        },
        onRequest: function(stream, connection, request) {
            console.log('Request',request.method, request.uri);

            // Find an PathAuthenticator for the request path
            let pathAuthenticator = this.opts.auth.find((ap) => ap.isValidForPath(request.uri));

            // Only attempt auth if a PathAuthenticator was found
            if (pathAuthenticator && !pathAuthenticator.authenticate(request)) {
                var handler = new WSC.BaseHandler(request);
                
                handler.app = this;
                handler.request = request;
                handler.setHeader("WWW-Authenticate", "Basic");
                handler.write("", 401);
                handler.finish();
                return;
            }

            if (this.opts.optModRewriteEnable) {
                var matches = request.uri.match(this.opts.optModRewriteRegexp);
                if (matches === null && this.opts.optModRewriteNegate ||
                    matches !== null && ! this.opts.optModRewriteNegate
                   ) {
                    console.log("Mod rewrite rule matched", matches, this.opts.optModRewriteRegexp, request.uri);
                    var handler = new WSC.DirectoryEntryHandler(this.fs, request);
                    handler.rewrite_to = this.opts.optModRewriteTo;
                }
            }

            function on_handler(re_match, app, requestHandler) {
                requestHandler.connection = connection;
                requestHandler.app = app;
                requestHandler.request = request;
                stream.lastHandler = requestHandler;
                var handlerMethod = requestHandler[request.method.toLowerCase()];
                var preHandlerMethod = requestHandler['before_' + request.method.toLowerCase()];
                if (preHandlerMethod) {
                    preHandlerMethod.apply(requestHandler, re_match);
                }
                if (handlerMethod) {
                    handlerMethod.apply(requestHandler, re_match);
                    return true;
                }
            }
            var handled = false;

            if (handler) {
                handled = on_handler(null, this, handler);
            } else {
                for (var i=0; i<this.handlersMatch.length; i++) {
                    var re = this.handlersMatch[i][0];
                    var reresult = re.exec(request.uri);
                    if (reresult) {
                        var re_match = reresult.slice(1);
                        var cls = this.handlersMatch[i][1];
                        var requestHandler = new cls(request);
                        handled = on_handler(re_match, this, requestHandler);
                        if (handled) { break; }
                    }
                }
            }

            if (! handled) {
                console.error('unhandled request',request);
                // create a default handler...
                var handler = new WSC.BaseHandler(request);
                handler.app = this;
                handler.request = request;
                handler.write("Unhandled request. Did you select a folder to serve?", 404);
                handler.finish();
            }
        }
    };

    function BaseHandler() {
        this.headersWritten = false;
        this.responseCode = null;
        this.responseHeaders = {};
        this.responseData = [];
        this.responseLength = null;
    }
    _.extend(BaseHandler.prototype, {
        options: function() {
            if (this.app.optCORS) {
                this.set_status(200);
                this.finish();
            } else {
                this.set_status(403);
                this.finish();
            }
        },
        setCORS: function() {
            this.setHeader('access-control-allow-origin','*');
            this.setHeader('access-control-allow-methods','GET, POST');
            this.setHeader('access-control-max-age','120');
        },
        get_argument: function(key,def) {
            if (this.request.arguments[key] !== undefined) {
                return this.request.arguments[key];
            } else {
                return def;
            }
        },
        getHeader: function(k,defaultvalue) {
            return this.request.headers[k] || defaultvalue;
        },
        setHeader: function(k,v) {
            this.responseHeaders[k] = v;
        },
        set_status: function(code) {
            console.assert(! this.headersWritten);
            this.responseCode = code;
        },
        writeHeaders: function(code, callback) {
            if (code === undefined || isNaN(code)) { code = this.responseCode || 200; }
            this.headersWritten = true;
            var lines = [];
            if (code == 200) {
                lines.push('HTTP/1.1 200 OK');
            } else {
                //console.log(this.request.connection.stream.sockId,'response code',code, this.responseLength)
                lines.push('HTTP/1.1 '+ code + ' ' + WSC.HTTPRESPONSES[code]);
            }
            if (this.responseHeaders['transfer-encoding'] === 'chunked') {
                // chunked encoding
            } else {
                if (WSC.VERBOSE) {
                    console.log(this.request.connection.stream.sockId,'response code',code, 'clen',this.responseLength);
                }
                console.assert(typeof this.responseLength == 'number');
                lines.push('content-length: ' + this.responseLength);
            }

            var p = this.request.path.split('.');
            if (p.length > 1 && ! this.isDirectoryListing) {
                var ext = p[p.length-1].toLowerCase();
                var type = WSC.MIMETYPES[ext];
                if (type) {
                    // go ahead and assume utf-8 for text/plain and text/html... (what other types?)
                    // also how do we detect this in general? copy from nginx i guess?
                    /*
Changes with nginx 0.7.9                                         12 Aug 2008

    *) Change: now ngx_http_charset_module works by default with following 
       MIME types: text/html, text/css, text/xml, text/plain, 
       text/vnd.wap.wml, application/x-javascript, and application/rss+xml.
*/
                    var default_types = ['text/html',
                                         'text/xml',
                                         'text/plain',
                                         "text/vnd.wap.wml",
                                         "application/javascript",
                                         "application/rss+xml"];

                    if (_.contains(default_types, type)) {
                        type += '; charset=utf-8';
                    }
                    this.setHeader('content-type',type);
                }
            }

            if (this.app.opts.optCORS) {
                this.setCORS();
            }
            
            for (key in this.responseHeaders) {
                lines.push(key +': '+this.responseHeaders[key]);
            }
            lines.push('\r\n');
            var headerstr = lines.join('\r\n');
            //console.log('write headers',headerstr)
            this.request.connection.write(headerstr, callback);
        },
        writeChunk: function(data) {
            console.assert( data.byteLength !== undefined );
            var chunkheader = data.byteLength.toString(16) + '\r\n';
            //console.log('write chunk',[chunkheader])
            this.request.connection.write( WSC.str2ab(chunkheader) );
            this.request.connection.write( data );
            this.request.connection.write( WSC.str2ab('\r\n') );
        },
        write: function(data, code, opt_finish) {
            if (typeof data == "string") {
                // using .write directly can be dumb/dangerous. Better to pass explicit array buffers
                //console.warn('putting strings into write is not well tested with multi byte characters')
                data = new TextEncoder('utf-8').encode(data).buffer;
            }

            console.assert(data.byteLength !== undefined);
            if (code === undefined) { code = 200; }
            this.responseData.push(data);
            this.responseLength += data.byteLength;
            // todo - support chunked response?
            if (! this.headersWritten) {
                this.writeHeaders(code);
            }
            for (var i=0; i<this.responseData.length; i++) {
                this.request.connection.write(this.responseData[i]);
            }
            this.responseData = [];
            if (opt_finish !== false) {
                this.finish();
            }
        },
        finish: function() {
            if (! this.headersWritten) {
                this.responseLength = 0;
                this.writeHeaders();
            }
            if (this.beforefinish) { this.beforefinish(); }
            this.request.connection.curRequest = null;
            if (this.request.isKeepAlive() && ! this.request.connection.stream.remoteclosed) {
                this.request.connection.tryRead();
                if (WSC.DEBUG) {
                    //console.log('webapp.finish(keepalive)')
                }
            } else {
                this.request.connection.close();
                if (WSC.DEBUG) {
                    //console.log('webapp.finish(close)')
                }
            }
        }
    });

    function FileSystem(entry) {
        this.entry = entry;
    }
    _.extend(FileSystem.prototype, {
        getByPath: function(path, callback) {
            if (path == '/') { 
                callback(this.entry);
                return;
            }
            var parts = path.split('/');
            var newpath = parts.slice(1,parts.length);
            WSC.recursiveGetEntry(this.entry, newpath, callback);
        }
    });

    WSC.PathAuthenticator = PathAuthenticator;
    WSC.FileSystem = FileSystem;
    WSC.BaseHandler = BaseHandler;
    WSC.WebApplication = WebApplication;

})();


(function() {
	

	function WebSocketHandler() {
		WSC.BaseHandler.prototype.constructor.call(this);

		this.ws_connection = null;
		this.close_code = null;
		this.close_reason = null;
		this.stream = null;
		this._on_close_called = false;

	}
	WebSocketHandler.prototype = {
		get: function() {
			if (this.getHeader('upgrade','').toLowerCase() != 'websocket') {
				console.log('connection must be upgrade');
				this.set_status(400);
				this.finish();
				return;
			}
			var origin = this.getHeader('origin');
			if (! this.check_origin(origin)) {
				console.log("origin mismatch");
				this.set_status(403);
				this.finish();
				return;
			}
			this.stream = this.request.connection.stream; // detach() ?
			this.stream.set_close_callback(this.on_connection_close.bind(this));
			this.ws_connection = new WebSocketProtocol(this);
			this.ws_connection.accept_connection();
		},
		write_message: function(message, binary) {
			binary = binary || false;
			if (! this.ws_connection) {
				throw new Error("Websocket not connected");
			} else {
				this.ws_connection.write_message(message, binary);
			}
		},
		select_subprotocols: function(subprots) {
		},
		get_compression_options: function() {
		},
		ping: function(data) {
			console.assert( this.ws_connection );
			this.ws_connection.write_ping(data);
		},
		on_pong: function(data) {
		},
		on_close: function() {
		},
		close: function(code,reason) {
			if (this.ws_connection) {
				this.ws_connection.close(code,reason);
				this.ws_connection = null;
			}
		},
		set_nodelay: function(val) {
			this.stream.set_nodelay(val);
		},
		on_connection_close: function() {
			if (this.ws_connection) {
				this.ws_connection.on_connection_close();
				this.ws_connection = null;
			}
			if (! this._on_close_called) {
				this._on_close_called = true;
				this.on_close();
			}
		},
		send_error: function(opts) {
			if (this.stream) {
				this.stream.close();
			} else {
				// XXX bubble up to parent ?
				// dont have super()

			}
		},
		check_origin: function(origin) {
			return true;
		}
	};
	for (var m in WSC.BaseHandler.prototype) {
		WebSocketHandler.prototype[m] = WSC.BaseHandler.prototype[m];
	}

	var WSPROT = {
		FIN: 0x80,
		RSV1: 0x40,
		RSV2: 0x20,
		RSV3: 0x10,
		OPCODE_MASK: 0x0f,
		MAGIC: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
	};
	WSPROT.RSV_MASK = WSPROT.RSV1 | WSPROT.RSV2 | WSPROT.RSV3;
	

	function compute_accept_value(key, cb) {
		// sha1 hash etc
		var keybuf = new TextEncoder('utf-8').encode(key);
		var magicbuf = new TextEncoder('utf-8').encode(WSPROT.MAGIC);
		var buf = new Uint8Array(keybuf.length + WSPROT.MAGIC.length);
		buf.set(keybuf, 0);
		buf.set(magicbuf, keybuf.length);
        crypto.subtle.digest({name:'SHA-1'}, buf).then( function(result) {
			var d = btoa(WSC.ui82str(new Uint8Array(result)));
			cb(d);
        });
	}


	function _websocket_mask(mask, data) {
		// mask is 4 bytes, just keep xor with it
		var v = new Uint8Array(data);
		var m = new Uint8Array(mask);
		for (var i=0; i<v.length; i++) {
			v[i] ^= m[i % 4];
		}
		return v.buffer;
	}

	function WebSocketProtocol(handler, opts) {
		opts = opts || {};
		opts.mask_outgoing = opts.mask_outgoing || false;
		opts.compression_options = opts.compression_options || null;
		
		this.handler = handler;
		this.request = handler.request;
		this.stream = handler.stream;
		this.client_terminated = false;
		this.server_terminated = false;

		// WSprotocol 13
		this.mask_outgoing = opts.mask_outgoing;
		this._final_frame = false;
		this._frame_opcode = null;
        this._masked_frame = null;
		this._frame_mask = null;
		this._frame_length = null;
		this._fragmented_message_buffer = null;
		this._fragmented_message_opcode = null;
		this._waiting = null;
		this._compression_options = opts.compression_options;
		this._decompressor = null;
		this._compressor = null;
		this._frame_compressed = null;

		this._messages_bytes_in = 0;
		this._messages_bytes_out = 0;

		this._wire_bytes_out = 0;
		this._wire_bytes_out = 0;
	}
	WebSocketProtocol.prototype = {

		accept_connection: function() {
			// TODO add trycatch with abort
			var valid = this._handle_websocket_headers();
			if (! valid) { return this._abort(); }
			this._accept_connection();
		},
		_challenge_response: function() {
			return new Promise( function(resolve,reject) {
				compute_accept_value(this.request.headers['sec-websocket-key'], function(resp) {
					resolve(resp);
				}.bind(this));
			}.bind(this));
		},
		_accept_connection: function() {
			var subprot_header = '';
			var subprots = this.request.headers['sec-websocket-protocol'] || ''; 
			subprots = subprots.split(',').map(function(s){ return s.trim(); });
			if (subprots.length > 0) {
				var selected = this.handler.select_subprotocols(subprots);
				if (selected) {
					var subprot_header = 'Sec-Websocket-Protocol: ' + selected + '\r\n';
				}
			}
			var ext_header = '';
			var exts = this._parse_extensions_header(this.request.headers);
			for (var i=0; i<exts.length; i++) {
				var ext = exts[i];
				if (ext[0] == 'permessage-deflate' && this._compression_options) {
					this._create_compressors('server',ext[1]);
					if (ext[1].client_max_window_bits !== undefined &&
						ext[1].client_max_window_bits === null) {
						delete ext[1].client_max_window_bits;
					}
					ext_header = 'Sec-Websocket-Extensions: ' + WSC.encode_header(permessage-deflate, ext[1]);
					break;
				}
			}
			console.assert( ext_header == ''); // parsing not working yet

			
			if (this.stream.closed) {
				this._abort();
				return;
			}

			this._challenge_response().then( function(response) {
				var headerlines = ["HTTP/1.1 101 Switching Protocols",
								   "Upgrade: websocket",
								   "Connection: Upgrade",
								   "Sec-WebSocket-Accept: " + response,
								   subprot_header + ext_header];
				var headers = headerlines.join('\r\n') + '\r\n';
				this.stream.write(new TextEncoder('utf-8').encode(headers).buffer);
				this.handler.open();
				this._receive_frame();
			}.bind(this));
		},
		_parse_extensions_header: function(headers) {
			var exts = headers['sec-websocket-extensions'] || '';
			if (exts) {
				//var keys = exts.split(';').map(function(s) { return s.trim() }) // broken need WSC.parse_header
				//return keys
				return [];
				// NEI
			} else {
				return [];
			}
		},
		_process_server_headers: function() {

		},
		_get_compressor_options: function(side, agreed_params) {

		},
		_create_compressors: function(side, agreed_params) {
		},
		_write_frame: function(fin, opcode, data, flags) {
			flags = flags | 0;
			var b;
			var finbit = fin ? WSPROT.FIN : 0;
			var frame = [];
			b = new Uint8Array(1);
			b[0] = finbit | opcode | flags;
			frame.push(b);
			var l = data.byteLength;
			var mask_bit = this.mask_outgoing ? 0x80 : 0;
			if (l < 126) {
				b = new Uint8Array(1);
				b[0] = l | mask_bit;
			} else if (l <= 0xffff) {
				b = new Uint8Array(3);
				b[0] = 126 | mask_bit;
				new DataView(b.buffer).setUint16(1, l);
			} else {
				b = new Uint8Array(9);
				b[0] = 127 | mask_bit;
				new DataView(b.buffer).setUint32(5, l);
			}
			frame.push(b);
			if (this.mask_outgoing) {
				var mask = new Uint8Array(4);
				crypto.getRandomValues(mask);
				frame.push(mask);
				frame.push(_websocket_mask(mask, data));
			} else {
				frame.push(data);
			}
			for (var i=0; i<frame.length; i++) {
				this.stream.writeBuffer.add( frame[i].buffer || frame[i] );
			}
			this.stream.tryWrite();
		},
		write_message: function(message, binary) {
			var opcode = binary ? 0x2 : 0x1;
			if (binary) {
				if (message instanceof ArrayBuffer) {
					msgout = message;
				} else {
					var msgout = new TextEncoder('utf-8').encode(message).buffer;
				}
			} else {
				var msgout = new TextEncoder('utf-8').encode(message).buffer;
			}
			this._messages_bytes_out += message.byteLength;
			var flags = 0;
			if (this._compressor) {

			}
			this._write_frame(true, opcode, msgout, flags);
		},
		write_ping: function(data) {
			console.assert(data instanceof ArrayBuffer);
			this._write_frame(true,0x9,data);
		},
		_receive_frame: function() {
			this.stream.readBytes(2, this._on_frame_start.bind(this));
			// XXX have this throw exception if stream is closed on read event
		},
		_on_frame_start: function(data) {
			//console.log('_on_frame_start',data.byteLength)
			this._wire_bytes_in += data.byteLength;
			var v = new DataView(data,0,2);
			var header = v.getUint8(0);
			var payloadlen = v.getUint8(1);
			this._final_frame = header & WSPROT.FIN;
			var reserved_bits = header & WSPROT.RSV_MASK;
			this._frame_opcode = header & WSPROT.OPCODE_MASK;
			this._frame_opcode_is_control = this._frame_opcode & 0x8;
			if (this._decompressor && this._frame_opcode != 0) {

				// not yet supported
				return;
			}
			if (reserved_bits) {
				this._abort();
				return;
			}
			this._masked_frame = !!(payloadlen & 0x80);
			payloadlen = payloadlen & 0x7f;
			if (this._frame_opcode_is_control && payloadlen >= 126) {
				//console.log('control frames must have payload < 126')
				this._abort();
				return;
			}
			//todo try/catch read and abort
			if (payloadlen < 126) {
				//console.log('payloadlen < 126')
				this._frame_length = payloadlen;
				if (this._masked_frame) {
					//console.log('masked frame')
					this.stream.readBytes(4, this._on_masking_key.bind(this) );
				} else {
					//console.log('simple frame of len', this._frame_length)
					this.stream.readBytes(this._frame_length, this._on_frame_data.bind(this) );
				}
			} else if (payloadlen == 126) {
				this.stream.readBytes(2, this._on_frame_length_16.bind(this));
			} else if (payloadlen == 127) {
				this.stream.readBytes(8, this._on_frame_length_64.bind(this));
			}
		},
		_on_frame_length_16: function(data) {
			//console.log('_on_frame_length_16',data.byteLength)
			this._wire_bytes_in += data.byteLength;
			var v = new DataView(data,0,2);
			this._frame_length = v.getUint16(0);
			this._on_frame_length_n(data);
		},
		_on_frame_length_64: function(data) {
			this._wire_bytes_in += data.byteLength;
			var v = new DataView(data,0,8);
			this._frame_length = v.getUint32(4);
			this._on_frame_length_n(data);
		},
		_on_frame_length_n: function(data) {
			// todo trycatch abort
			if (this._masked_frame) {
				//console.log('masked frame')
				this.stream.readBytes(4, this._on_masking_key.bind(this));
			} else {
				this.stream.readBytes(this._frame_length, this._on_frame_data.bind(this));
			}
		},
		_on_masking_key: function(data) {
			this._wire_bytes_in += data.byteLength;
			//console.log('frame mask', new Uint8Array(data))
			this._frame_mask = data;
			// todo try/catch
			this.stream.readBytes(this._frame_length, this._on_masked_frame_data.bind(this));
		},
		_on_masked_frame_data: function(data) {
			this._on_frame_data(_websocket_mask(this._frame_mask, data));
		},
		_on_frame_data: function(data) {
			//console.log('_on_frame_data',data.byteLength)
			var opcode;
			this._wire_bytes_in += data.byteLength;
			if (this._frame_opcode_is_control) {
				if (! this._final_frame) {
					this._abort();
					return;
				}
				opcode = this._frame_opcode;
			} else if (this._frame_opcode == 0) { // continuation
				if (! this._fragmented_message_buffer) {
					this._abort();
					return;
				}
				this._fragmented_message_buffer.push(data);
				if (this._final_frame) {
					opcode = this._fragmented_message_opcode;
					console.warn;
					data = this._fragmented_message_buffer; // join ?
					this._fragmented_message_buffer = null;
				}
			} else {
				if (this._fragmented_message_buffer) {
					this._abort();
					return;
				}
				if (this._final_frame) {
					opcode = this._frame_opcode;
				} else {
					this._fragmented_message_opcode = this._frame_opcode;
					this._fragmented_message_buffer = [data];
				}
			}

			if (this._final_frame)
				this._handle_message(opcode, data);
			if (! this.client_terminated)
				this._receive_frame();
		},
		_handle_message: function(opcode, data) {
			if (this.client_terminated)
				return;



			if (opcode == 0x1) { // utf-8
				this._messages_bytes_in += data.byteLength;
				var s = new TextDecoder('utf-8').decode(data);
				// todo try/catch and abort
				this._run_callback(this.handler.on_message, this.handler, s);
			} else if (opcode == 0x2) { // binary
				this._messages_bytes_in += data.byteLength; 
				this._run_callback(this.handler.on_message, this.handler, data);
			} else if (opcode == 0x8) { // close
				this.client_terminated = true;
				if (data.byteLength >= 2) {
					var v = new DataView(data,0,2);
					this.handler.close_code = v.getUint16(0);
				}
				if (data.byteLength > 2) {
					this.handler.close_reason = new TextDecoder('utf-8').decode(data.slice(2,data.byteLength));
				}
				this.close(this.handler.close_code);
			} else if (opcode == 0x9) { // ping
				this._write_frame(true, 0xA, data);
			} else if (opcode == 0xa) {
				this._run_callback(this.handler.on_pong, this.handler, data);
			} else {
				this._abort();
			}
		},
		close: function(code, reason) {
			if (! this.server_terminated) {
				if (! this.stream.closed) {
					var close_data;
					if (! code && reason) {
						code = 1000; // normal closure
					}
					if (! code && code !== 0) {
						close_data = new ArrayBuffer(0);
					} else {
						var b = new ArrayBuffer(2);
						var v = new DataView(b);
						v.setUint16(0, code);
						close_data = b;
					}
					if (reason) {
						var extra = new TextEncoder('utf-8').encode(reason);
						var arr = new Uint8Array(close_data.byteLength + extra.length);
						arr.set(close_data, 0);
						arr.set(extra, close_data.byteLength);
						close_data = arr.buffer;
					}
					this._write_frame(true, 0x8, close_data);
				}
				this.server_terminated = true;
			}
			if (this.client_terminated) {
				if (this._waiting) {
					clearTimeout(this._waiting);
					this._waiting = null;
				}
			} else if (! this._waiting) {
				// wait for a bit and then call _abort()
				this._waiting = setTimeout( function() {
					this._abort();
				}.bind(this), 5);
			}
		},
		_handle_websocket_headers: function() {
			var fields = ["host","sec-websocket-key", "sec-websocket-version"];
			for (var i=0; i<fields.length; i++) {
				if (! this.request.headers[fields[i]]) {
					return false;
				}
			}
			return true;
		},
		on_connection_close: function() {
			this._abort();
		},
		_run_callback: function(callback, ctx) {
			callback.apply(ctx, Array.prototype.slice.call(arguments, 2, arguments.length));
			// catch an exception and abort if we have one.
		},
		_abort: function() {
			this.client_terminated = true;
			this.server_terminated = true;
			this.stream.close();
			this.close(); // subclass cleanup
		}
	};


	function ExampleWebSocketHandler() {
		WebSocketHandler.prototype.constructor.call(this);
	}
	ExampleWebSocketHandler.prototype = {
		open: function() {
			console.log('websocket handler handler.open()');
			window.ws = this;
			//this.write_message("hello!")
		},
		on_message: function(msg) {
			console.log('got ws message',msg,msg.byteLength, new Uint8Array(msg));
			//this.write_message('pong')
		},
		on_close: function() {

		}
	};
	for (var m in WebSocketHandler.prototype) {
		ExampleWebSocketHandler.prototype[m] = WebSocketHandler.prototype[m];
	}

	WSC.ExampleWebSocketHandler = ExampleWebSocketHandler;
	WSC.WebSocketHandler = WebSocketHandler;
	
})();
