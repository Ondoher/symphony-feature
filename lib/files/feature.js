FEATURE = {};

class Templates {
	constructor()
	{
		this.templates = {};
	}

	add(template)
	{
		var all = $('<div>');
		all.html(template);
		all.each(function(idx, element)
		{
			var el = $(element);
			var id = el.attr('id');
			if (!id) return;
			this.templates[id] = el;
		}.bind(this));
	}

	get (id) {
		var el = this.templates[id];
		if (!el) return;

		return el.clone(true, true);
	}
}

FEATURE.templates = new Templates();
