sfeature = require('symphony-feature');

sfeature.createServer()
	.then(function(server)
	{
		server.listen(global.CONFIG.port);

		console.log('listening');
	});

