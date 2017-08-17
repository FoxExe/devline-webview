var request = require('request');
var libxml = require("libxmljs");
var path = require('path');
var http = require('http');
var url = require('url');
var fs = require('fs');

var serversData = require('./servers.json');

// Default size of thumbnails/preview
var VideoWidth = 240;
var VideoHeight = 200;

// MIME Types for file transferconst mimeType = {
	'.ico': 'image/x-icon',
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.doc': 'application/msword',
	'.eot': 'appliaction/vnd.ms-fontobject',
	'.ttf': 'aplication/font-sfnt'
};

PrintHeader = function (res) {
	res.writeHead(200, {
		'Content-Type': 'text/html; charset=utf-8'
	});
	res.write('<!DOCTYPE html>\n' +
		'<html xmlns="http://www.w3.org/1999/xhtml">\n' +
		'<head>\n' +
		'	<meta charset="utf-8" />\n' +
		'	<title>Cam view</title>\n' +
		'	<meta name="keywords" content="" />\n' +
		'	<meta name="description" content="" />\n' +
		'	<link rel="stylesheet" href="style.css" type="text/css" media="screen, projection" />\n' +
		'	<script type="text/javascript" src="scripts.js"></script>\n' +
		'</head>\n' +
		'<body>\n' +
		'	<div id="wrapper">\n');
};

PrintFooter = function (res) {
	res.write('\t</div>\n</body>\n');
	res.end();
};

SendFile = function (fileName, mimeType, res) {
	var filePath = path.join(__dirname, fileName);
	var stat = fs.statSync(filePath);
	res.writeHead(200, {
		'Content-Type': mimeType,
		'Content-Length': stat.size
	});
	var readStream = fs.createReadStream(filePath);
	readStream.pipe(res);
};

PrintMenu = function (res) {
	res.write('<div class="block-menu">\n');
	res.write('\t<ul id="mainmenu">\n');
	Object.keys(serversData).forEach(function (key, id) {
		res.write(`\t\t<li><a href="${key}">${serversData[key].name}</a></li>\n`);
	});
	res.write('\t</ul>\n');
	res.write('</div>\n');
};

PrintWelcomePage = function (res) {
	PrintHeader(res);
	PrintMenu(res);
	PrintFooter(res);
};

SendVideoStream = function (server, req, res, queryData) {
	var link = `${server.host}${queryData.stream}`;
	link += `?fps=${queryData.fps || '1'}`;
	link += `&keep_aspect_ratio=${queryData.aspect || '1'}`;
	if (!queryData.original) {
		link += '&quality=30';
		link += `&resolution=${queryData.width || VideoWidth}x${queryData.height || VideoHeight}`;
	}
	else
		link += '&quality=85';

	//console.log('[Stream] > Started ' + link);

	var pipe = request({
		uri: link,
		auth: {
			user: server.user,
			pass: server.pass,
			sendImmediately: false
		}
	}).on('error', function (error) {
		console.log('[Error] Can\'t stream! \n\tLink: ' + link + '\n\tCode: ' + error.code);
		//res.write(500, "Unknown error");
		res.end();
		return;
	}).pipe(res);
}

PrintVideoLayout = function (server, req, res) {
	var options = {
		uri: server.host + '/cameras',
		auth: {
			user: server.user,
			pass: server.pass,
			sendImmediately: false
		}
	};

	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			PrintHeader(res);
			PrintMenu(res);

			//console.log(body);
			var camData = libxml.parseXmlString(body);
			var cams = camData.find('//camera');
			console.log(`[Info] Loaded ${cams.length} cams from ${server.host}`);

			for (var i = 0; i < cams.length; i++) {
				res.write('<div class="block-frame">\n' +
					//+ '<video class="video-frame" autoplay preload="none" poster="http://' + req.headers.host + req.url + '?stream=' + cams[i].get('video-uri').text() + '"></video>'
					'	<a href="#" onclick="ToggleFullscreen(this); return false">\n' +
					`	<img class="video-frame" width="${VideoWidth}" height="${VideoHeight}" ` +
					`src="http://${req.headers.host}${req.url}?stream=` +
					`${cams[i].get('image-uri').text()}&time=${new Date().getTime()}" >\n` +
					'	<div class="block-name">' + cams[i].get('name').text() + '</div>\n' +
					'	</a>\n' +
					'</div>\n');
			}

			PrintFooter(res);
		} else {
			console.log('Error: ' + error);
			console.log('Body: ' + body);
			//res.write('Code: ' + response.statusCode);
			//res.write('Error: ' + error);
			//res.write('Body: ' + body);
		}
	});
};

http.createServer(function (req, res) {
	req.on("error", function (error) {
		console.log('# ERROR: ' + error.code);
		res.end(500, "Unknown error");
		return;
	});

	var reqPath = url.parse(req.url).pathname.substr(1);
	//console.log('[Info] Requested ' + req.url);

	fs.lstat(reqPath, function (err, stats) {
		if (err || reqPath == '.') {
			if (serversData[reqPath]) {
				var queryData = url.parse(req.url, true).query;
				if (queryData.stream)
					SendVideoStream(serversData[reqPath], req, res, queryData);
				else
					PrintVideoLayout(serversData[reqPath], req, res);
			} else
				PrintWelcomePage(res);
			return;
		}

		if (stats.isFile()) {
			fs.readFile(reqPath, function (err, data) {
				if (err) {
					res.statusCode = 500;
					res.end(`Error getting the file: ${err}.`);
				} else {
					// based on the URL path, extract the file extention. e.g. .js, .doc, ...
					const ext = path.parse(reqPath).ext;
					// if the file is found, set Content-type and send data
					res.setHeader('Content-type', mimeType[ext] || 'text/plain');
					res.end(data);
				}
			})
		}
	});
}).listen(80);