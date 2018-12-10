/*
Middleware: featureRouter

If the url points to an feature, it will run that feature.
*/
var url = require('url');
var fs = require('fs');
var uuid = require('node-uuid');
//var CONFIG = require('./config').CONFIG;
var path = require('path');

var features = {};
var fileCache = {};

function getFeature(root, path, callback)
{
	var file = path.split('/').pop();
	var file = root + path + '/index.js';
	if (features[path])
	{
		return callback(features[path], file);
	}
	else
	{
		fs.exists(file, function(exists)
		{
	  		if (exists)
			{
//				if (root.charAt(0) != '/') file = '../' + file;

				try
				{
					features[path] = require(file);
				}
				catch (e)
				{
					console.log(e);
					console.log(e.stack);

				}
				return callback(features[path], file);
			}
			else
				callback(null, '');
		});
	}
}

module.exports = function()
{
	return function(req, res, next)
	{
		if (req.error) return next();
		var featurePath = req.featurePath;
		var ext = path.extname(req.url);
		var json = ext == '.json';
		var javascript = ext == '.js';
		var css = ext == '.css';

		if (featurePath == null) return next();

		getFeature(CONFIG.basePath + '/features/', featurePath, function(feature, featurePath)
		{
			if (feature)
			{
				if (javascript && req.hash && fileCache[req.hash])
				{
					var headers = {'Content-Type': 'text/javascript'};

					res.writeHead(200, headers);
					res.end(fileCache[req.hash]);

					return Promise.resolve(null);
				}
				if (css && req.hash && fileCache[req.hash])
				{
					res.writeHead(200, {'Content-Type': 'text/css'});
					res.end(fileCache[req.hash]);

					return Promise.resolve(null);
				}
				if (json && req.hash && fileCache[req.hash])
				{
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end(fileCache[req.hash]);

					return Promise.resolve(null);
				}

				feature.getFeature(req, res)
					.then(function(feature)
					{
						var content = feature.getFile(req.url);
						if (!content && content != '') {
							next();
						}

						if (req.hash && global.CONFIG.builderCache)
							fileCache[req.hash] = content;

						if (javascript)
						{
							res.writeHead(200, {'Content-Type': 'text/javascript'});
							res.end(content);
						}
						else if (css)
						{
							res.writeHead(200, {'Content-Type': 'text/css'});
							res.end(content);
						}
						else if (json)
						{
							res.writeHead(200, {'Content-Type': 'application/json'});
							res.end(content);
						}
					})
			}
			else next();
		});
	}
}
