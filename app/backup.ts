import * as d3 from 'd3';
require('./white.css');

const lineCurved = d3.line().x((d: any) => d.x).y((d: any) => d.y).curve(d3.curveCardinal);
const line = d3.line().x((d: any) => d.x).y((d: any) => d.y);

const svgW = 800;
const svgH = 800;
const svg1 = d3.select('body').append('svg').attr('width', svgW).attr('height', svgH);
const svg2 = d3.select('body').append('svg').attr('width', svgW).attr('height', svgH);
const svg3 = d3.select('body').append('svg').attr('width', svgW).attr('height', svgH);
const pExtent = [ [ 80, svgW - 50 ], [ 30, svgH - 80 ] ];
const peW = pExtent[0][1] - pExtent[0][0];
const peH = pExtent[1][1] - pExtent[1][0];

const parX = (i) => pExtent[0][0] + peW / (pars.length - 1) * i;

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
	{ label: 'betweenness', attr: 'betweennessstand', scaleMode: 'pow', scalePar: 0.2 },
	{ label: 'weighted degree', attr: 'wdegreestand', scaleMode: 'pow', scalePar: 0.5 },
	{ label: 'degree', attr: 'degreestand', scaleMode: 'pow', scalePar: 0.8 },
	{ label: 'eigencentrality', attr: 'eigencentrality', scaleMode: 'pow', scalePar: 1 },
	{ label: 'closeness', attr: 'closenessstand', scaleMode: 'pow', scalePar: 1 },
	{ label: 'clustering', attr: 'clustering', scaleMode: 'pow', scalePar: 1, reverse: true }
];

const prepareData = (data) => {
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

	return data;
};

const drawParallels = (svg, subsets) => {
	loadData((records) => {
		const data = prepareData(records);

		/*
    drawing axes
  */
		const scales = {
			linear: (scalePar) => d3.scaleLinear(),
			log: (scalePar) => d3.scaleLog(),
			//pow: (scalePar) => d3.scalePow().exponent(scalePar)
			pow: (scalePar) => d3.scalePow().exponent(1)
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

			if (pi % 2) {
				svg
					.append('line')
					.attr('x1', parX(pi))
					.attr('x2', parX(pi))
					.attr('y1', y2 + 10)
					.attr('y2', y2 + 30)
					.attr('stroke-width', 1)
					.attr('class', 'aux-axis');
			}

			svg
				.append('text')
				.attr('x', parX(pi))
				.attr('y', pExtent[1][1] + (pi % 2 ? 55 : 30))
				.text(par.label)
				.attr('class', 'axis-label par-label')
				.attr('text-anchor', 'middle');

			par.scale = scales
				[par.scaleMode](par.scalePar)
				.range([ y2, y1 ])
				.domain(par.reverse ? [ par.max, par.min ] : [ par.min, par.max ]);
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
		});

		/*
    drawing lines
  */

		data.map((record, ri) => {
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
		if (subsets.includes('heretics')) {
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
		}

		if (subsets.includes('female')) {
			data.filter((r) => r.sex === 'f').map((record, ri) => {
				svg
					.append('path')
					.data([
						record.posM.map((m, i) => {
							return { y: m, x: parX(i) };
						})
					])
					.attr('d', line)
					.attr('class', 'line line-female');
			});
		}

		if (subsets.includes('male')) {
			data.filter((r) => r.sex === 'm').map((record, ri) => {
				svg
					.append('path')
					.data([
						record.posM.map((m, i) => {
							return { y: m, x: parX(i) };
						})
					])
					.attr('d', line)
					.attr('class', 'line line-male');
			});
		}

		// circles
		//seq.posM.map((m, i) => drawCircle(parX(i), m, 5, seq.color, 'white', 1.5))

		pars.forEach((par, pi) => {
			svg
				.append('g')
				.attr('class', 'axis')
				.call(d3.axisRight(par.scale).tickValues([ par.min ].concat(par.scale.ticks(4))))
				.attr('transform', 'translate(' + parX(pi) + ', 0)');
		});
	});
};

var rankLimit = 20;
var colors = [
	'#a6cee3',
	'#1f78b4',
	'#b2df8a',
	'#33a02c',
	'#fb9a99',
	'#e31a1c',
	'#fdbf6f',
	'#ff7f00',
	'#cab2d6',
	'#6a3d9a',
	'#ffff99',
	'#b15928'
];

const drawRanks = () => {
	loadData((records) => {
		pars.forEach((par) => {
			par.allVals = records.map((d) => parseFloat(d[par['attr']])).sort((a, b) => b - a);
		});
		console.log(pars);

		records.forEach((record) => {
			record.ranks = {};
			record.ranksSum = 0;
			pars.forEach((par) => {
				const value = parseFloat(record[par['attr']]);
				const rank = par.allVals.indexOf(value);
				record.ranks[par.attr] = rank;
				record.ranksSum += rank;
			});
		});

		// drawing circles
		records.forEach((record) => {
			pars.forEach((par, pi) => {
				const rank = record.ranks[par.attr];
				if (rank < rankLimit) {
					const y = rank / rankLimit * peH + pExtent[1][0];

					const g = svg.append('g').attr('class', 'circle-group');
					g
						.append('circle')
						.attr('r', 10)
						.attr('class', 'circle')
						.attr('fill', 'white')
						.attr('cy', y)
						.attr('cx', parX(pi));
				}
			});
		});
	});
};

drawParallels(svg1, [ 'heretics' ]);
drawParallels(svg2, [ 'female' ]);
drawParallels(svg3, [ 'male' ]);
