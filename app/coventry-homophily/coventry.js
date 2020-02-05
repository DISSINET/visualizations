import * as d3 from 'd3';
import { getSSData } from '../spreadsheet';
import urls from './../urls';

require('./style.scss');
console.log('coventry start');

getSSData(urls.coventry.edges).then((links) => {
	getSSData(urls.coventry.nodes).then((nodesRaw) => {
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
		const height = 500;
		const width = 2000;
		const svg = d3
			.select('body')
			.append('svg')
			.attr('class', 'svg-wrapper')
			.attr('width', width)
			.attr('height', height);

		const nodesG = svg.append('g');
		const edgesG = svg.append('g');

		const y1 = 100;
		const y2 = height - 200;
		const x = (i) => 10 + (width - 20) / nodes.length * i;

		const radius = (val) => 2 + Math.pow(val, 0.6);
		nodes.forEach((node, ni) => {
			node.edges.forEach((edge) => {
				const target = nodes.find((n) => n.idold === edge.target);

				if (target) {
					edgesG
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

			const appendCircle = (y, place) => {
				const cy = y - (place === 'top' ? 1 : -1) * radius(node.degree) / 2;
				nodesG
					.append('line')
					.attr('class', 'axis')
					.attr('x1', x(ni))
					.attr('x2', x(ni))
					.attr('y1', place === 'top' ? y1 : y2)
					.attr('y2', cy);
				nodesG
					.append('circle')
					.attr('cy', cy)
					.attr('cx', x(ni))
					.attr('r', radius(node.degree))
					.attr('class', classes);
			};
			const yT = y1 - (ni % 2 ? 40 : 10);
			const yB = y2 + (ni % 2 ? 40 : 10);

			appendCircle(yT, 'top');
			appendCircle(yB, 'bottom');
		});

		const homoM = nodes.filter((n) => n.homo === 1).length;
		const homoF = nodes.filter((n) => n.homo === -1).length;

		const mixedM = nodes.filter((n) => n.homo > 0 && n.homo < 1).length;
		const mixedF = nodes.filter((n) => n.homo > -1 && n.homo < 0).length;

		const hetero = nodes.filter((n) => n.homo === 0).length;

		console.log(homoM, homoF, mixedM, mixedF, hetero);

		const axisY = height - 140;
		const axisG = svg.append('g');
		axisG
			.append('line')
			.attr('class', 'axis')
			.attr('x1', 10)
			.attr('x2', x(nodes.length))
			.attr('y1', y1)
			.attr('y2', y1);
		axisG
			.append('line')
			.attr('class', 'axis')
			.attr('x1', 10)
			.attr('x2', x(nodes.length))
			.attr('y1', y2)
			.attr('y2', y2);

		axisG
			.append('line')
			.attr('class', 'axis-legend')
			.attr('x1', 10)
			.attr('x2', x(homoM))
			.attr('y1', axisY)
			.attr('y2', axisY);

		axisG
			.append('text')
			.attr('class', 'axis-label')
			.attr('x', 10)
			.attr('y', axisY + 30)
			.attr('text-anchor', 'start')
			.text('homophilic men');

		axisG
			.append('line')
			.attr('class', 'axis-legend')
			.attr('x1', x(homoM + mixedM))
			.attr('x2', x(homoM + mixedM + hetero))
			.attr('y1', axisY)
			.attr('y2', axisY);

		axisG
			.append('text')
			.attr('class', 'axis-label')
			.attr('x', (x(homoM + mixedM) + x(homoM + mixedM + hetero)) / 2)
			.attr('y', axisY + 30)
			.text('heterophilic women and men')
			.attr('text-anchor', 'middle');

		axisG
			.append('line')
			.attr('class', 'axis-legend')
			.attr('x1', x(homoM + mixedM + hetero + mixedF))
			.attr('x2', x(homoM + mixedM + hetero + mixedF + homoF))
			.attr('y1', axisY)
			.attr('y2', axisY);
		axisG
			.append('text')
			.attr('class', 'axis-label')
			.attr('x', x(homoM + mixedM + hetero + mixedF + homoF))
			.attr('y', axisY + 30)
			.attr('text-anchor', 'end')
			.text('homophilic women');

		axisG
			.append('rect')
			.attr('class', 'gender-area gender-area-males')
			.attr('x', 10)
			.attr('y', y1)
			.attr('width', x(nodes.filter((n) => n.sex === 'm').length) - 10)
			.attr('height', y2 - y1);
		axisG
			.append('rect')
			.attr('class', 'gender-area gender-area-females')
			.attr('x', x(nodes.filter((n) => n.sex === 'm').length))
			.attr('y', y1)
			.attr('width', x(nodes.length) - 20)
			.attr('height', y2 - y1);
	});
});
