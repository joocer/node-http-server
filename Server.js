const http = require('http');
const fs = require('fs');
const url = require('url');
const net = require('net');
const querystring = require('querystring');

const debugmode = true;

http.createServer(function(request, response) {
	var body = "";
	request.on('readable', function() {
		var buffer = request.read();
		if (buffer) { body += buffer; }
	});
	request.on('end', function() {
		if (debugmode) { console.log(request.method, request.url, "**", body, "**"); }
		var cookieJar = parseCookies(request);
		requestHandlerFactory(request.url, executeHandler);
		function executeHandler(requestHandler) {
			requestHandler(request.method.toLowerCase(), request.url.toLowerCase(), body, cookieJar, response);
		}
	});
}).listen(80);

console.log('running - server');

//-----------------------------------------------------------------------

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

//-----------------------------------------------------------------------

function parseCookies (request) {
	var cookieJar = {};
	var cookieDough = request.headers.cookie;

	cookieDough && cookieDough.split(';').forEach(function(cookie) {
        	var parts = cookie.split('=');
        	cookieJar[parts.shift().trim()] = decodeURI(parts.join('='));
    	});

    	return cookieJar;
}

function fileHandler(method, page, body, cookies, response) {
	console.log("fileHandler: " + page);
	var pathname = url.parse(page).pathname;
	if (pathname == '/') {
		pathname = '/index.html';
	}
	pathname = '.' + pathname;
	//console.log("fileHandler:path: " + pathname);
	fs.readFile(pathname, function(err, data) {
		if (err) {
			response.writeHead(404, {'Content-Type': 'text/html'});
			response.end();
		}
		else {
			var mime = 'text/html';
			switch(pathname.substr((~-pathname.lastIndexOf(".") >>> 0) + 2))
			{
				case 'svg':
					mime = 'image/svg+xml';
					break;
				case 'css':
					mime = 'text/css';
					break;
				case 'js':
					mime = 'application/javascript';
					break;
			}
			response.writeHead (200, {'Content-Type': mime});
			response.write (data);
			response.end();
		}	
	});
}

function dataHandler(method, page, body, cookies, response) {
	console.log("dataHandler: " + page);
	var pathname = url.parse(page).pathname;
	pathname = 'C:/Node/CSDA/data/' + pathname.substr((~-pathname.lastIndexOf('/') >>> 0) + 2) + '.json';
	fs.readFile(pathname, function(err, data) {
		if (err) {
			response.writeHead(404, {'Content-Type': 'text/html'});
			response.end();
		}
		else {
			response.writeHead (200, {'Content-Type': 'application/json' });
			response.write (data);
			response.end();
		}	
	});
}

function storeHandler(method, page, body, cookies, response) {
	console.log("storehandler:" + page);
	var parts = url.parse(page).pathname.substr(5).split('/');

	if (parts[0]=='releases') {
		releasesHandler(method, page, body, cookies, response);
	}
	else if (parts[0]=='applications') {
		applicationsHandler(method, page, body, cookies, response);
	}
	else {
		response.writeHead(404, {'Content-Type': 'text/html'});
		response.end();
	}
}

// populates a page with values so javascript can access it
function dynamicPageHandler(method, page, body, cookies, response) {
	console.log("dynamicPageHandler: " + page);

	var pathname = url.parse(page).pathname;
	pathname = '../wwwroot' + pathname;

	fs.readFile(pathname, "utf8", function(err, data) {
		if (err) {
			response.writeHead(404, {'Content-Type': 'text/html'});
			response.end();
		}
		else {
			response.writeHead (200, {'Content-Type': 'text/html'});
			var dataItems = querystring.parse(body);
			for(var dataItem in dataItems){
				data = data.replaceAll('%' + dataItem + '%', dataItems[dataItem]);
			}
			data = data.replace(/%.*%/g, '')
			response.write (data);
			response.end();
		}	
	});
};

function nullHandler(method, page, body, cookies, response) {
	console.log("nullhandler:" + page);
	response.writeHead(500);
	response.end();	
	return;
};

function requestHandlerFactory(url, callback) {
	if (url.toLowerCase().startsWith ('/data/')) {
		callback(dataHandler);
		return;
	}
	if (url.toLowerCase().startsWith ('/api/')) {
		callback(storeHandler);
		return;
	}
	if (url.toLowerCase().endsWith('.html')) {
		callback(dynamicPageHandler);
		return;
	}

	return callback(fileHandler);
}
