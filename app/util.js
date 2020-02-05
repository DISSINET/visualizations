import * as d3 from 'd3';

export var d3Load = (data, next) => {
	if (data.includes('.csv')) {
		d3.csv(data).then((res) => next(res));
	} else if (data.includes('.tsv')) {
		d3.tsv(data).then((res) => next(res));
	}
};
