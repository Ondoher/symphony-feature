var Feature = require('symphony-feature').Feature;

exports.getFeature = function() {
	var {aPp} = new Feature('{app}');

	return {aPp}.start();
}