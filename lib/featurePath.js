/*
Middleware: featurePath

Finds the path to the feature based on the url path. The path is saved
in req.featurePath. Url paths look like this

/<feature> - feature root
*/
var fs = require('fs');
var path = require('path');
var url = require('url');
var Defer = require('./defer');

var featurePaths = [];

function getDir(path)
{
	var deferred = new Defer();

	fs.readdir(path, function(err, files)
	{
		if (err) deferred.reject(err);
		else deferred.resolve(files);
	});

	return deferred.promise;
}

function isFeature(path)
{
	if (!fs.existsSync(path)) return false;
	try
	{
		var module = require(path);
		if (module.getFeature)
		{
			return true;
		}
		return false;
	}
	catch(err)
	{
		console.log(err);
		console.log(err.stack);
		return false;
	}
}

function isDirectory(path)
{
	var deferred = new Defer();;

	fs.stat(path, function(err, stats)
	{
		deferred.resolve({path: path, directory: stats.isDirectory()});
	});

	return deferred.promise;
}

function addFeature(path, name) {
	featurePaths.push(path);
	var paths = path.split('/');
	var featureIndex = paths.indexOf('features');
	paths.splice(0, featureIndex + 1);

	var root = global.CONFIG;
	paths.forEach(function(name) {
		root[name] = root[name] || {};
		root = root[name];
	});

	try
	{
		var featureConfig = require(path + '/' + 'feature-config/config.js');
		Object.merge(root, featureConfig);
	} catch (e) {}

}

function checkFeature(path)
{
	var deferred = new Defer();

	fs.stat(path, function(err, stats)
	{
		if (err) return deferred.reject(err);
		if (!stats.isDirectory()) return deferred.resolve(false);

		var parts = path.split('/');
		var name = parts[parts.length - 1];
		var file = path + '/index.js';

		if (isFeature(file)) addFeature(path, name);

		deferred.resolve(true);
	});

	return deferred.promise;
}

function findFeatures(root)
{
	root = (root === undefined)?process.cwd() + '/features':root;

	return getDir(root)
		.then(function(files)
		{
			var promises = [];

			files.forEach(function(file)
			{
				if (file.charAt(0) == '.') return;
				if (file == 'assets') return;
				if (file == 'node_modules') return;
				promises.push(checkFeature(root + '/' + file));
			});

			return Promise.all(promises)
		});
}

function getFullPath(req, featurePath, realPath)
{
	var url = req.url;
	url = url.split('.')[0];
	var remove = 0;
	var fullPath = url;
	if (!featurePath) return featurePath;
	if (!realPath) return featurePath;

	if (url.indexOf(realPath) == 0) fullPath = fullPath.slice(realPath.length)
	else if (url.indexOf(featurePath) == 0) fullPath = fullPath.slice(featurePath.length);

	fullPath = featurePath + '/' + fullPath;
	return fullPath;
}

function getRealPath(req, featurePath)
{
	var url = req.url;
	url = url.split('.')[0];
	var defaultFeature = CONFIG.defaultFeature?'/' + CONFIG.defaultFeature:undefined;
	var realPath = featurePath;
	if (!defaultFeature) return featurePath;
	if (!featurePath) return featurePath;
	if (url.indexOf(defaultFeature) == 0) return faturePath;
	realPath = featurePath.slice(defaultFeature.length);
	if (realPath.charAt(0) != '/') realPath = '/' + realPath;
	return realPath;
}

function matchFeaturePath(url)
{
	var which = '';

	for (var idx = 0, l = featurePaths.length; idx < l; idx++)
	{
		var featurePath = featurePaths[idx];
		if (url.indexOf(featurePath) == 0)
		{
			which = featurePath;
			break;
		}
	}

	return which;
}

function stripTrailingSlash(str)
{
	if(str.substr(-1) == '/')
	{
		return str.substr(0, str.length - 1);
	}
	return str;
}

function stripLeadingSlash(str)
{
	if(str.substr(0) == '/')
	{
		return str.substr(1, str.length);
	}
	return str;
}

function clean(reqUrl)
{
	var parsed = url.parse(reqUrl);
	return url.format(parsed);
}

module.exports = function()
{
	return function(req, res, next)
	{
		req.url = clean(req.url);
		var url = req.url;
		var defaultFeature = CONFIG.defaultFeature?'/' + CONFIG.defaultFeature:undefined;
		var featurePath = matchFeaturePath(url);

		if (featurePath == '' && CONFIG.defaultFeature) featurePath = matchFeaturePath('/' + CONFIG.defaultFeature + url);

		featurePath = stripTrailingSlash(featurePath);
		featurePath = stripLeadingSlash(featurePath);
		if (featurePath != '')
		{
			req.featurePath = featurePath;
			req.realPath = getRealPath(req, featurePath);
			req.fullPath = getFullPath(req, featurePath, req.realPath);
			req.defaultFeature = defaultFeature;
		}

		next();
	}
}

findFeatures()
	.then(function()
	{
		featurePaths.forEach(function(path, idx)
		{
			var root = process.cwd() + '/features';
			var newPath = path.slice(root.length);
			featurePaths[idx] = newPath;
		});
		featurePaths.sort(function(a, b)
		{
			return b.length - a.length;
		});

		console.log(featurePaths)
	})

