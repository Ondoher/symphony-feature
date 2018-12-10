var express = require('express');
var http = require('http');
var https = require('https');
var express = require('express');
var compression = require('compression');
var cors = require('cors');
var notFound = require('./notFound');
var staticRouter = require('./staticRouter');
var config = require('./config');
var featureRouter = require('./featureRouter');
var featurePath = require('./featurePath');

module.exports.createServer = function()
{
	var app = express();
	var server;

	return config.collectConfigs()
		.then(function()
		{
			var CONFIG = global.CONFIG;
			var useCompression = CONFIG.useCompression===true?true:false;
			var useCors = CONFIG.cors!==undefined?true:false;

			if (useCompression) app.use(compression({threshold: 5000 }))
			if (useCors)
			{
				app.use(cors(CONFIG.cors));
				app.options('*', cors(CONFIG.cors));
			}

			app
				.use(staticRouter())
				.use(featurePath())
				.use(featureRouter())
				.use(notFound())


			if (CONFIG.https !== undefined)
				server = https.createServer(CONFIG.https, app);
			else
				server = http.createServer(app);

			return server;
	});

}