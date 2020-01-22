import * as d3 from 'd3';
require('./app.css');

const lineCurved = d3.line().x((d: any) => d.x).y((d: any) => d.y).curve(d3.curveCardinal);
const line = d3.line().x((d: any) => d.x).y((d: any) => d.y);

const svgW = 800;
const svgH = 800;
const svg = d3.select('body').append('svg').attr('width', svgW).attr('height', svgH);
const pExtent = [ [ 50, svgW - 50 ], [ 10, svgH - 70 ] ];
const peW = pExtent[0][1] - pExtent[0][0];
const peH = pExtent[1][1] - pExtent[1][0];

const parX = (i) => pExtent[0][0] + peW / pars.length * i;

const loadData = (next: Function) => {
	fetch(
		'https://spreadsheets.google.com/feeds/list/1sCrFQpaesWHWXZcrAV34VmGETXxB4rKYGFw8nk1cmh0/1/public/values?alt=json'
	)
		.then((response) => {
			return response.json();
		})
		.then((json) => {
			const records: {}[] = [];
			json.feed.entry.map((entry: any) => {
				const record: any = {};

				Object.keys(entry).forEach((key: string) => {
					if (key.indexOf('gsx$') > -1) {
						const keyName = key.replace('gsx$', '');
						const value = entry[key].$t;
						record[keyName] = value;
					}
				});
				records.push(record);
			});
			next(records);
		});
};

var pars = [
	{ label: 'betweeness', attr: 'betweeness', scale: 'pow', scalePar: 0.15 },
	{ label: 'degree', attr: 'degree', scale: 'pow', scalePar: -0.2 },
	{ label: 'closeness', attr: 'closeness', scale: 'pow', scalePar: 0.6 },
	{ label: 'weighted degree', attr: 'weighteddegree', scale: 'pow', scalePar: 0.1 },
	{ label: 'eigencentrality', attr: 'eigencentrality', scale: 'pow', scalePar: 0.1 },
	{ label: 'clustering inverted', attr: 'clusteringinverted', scale: 'pow', scalePar: 0.8 }
];

const drawParallels = () => {
	loadData((data) => {
		console.log(data);

		data.forEach((dataRecord: any) => {
			dataRecord.values = {};
			pars.forEach((par) => {
				const value = parseFloat(dataRecord[par['attr']]);
				dataRecord.values[par.attr] = value;
			});
		});

		// preparing pars, adding scale
		pars.forEach((par: any) => {
			const vals = data.map((d) => d.values[par['attr']]);
			const max = Math.max(...vals);
			const min = Math.min(...vals);
			par['max'] = max;
			par['min'] = min;
		});

		/*
    drawing axes
  */
		const scales = {
			linear: (scalePar) => d3.scaleLinear(),
			log: (scalePar) => d3.scaleLog(),
			pow: (scalePar) => d3.scalePow().exponent(scalePar)
		};

		pars.forEach((par: any, pi) => {
			const y1 = pExtent[1][0];
			const y2 = pExtent[1][1];

			svg
				.append('line')
				.attr('x1', parX(pi))
				.attr('x2', parX(pi))
				.attr('y1', y1)
				.attr('y2', y2)
				.attr('stroke-width', 1)
				.attr('class', 'axis');

			svg
				.append('text')
				.attr('x', parX(pi))
				.attr('y', pExtent[1][1] + (pi % 2 ? 40 : 20))
				.text(par.label)
				.attr('class', 'axis-label')
				.attr('text-anchor', 'middle');

			par.scale = scales[par.scale](par.scalePar).range([ y2, y1 ]).domain([ par.min, par.max ]);
		});

		/*
    calculating positions
  */

		data.map((record: any, ri) => {
			record.posM = Object.keys(record.values).map((key, vi) => {
				const value = record.values[key];
				const par = pars.find((par) => par.attr === key);
				return par.scale(value);
			});

			console.log(record);
		});

		/*
    drawing lines
  */

		data.filter((r) => r.heretic !== 'h').map((record, ri) => {
			svg
				.append('path')
				.data([
					record.posM.map((m, i) => {
						return { y: m, x: parX(i) };
					})
				])
				.attr('d', line)
				.attr('class', 'line');
		});
		data.filter((r) => r.heretic === 'h').map((record, ri) => {
			svg
				.append('path')
				.data([
					record.posM.map((m, i) => {
						return { y: m, x: parX(i) };
					})
				])
				.attr('d', line)
				.attr('class', 'line line-heretic');
		});
		// circles
		//seq.posM.map((m, i) => drawCircle(parX(i), m, 5, seq.color, 'white', 1.5))

		pars.forEach((par, pi) => {
			svg
				.append('g')
				.attr('class', 'axis')
				.call(d3.axisRight(par.scale).tickValues([ par.min ].concat(par.scale.ticks(5))))
				.attr('transform', 'translate(' + parX(pi) + ', 0)');
		});

		console.log(pars);
	});
};
