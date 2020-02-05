import * as d3 from 'd3';
require('./parallels.css');

import { getSSData } from './../spreadsheet';
import urls from './../urls';

// svg params
const svgW = 1000;
const svgH = 500;
const pExtent = [ [ 100, svgW - 100 ], [ 90, svgH - 80 ] ];
const peW = pExtent[0][1] - pExtent[0][0];
const peH = pExtent[1][1] - pExtent[1][0];

const line = d3.line().x((d) => d.x).y((d) => d.y);
const parX = (i) => pExtent[0][0] + peW / (pars.length - 1) * i;

async function loadTable(tableUrl) {
	const response = await fetch(tableUrl);
	let data = await response.json();
	return data;
}

var pars = [
	{ label: 'betweenness', attr: 'nbetweeness' },
	{ label: 'degree', attr: 'ndegree' },
	{ label: 'eigencentrality', attr: 'neigen' },
	//	{ label: 'ndegree-w', attr: 'ndegree-w' },
	{ label: 'closenness', attr: 'ncloseness' },
	//{ label: 'eccentricity', attr: 'neccentricity', reverse: true },
	{ label: 'clustering', attr: 'nclustering', reverse: true }
];

getSSData(urls.kent.nodes).then((data1) => {
	const svg1 = d3.select('body').append('svg').attr('width', svgW).attr('height', svgH);
	drawChart(svg1, data1);
	svg1.append('text').attr('x', 30).attr('y', 60).text('Kent').attr('class', 'title');
});

getSSData(urls.gugliemites.nodes).then((data2) => {
	const svg2 = d3.select('body').append('svg').attr('width', svgW).attr('height', svgH);
	svg2.append('text').attr('x', 30).attr('y', 60).text('Guglielmites').attr('class', 'title');
	drawChart(svg2, data2);
});

const drawChart = (svg, dataAll) => {
	const data = dataAll; //.filter((d) => d.values.ndegree > 0.001 && d.values.neigen > 0.001);

	const y1 = pExtent[1][0];
	const y2 = pExtent[1][1];

	pars.forEach((par, pi) => {
		const x = parX(pi);

		/*
			axes
		*/
		if (pi % 2) {
			svg
				.append('line')
				.attr('x1', x)
				.attr('x2', x)
				.attr('y1', y2 + 10)
				.attr('y2', y2 + 30)
				.attr('stroke-width', 1)
				.attr('class', 'aux-axis');
		}

		svg
			.append('text')
			.attr('x', x)
			.attr('y', pExtent[1][1] + (pi % 2 ? 55 : 30))
			.text(par.label)
			.attr('class', 'axis-label par-label')
			.attr('text-anchor', 'middle');
	});

	/*
    calculating positions
		*/
	data.map((record, ri) => {
		record.posM = pars.map((par, vi) => {
			const value = record[par.attr];
			par.scale = d3.scaleLinear().range([ y2, y1 ]).domain(par.reverse ? [ 1, 0 ] : [ 0, 1 ]);
			return par.scale(value);
		});
	});

	/*
    drawing lines
  */
	data.filter((d) => d.sex === 'm').forEach((record, ri) => {
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
	data.filter((d) => d.sex === 'f').forEach((record, ri) => {
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

	//axis
	pars.forEach((par, pi) => {
		svg
			.append('g')
			.attr('class', 'axis')
			.call(d3.axisRight(par.scale).tickValues([ 0 ].concat(par.scale.ticks(4))))
			.attr('transform', 'translate(' + parX(pi) + ', 0)');
	});
};
