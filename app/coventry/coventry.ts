import * as d3 from 'd3';
import * as d3force from 'd3-force';
var style = require('./style.scss');

import { getSSData } from './../spreadsheet';

console.log('coventry start');

// edges
// docs.google.com/spreadsheets/d/1oU4fwqaUgSnbv9NTjAQbSIooF9J5axzt5MfYCPWEhWE/edit#gid=1338507045
const tableEdgesId = '1ABeHDLXde59akcKwsToldnW04nJU9lpdmt6wPfstnqM/1';

// nodes
// docs.google.com/spreadsheets/d/1rIcda6bQeEallBHNzjQvvaedReqtW5DWxoUw30dCecQ/edit#gid=1016955786
const tableNodesId = '1FdWb1A7lwW2j1tf9Fswj6C7LxFrb4MXbY7KTHrIjqh8/1';

getSSData(tableEdgesId).then((links) => {
	getSSData(tableNodesId).then((nodesRaw) => {
		console.log('links', links);
		console.log('nodes', nodesRaw);

		/*
      setting data into sna form
    */

		links.forEach((link) => {
			const source = nodesRaw.find((n) => n.idold == link.source);
			const target = nodesRaw.find((n) => n.idold == link.target);
			if (source.sex === 'm' && target.sex === 'm') {
				link.type = 'male';
			} else if (source.sex === 'f' && target.sex === 'f') {
				link.type = 'female';
			} else {
				link.type = 'mixed';
			}
		});

		const nodes = nodesRaw.filter((n) => n.degree !== '0' && (n.sex === 'f' || n.sex === 'm')).map((node) => {
			node.edges = links
				.filter((link) => {
					if (link.source === node.idold || link.target === node.idold) {
						return true;
					}
				})
				.map((edge) => {
					return {
						target: edge.target === node.idold ? edge.source : edge.target,
						type: edge.type
					};
				});

			const edgeTypes = node.edges.map((e) => e.type);
			let homo = 0;
			edgeTypes.forEach((eType) => {
				if (eType === 'male') {
					homo++;
				} else if (eType === 'female') {
					homo--;
				}
			});
			homo = homo / edgeTypes.length;
			node.homo = homo;
			return node;
		});

		nodes.sort((a, b) => {
			if (a.sex === b.sex) {
				return a.homo > b.homo ? -1 : 1;
			}
			if (a.sex === 'm') {
				return -1;
			} else {
				return 1;
			}
		});

		nodes.forEach((n, ni) => (n.index = ni));

		// drawing
		const height = 800;
		const width = 2000;
		const svg = d3
			.select('body')
			.append('svg')
			.attr('class', 'svg-wrapper')
			.attr('width', width)
			.attr('height', height);

		const y1 = 200;
		const y2 = height - 200;
		const x = (i) => 10 + (width - 20) / nodes.length * i;

		const radius = (val) => 2 + Math.pow(val, 0.7);
		nodes.forEach((node, ni) => {
			node.edges.forEach((edge) => {
				const target = nodes.find((n) => n.idold === edge.target);

				if (target) {
					svg
						.append('line')
						.attr('y1', y1)
						.attr('x1', x(ni))
						.attr('y2', y2)
						.attr('x2', x(target.index))
						.attr('class', 'edge ' + edge.type);
				}
			});
		});
		nodes.forEach((node, ni) => {
			let cs = [ 'node' ];
			node.sex === 'f' ? cs.push('node-female') : cs.push('node-male');
			node.deponent === '1' ? cs.push('node-deponent') : false;
			const classes = cs.join(' ');

			const appendCircle = (y) => {
				svg
					.append('circle')
					.attr('cy', y)
					.attr('cx', x(ni))
					.attr('r', radius(node.degree))
					.attr('class', classes);
			};
			const yT = y1 - (ni % 2 ? 45 : 15);
			const yB = y2 + (ni % 2 ? 45 : 15);

			appendCircle(yT);
			appendCircle(yB);
		});
	});
});
