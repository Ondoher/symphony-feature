var fs = require('fs');
var path = require('path');
var Defer = require('./defer');

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

function loadConfigFile(configPath)
{
	var config = {};

	try {
		config = require(path.join(configPath, 'config.js'));
	} catch (e) {}

	return config;
}

exports.collectConfigs = function()
{
	var config = {
		port: 8080,
		baseUrl: 'http://localhost:8080',
		basePath: process.cwd().replace(/\\/g, '/'),
	};

	var configPath = path.join(process.cwd(), 'config');
	config = Object.assign(config, loadConfigFile(configPath));
	var base = path.join(process.cwd(), 'features')
	return getDir(base)
		.then(function(result)
		{
			console.log(result);
			result.forEach(function(dir)
			{
				var configPath = path.join(base, dir, 'config');
				var subConfig = loadConfigFile(configPath);
				config[dir] = subConfig;
			});

			global.CONFIG = config;
		});
}
