var static = require('node-static');
var url = require('url');
var path = require('path');

module.exports = function()
{
	var serverRoot = __dirname;
	var publicRoot = path.normalize(serverRoot + '/../public/');
	var featureServer;
	var server = new static.Server(publicRoot);

	return function(req, res, next)
	{
		console.log(req.url);
		if (!featureServer) featureServer = new static.Server(global.CONFIG.basePath + '/features/');
		var paths = url.parse(req.url, true).pathname.split('/');
		paths.shift();
		if (paths[0] == 'assets')
		{
			server.serve(req, res).on('error', function(e)
			{
				req.error = true;
				res.statusCode = 404;
				res.writeHead(404, {'Content-Type': 'text/html'});
				res.write("<h1>404 Not Found</h1>");
				res.end("The page you were looking for: "+ req.url + " can not be found");
			});
		}
		else if (paths.indexOf('assets') != -1)
		{
			var filepath = paths.join('/');
			try
			{
				featureServer.serveFile(filepath, 200, {}, req, res).on('error', function(e)
				{
					req.error = true;
					res.statusCode = 404;
					res.writeHead(404, {'Content-Type': 'text/html'});
					res.write("<h1>404 Not Found</h1>");
					res.end("The page you were looking for: "+ req.url + " can not be found");
				});
			}
			catch (e) {
				console.log(e);
				console.log(e.stack);
				req.error = true;
				next();
			}
		}
		else next();
	}
}
