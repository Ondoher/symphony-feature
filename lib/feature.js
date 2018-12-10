var fs = require('fs');
var path = require('path');
var url = require('url');
var minify = require('uglify-es').minify;
require('./allSettled');
var Defer = require('./defer');

//	return minify(content).code;

class Feature
{
	constructor(name)
	{
		this.name = name;
		this.config = global.CONFIG;

		this.minify = this.config.minify;
		this.cwd = process.cwd();
		this.htmlFiles = [];
		this.defaultJsFiles = [];
		this.jsUrls = [];
		this.jsFiles = [];
		this.cssFiles = [];
		this.htmlToJs = [];
		this.cache = {};
		this.content = {};

		this.defaultJsFiles = [
			name + '/lib/feature.js',
		]
	}

	addHtml(files)
	{
		this.htmlFiles = this.htmlFiles.concat(files);
	}

	addJs(files)
	{
		this.jsFiles = this.jsFiles.concat(files);
	}

	addJsUrls(urls)
	{
		this.jsUrls = this.jsUrls.concat(urls);
	}

	addCss(files)
	{
		this.cssFiles = this.cssFiles.concat(files);
	}

	resolveFilename(file, ext) {

		if (file.indexOf('/lib/') !== -1)
		{
			if (file.charAt(0) === '/') file = file.slice(1);
			var parts = file.split('/');
			parts.shift();
			parts.shift();
			parts.unshift('files');
			file = parts.join('/');
			return path.join(__dirname, file) + (ext || '');
		}
		return path.join(this.cwd, 'features', file) + (ext || '');
	}

	loadFile(name) {
		var deferred = new Defer();
		var filename = this.resolveFilename(name);

		fs.readFile(filename, 'utf-8', function(err, data)
		{
			if (err) return deferred.reject(new Error(err));
			this.content[filename] = data;
			deferred.resolve(data)
		}.bind(this));

		return deferred.promise;
	}

	combineJs(name)
	{
		var fullContent = '';

	// first add the default JS
		this.defaultJsFiles.forEach(function(name)
		{
			var filename = this.resolveFilename(name);
			if (this.content[filename]) fullContent += this.content[filename];
		}, this);

	// then add the html
		this.htmlFiles.forEach(function(name)
		{
			var filename = this.resolveFilename(name, '.js');
			if (this.content[filename]) fullContent += this.content[filename];
			this.htmlToJs
		}, this);

	// first add the JS
		this.jsFiles.forEach(function(name)
		{
			var filename = this.resolveFilename(name);
			if (this.content[filename]) fullContent += this.content[filename];
		}, this);

		var filename = this.resolveFilename(this.name + '/' + name);
		this.content[filename] = fullContent;
		return fullContent;
	}

	combineCss(name)
	{
		var fullContent = '';

		this.cssFiles.forEach(function(name)
		{
			var filename = path.join(this.cwd, 'features', name);
			if (this.content[filename]) fullContent += this.content[filename];
		}, this);

		var filename = this.resolveFilename(this.name + '/' + name);
		this.content[filename] = fullContent;
		return fullContent;
	}

	buildHtml(file)
	{
		return this.loadFile(file)
			.then(function(content) {
				var html = JSON.stringify(content);
				var content = `FEATURE.templates.add(${html});\n`;
				var filename = path.join(this.cwd, 'features', file + '.js');
				this.content[filename] = content;
				this.htmlToJs.push(file + '.js');
				return(content);
			}.bind(this))

	}

	version(content)
	{
	}

	loadContent()
	{
		this.loading = new Defer();
		this.content = {};

		var promises = [];

		this.defaultJsFiles.forEach(function(file) {
			promises.push(this.loadFile(file));
		}, this)

		this.htmlFiles.forEach(function(file)
		{
			promises.push(this.buildHtml(file));
		}, this);

		this.jsFiles.forEach(function(file)
		{
			promises.push(this.loadFile(file));
		}, this);

		this.cssFiles.forEach(function(file)
		{
			promises.push(this.loadFile(file));
		}, this);

		Promise.allSettled(promises)
			.then(function(results) {
				this.loading.resolve(this.content);
			}.bind(this))

		return this.loading.promise;
	}

	waitForContent()
	{
		return this.loading.promise;
	}

	addBaseUrl(files)
	{
		return files.map(function(name)
		{
			var base = this.config.baseUrl.replace(/\/$/, '');
			base = base.replace(/\\$/, '');
			var name = name.replace(/^\//, '');
			name = name.replace(/^\\/, '');
			var url = base + '/' + name;

			return url;
		}, this);
	}

	constructManifest()
	{
	// todo: cachebust hashes
		var manifest = {};
		var js = [];
		var css = [];
		if (this.minify) {
			this.combineJs(this.name + '.js');
			this.combineCss(this.name + '.css');

			js = ['/' + this.name + '/' + this.name + '.js'];
			css = ['/' + this.name + '/' + this.name + '.css'];
		}
		else
		{
			js = this.defaultJsFiles.concat(this.htmlToJs);
			js = js.concat(this.jsFiles);

			css = this.cssFiles;
		}

		manifest.js = this.jsUrls.concat(this.addBaseUrl(js));
		manifest.css = this.addBaseUrl(css);
		manifest.prefix = this.pefix || this.name;
		return manifest;
	}

	saveManifest(manifest)
	{
		var filename = this.resolveFilename(this.name + '/manifest.json');
		this.content[filename] = JSON.stringify(manifest, null, '  ');
		return this;
	}

	start()
	{
		return this.loadContent()
			.then(this.constructManifest.bind(this))
			.then(this.saveManifest.bind(this))
	}

	getFile(name)
	{
		var filename = this.resolveFilename(name);

		return this.content[filename];
	}
}

module.exports = Feature;