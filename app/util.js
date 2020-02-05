import * as d3 from 'd3';

export var d3Load = (data, next) => {
	if (data.includes('.csv')) {
		d3.csv(data).then((res) => next(res));
	} else if (data.includes('.tsv')) {
		d3.tsv(data).then((res) => next(res));
	}
};

export var curvedPath = (x1, x2, y1, y2) => {
	const dx = x1 - x2;
	const dy = y1 - y2;
	const dr = Math.sqrt(dx * dx + dy * dy);
	return 'M' + x1 + ',' + y1 + 'A' + dr + ',' + dr + ' 0 0,1 ' + x2 + ',' + y2;
};

export var sortByFrequency = (array) => {
	var frequency = {};

	array.forEach(function(value) {
		frequency[value] = 0;
	});

	var uniques = array.filter(function(value) {
		return ++frequency[value] == 1;
	});

	return uniques.sort(function(a, b) {
		return frequency[b] - frequency[a];
	});
};
