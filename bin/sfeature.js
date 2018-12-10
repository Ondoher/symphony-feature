#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var ncp = require('ncp');
var child = require('child_process');
const camelcase = require('camelcase');

var thisDir = path.dirname(module.filename) + '/';


String.prototype.camelCase = function()
{
	return camelcase(this);
}

String.prototype.pascalCase = function()
{
	return camelcase(this, {pascalCase: true});
}

function unDos(filepath)
{
	filepath = path.resolve(filepath);

	filepath = filepath.replace(/\\/g, '/');
	return filepath;
}

thisDir = unDos(thisDir) + '/';
var params = argv._;

function outputInstructions()
{
	var instructions = fs.readFileSync(thisDir + 'instructions.txt', {encoding:'ascii'});
	console.log(instructions);
};

function main()
{
	var commands = ['install', 'feature'];

	if (params.length == 0) return outputInstructions();
	if (commands.indexOf(params[0]) == -1) return outputInstructions();
	switch (params[0])
	{
		case 'install':
			if (params.length != 1) return outputInstructions()
			break;
		case 'feature':
			if (params.length < 2 || params.length > 3) return outputInstructions();
			break;
	}

	function replaceNames(text, names)
	{
		var keys = Object.keys(names);
		keys.forEach(function(name)
		{
			var value = names[name];
			var regEx = new RegExp('\{' + name + '\}', 'g');
			text = text.replace(regEx, value);
		});

		return text;
	}

	function processOne(folder, spec, names)
	{
		var fullPath = unDos(fs.realpathSync('./') + '/' + spec.path);
		var justPath = path.dirname(fullPath);
		var templateFile = thisDir + folder + '/templates/' + spec.template;


		mkdirp.sync(justPath);

	// do not overwrite existing files
		if (fs.existsSync(fullPath)) return;

		template = fs.readFileSync(templateFile, {encoding: 'utf-8'});
		template = replaceNames(template, names);

		fs.writeFileSync(fullPath, template);
	}

	function processManifest(folder, names)
	{
		var manifestFile = thisDir + folder + '/manifest.js';
		var manifest = require(manifestFile);

		manifest.files.forEach(function(spec)
		{
			spec.path = replaceNames(spec.path, names);
			processOne(folder, spec, names);
		});
	}

	function getNames(params)
	{
		var app = params[1];
		var name = params[2];

		var result = {}
		result.App = app.pascalCase();
		result.aPp = app.camelCase();
		result.APP = app.toUpperCase().replace(/-/g, '_');;
		result.app = app;

		if (name)
		{
			result.Name = name.pascalCase();
			result.nAme = name.camelCase();
			result.NAME = name.toUpperCase().replace(/-/g, '_');
			result.name = name;
		}

		return result;
	}

	function getPath(params, which)
	{
		var path = (params.length > which)?'':params[1];
		if (params.length != which + 1) return path;
		path += '/' + params[which];

		return path;
	}

	switch (params[0])
	{
		case 'install':
			var names = {}
			names.cwd = process.cwd();
			names.path = getPath(params, 2);
			processManifest('install', names);
			console.log('installing dependencies...');
			child.execSync('npm install');
			break;

		case 'feature':
			var names = getNames(params);
			names.cwd = process.cwd();
			names.path = getPath(params, 2);
			processManifest('feature', names);
			break;
	}
}

main();