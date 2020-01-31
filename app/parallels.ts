import * as d3 from 'd3';
var style = require('./parallels.css');

console.log('test');

// svg params
const svgW = 1000;
const svgH = 500;
const pExtent = [ [ 100, svgW - 100 ], [ 90, svgH - 80 ] ];
const peW = pExtent[0][1] - pExtent[0][0];
const peH = pExtent[1][1] - pExtent[1][0];

const lineCurved = d3.line().x((d: any) => d.x).y((d: any) => d.y).curve(d3.curveCardinal);
const line = d3.line().x((d: any) => d.x).y((d: any) => d.y);

const parW = 40;
const parX = (i) => pExtent[0][0] + peW / (pars.length - 1) * i;

async function loadTable(tableUrl: string) {
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

async function getData(url) {
	const res = await loadTable(url);
	const records: {}[] = [];
	res.feed.entry.map((entry: any) => {
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

	records.forEach((dataRecord: any) => {
		dataRecord.values = {};
		pars.forEach((par) => {
			const value = parseFloat(dataRecord[par['attr']]);
			dataRecord.values[par.attr] = value;
		});
	});

	return records;
}

// Kent
// docs.google.com/spreadsheets/d/1oU4fwqaUgSnbv9NTjAQbSIooF9J5axzt5MfYCPWEhWE/edit#gid=1338507045
https: const data1Id = '1oU4fwqaUgSnbv9NTjAQbSIooF9J5axzt5MfYCPWEhWE/2';

// Guglielmites
// docs.google.com/spreadsheets/d/1rIcda6bQeEallBHNzjQvvaedReqtW5DWxoUw30dCecQ/edit#gid=1016955786
https: const data2Id = '1rIcda6bQeEallBHNzjQvvaedReqtW5DWxoUw30dCecQ/2';

const url1 = 'https://spreadsheets.google.com/feeds/list/' + data1Id + '/public/values?alt=json';
const url2 = 'https://spreadsheets.google.com/feeds/list/' + data2Id + '/public/values?alt=json';

getData(url1).then((data1) => {
	const svg1 = d3.select('body').append('svg').attr('width', svgW).attr('height', svgH);
	drawChart(svg1, data1);
	svg1.append('text').attr('x', 30).attr('y', 60).text('Kent').attr('class', 'title');
});

getData(url2).then((data2) => {
	const svg2 = d3.select('body').append('svg').attr('width', svgW).attr('height', svgH);
	svg2.append('text').attr('x', 30).attr('y', 60).text('Guglielmites').attr('class', 'title');
	drawChart(svg2, data2);
});

const drawChart = (svg: any, dataAll: any[]) => {
	console.log(dataAll.map((d) => [ d.values.neigen, d.values.ndegree ]));
	const data = dataAll; //.filter((d) => d.values.ndegree > 0.001 && d.values.neigen > 0.001);

	const y1 = pExtent[1][0];
	const y2 = pExtent[1][1];

	pars.forEach((par, pi) => {
		const x = parX(pi);

		//svg.append('rect').attr('x', x).attr('height', peH).attr('y', y1).attr('width', parW);

		//
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
	});

	/*
    calculating positions
		*/
	data.map((record: any, ri: number) => {
		record.posM = Object.keys(record.values).map((key, vi) => {
			const value = record.values[key];
			const par = pars.find((par) => par.attr === key);
			par.scale = d3.scaleLinear().range([ y2, y1 ]).domain(par.reverse ? [ 1, 0 ] : [ 0, 1 ]);
			return par.scale(value);
		});
	});

	/*
    drawing lines
  */
	data.filter((d) => d.sex === 'm').forEach((record: any, ri: number) => {
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
	data.filter((d) => d.sex === 'f').forEach((record: any, ri: number) => {
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
