import * as d3 from 'd3';
import * as d3force from 'd3-force';
var style = require('./style.scss');

import { getSSData } from '../spreadsheet';

console.log('kent start');

// edges
// docs.google.com/spreadsheets/d/1oU4fwqaUgSnbv9NTjAQbSIooF9J5axzt5MfYCPWEhWE/edit#gid=1338507045
const tableEdgesId = '1AxApzeVYdh5xEyrYCIMC3ARUbpXIRq2I5mDmNmVzsYY/1';

// nodes
// docs.google.com/spreadsheets/d/1rIcda6bQeEallBHNzjQvvaedReqtW5DWxoUw30dCecQ/edit#gid=1016955786
const tableNodesId = '1oU4fwqaUgSnbv9NTjAQbSIooF9J5axzt5MfYCPWEhWE/2';

getSSData(tableEdgesId).then((links) => {
	getSSData(tableNodesId).then((nodes) => {
		console.log('links', links);
		console.log('nodes', nodes);

		/*
      setting data into sna form
    */

		const typeColors = {
			reading: '#4daf4a',
			'accommodation and reading': '#377eb8',
			'instruction in heretical beliefs': '#e41a1c',
			'other ties': 'white'
		};
		const familyColors = [ '#8dd3c7', '#ffffb3', '#bc80bd', '#fdb462', '#b3de69', 'dimgrey' ];

		const gNodes = nodes.filter((n) => n.degree !== '0').map((node) => {
			return { ...node, id: parseInt(node.idold) };
		});

		const linksFiltered = links
			.map((link) => {
				// merge public readings to readings
				if (link.classificationlevel1 === 'public reading') {
					link.classificationlevel1 = 'reading';
				}
				const source = gNodes.find((n) => n.id == link.source);
				const target = gNodes.find((n) => n.id == link.target);
				if (source && target) {
					const ids = [ gNodes.indexOf(source), gNodes.indexOf(target) ].sort((a, b) => (a < b ? -1 : 1));
					return { ...link, source: ids[0], target: ids[1] };
				} else return false;
			})
			.filter((l) => l);
		//	.filter((l) => l.classificationlevel1 !== 'kinship');

		const linkTypes = linksFiltered.map((l) => l.classificationlevel1).filter((v, i, a) => a.indexOf(v) === i);

		const familyNames = gNodes.map((n) => n.familyname).filter((v, i, a) => a.indexOf(v) === i);
		const familyNamesFreqs = {};
		familyNames.forEach((fname) => {
			familyNamesFreqs[fname] = gNodes.filter((n) => n.familyname === fname).length;
		});

		const familyNamesGroups = [];
		Object.keys(familyNamesFreqs).forEach((familyName) => {
			if (familyNamesFreqs[familyName] > 2) {
				familyNamesGroups.push(familyName);
			}
		});

		const gLinks = [];

		linksFiltered.forEach((link) => {
			const gLink = gLinks.find((gLink) => gLink.source === link.source && gLink.target === link.target);
			if (gLink) {
				gLink.edges.push(link);
			} else {
				gLinks.push({ source: link.source, target: link.target, edges: [ link ] });
			}
		});

		console.log(gLinks);
		//.filter((l) => l.classificationlevel1 !== 'marriage');

		console.log(linkTypes);
		console.log(familyNamesGroups);

		// drawing
		const height = 450;
		const width = 2000;
		const svg = d3
			.select('body')
			.append('svg')
			.attr('class', 'svg-wrapper')
			.attr('width', width)
			.attr('height', height);

		const simulation = d3force
			.forceSimulation(gNodes)
			.alphaDecay(0.05)
			.force(
				'link',
				d3
					.forceLink(gLinks)
					.strength((link) => link.edges.length / 4)
					.distance((link) => {
						if (link.source.familyname === link.target.familyName) {
							return 20;
						} else {
							return 1 / link.edges.length * 20;
						}
					})
					.iterations(200)
			)
			//.force('many', d3.forceManyBody().strength(10).distanceMax(10).distanceMin(5))

			.force('charge', d3.forceCollide().radius(50).strength(0.8))
			.force('center', d3.forceCenter(350, height / 2))
			//.force('x', d3.forceX(width / 2))
			//.force('y', d3.forceY(height / 2).strength(1))
			.on('tick', () => {
				gNodes.forEach((node) => {
					if (node.y < 20) {
						node.y = 20;
					}
					if (node.y > height - 20) {
						node.y = height - 20;
					}
					if (node.x > 700) {
						node.x = 700;
					}
					if (node.x < 20) {
						node.x = 20;
					}
				});
				nodesGs.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
				labelsGs.attr('x', (d) => d.x).attr('y', (d) => d.y);
				edgesGs
					.attr('x1', (d) => d.source.x)
					.attr('x2', (d) => d.target.x)
					.attr('y1', (d) => d.source.y)
					.attr('y2', (d) => d.target.y);
				edgesGsHalo
					.attr('x1', (d) => d.source.x)
					.attr('x2', (d) => d.target.x)
					.attr('y1', (d) => d.source.y)
					.attr('y2', (d) => d.target.y);
			});

		const typesToDisplay = [ 'instruction in heretical beliefs', 'accommodation', 'reading' ];

		const edgesGsHalo = svg
			.append('g')
			.selectAll('line')
			.data(gLinks.filter((l) => l.edges.find((e) => typesToDisplay.includes(e.classificationlevel1))))
			.enter()
			.append('line')
			.attr('class', 'edge-halo')
			.attr('stroke-width', (d) => d.edges.length + 5)
			.attr('stroke', (d) => {
				const types = d.edges.map((e) => e.classificationlevel1);
				if (types.includes('accommodation') && types.includes('reading')) {
					return typeColors['accommodation and reading'];
				} else {
					let color = 'white';
					Object.keys(typeColors).find((key) => {
						if (types.includes(key)) {
							color = typeColors[key];
						}
					});
					return color;
				}
			});

		const edgesGs = svg
			.append('g')
			.selectAll('line')
			.data(gLinks)
			.enter()
			.append('line')
			.attr('class', (d) => 'edge')
			.attr('stroke-width', (d) => d.edges.length);

		const radius = (val) => 12 + Math.pow(val, 0.7);

		const nodesGs = svg
			.append('g')
			.selectAll('circle')
			.data(gNodes)
			.enter()
			.append('circle')
			.attr('fill', (d) => {
				const familyI = familyNamesGroups.indexOf(d.familyname);
				return familyI > -1 ? familyColors[familyI] : familyColors[5];
			})
			.attr('class', (d) => {
				const classes = [ 'node' ];
				d.sex === 'f' ? classes.push('node-female') : classes.push('node-male');
				d.deponent === '1' ? classes.push('node-deponent') : false;
				return classes.join(' ');
			})
			.attr('data-label', (d) => d.name)
			.attr('r', (d) => radius(d.degree));

		const labelsGs = svg
			.append('g')
			.selectAll('text')
			.data(gNodes)
			.enter()
			.append('text')
			.text((d, di) => di + 1)
			.attr('class', 'node-label')
			.attr('data-label', (d) => d.name);

		/*
			legend
		*/
		// labels legend
		const legendYStart = 50;
		const legendXStart = 700;
		const lNamesXs = [ legendXStart, legendXStart + 230 ];
		svg
			.append('text')
			.attr('x', lNamesXs[0] - 20)
			.attr('y', legendYStart - 20)
			.text('Names')
			.attr('class', 'legend-title');

		gNodes.forEach((node, ni) => {
			const firstCol = ni < gNodes.length / 2;
			const y = 10 + legendYStart + height / (gNodes.length / 2 + 3) * (firstCol ? ni : ni - gNodes.length / 2);

			const x = firstCol ? lNamesXs[0] : lNamesXs[1];
			const familyI = familyNamesGroups.indexOf(node.familyname);
			svg
				.append('circle')
				.attr('class', 'legend-name-circle')
				.attr('fill', familyI > -1 ? familyColors[familyI] : familyColors[5])
				.attr('cx', x - 10)
				.attr('cy', y - 2)
				.attr('r', 7);

			svg
				.append('text')
				.attr('class', 'legend-name-label')
				.text(ni + 1 + ' ' + node.label)
				.attr('x', x)
				.attr('y', y);
		});

		const ltypesX = legendXStart + 450;
		const lineH = 30;
		const rectW = 40;
		const rectH = lineH - 5;

		// edge type legend
		svg
			.append('text')
			.attr('x', ltypesX)
			.attr('y', legendYStart - 20)
			.text('Type of tie')
			.attr('class', 'legend-title');

		Object.keys(typeColors).forEach((type, ti) => {
			const y = legendYStart + lineH * ti;
			svg
				.append('line')
				.attr('x1', ltypesX)
				.attr('y1', y + rectW / 4)
				.attr('x2', ltypesX + rectW)
				.attr('y2', y + rectW / 4)
				.attr('stroke', typeColors[type])
				.attr('class', 'legend-type-line-hl');
			svg
				.append('line')
				.attr('x1', ltypesX)
				.attr('y1', y + rectW / 4)
				.attr('x2', ltypesX + rectW)
				.attr('y2', y + rectW / 4)
				.attr('class', 'legend-type-line-aux');

			svg
				.append('text')
				.attr('x', ltypesX + rectW + 5)
				.attr('y', y + rectH / 2)
				.text(type)
				.attr('class', 'legend-type-label');
		});

		// edge family legend
		const familyYStart = legendYStart + typesToDisplay.length * lineH + 100;

		svg.append('text').attr('x', ltypesX).attr('y', familyYStart - 20).text('Family').attr('class', 'legend-title');

		familyNamesGroups.forEach((family, ti) => {
			const y = familyYStart + lineH * ti;
			svg
				.append('circle')
				.attr('cx', ltypesX + rectW / 2)
				.attr('cy', y + rectH / 2)
				.attr('r', rectH / 2)
				.attr('fill', familyColors[ti])
				.attr('class', 'legend-family-circle');

			svg
				.append('text')
				.attr('x', ltypesX + rectW + 5)
				.attr('y', y + rectH / 2)
				.text(family)
				.attr('class', 'legend-family-label');
		});

		// others
		svg
			.append('circle')
			.attr('cx', ltypesX + rectW / 2)
			.attr('cy', familyYStart + familyNamesGroups.length * lineH + rectH / 2)
			.attr('r', rectH / 2)
			.attr('fill', 'grey')
			.attr('class', 'legend-family-circle');
		svg
			.append('text')
			.attr('x', ltypesX + rectW + 5)
			.attr('y', familyYStart + familyNamesGroups.length * lineH + rectH / 2)
			.text('other and unknown')
			.attr('class', 'legend-family-label');
	});
});
