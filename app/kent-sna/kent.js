import * as d3 from 'd3';
import { getSSData } from '../spreadsheet';
import urls from '../urls';

require('./style.scss');
console.log('kent start', urls);

getSSData(urls.kent.edges).then((linksAll) => {
	getSSData(urls.kent.nodes).then((nodesAll) => {
		console.log('links', linksAll);
		console.log('nodes', nodesAll);

		/*
			color schemas
    */
		const typeColors = {
			reading: '#4daf4a',
			'accommodation and reading': '#377eb8',
			'instruction in heretical beliefs': '#e41a1c',
			'other ties': 'white'
		};
		const familyColors = [ '#8dd3c7', '#ffffb3', '#bc80bd', '#fdb462', '#b3de69', 'dimgrey' ];

		/*
			setting data into sna form
		*/
		const nodes = nodesAll.filter((n) => n.degree !== '0').map((node) => {
			return { ...node, id: parseInt(node.idold) };
		});

		const links = linksAll
			.map((link) => {
				// merge public readings to readings
				link.type = link.classificationlevel1;
				if (link.type === 'public reading') {
					link.type = 'reading';
				}
				const source = nodes.find((n) => n.id == link.source);
				const target = nodes.find((n) => n.id == link.target);

				if (source && target) {
					const ids = [ nodes.indexOf(source), nodes.indexOf(target) ].sort((a, b) => (a < b ? -1 : 1));
					return { ...link, source: ids[0], target: ids[1] };
				} else return false;
			})
			.filter((l) => l);

		// list of all link types
		const linkTypes = links.map((l) => l.type).filter((v, i, a) => a.indexOf(v) === i);

		// list of families
		const familyNames = nodes.map((n) => n.familyname).filter((v, i, a) => a.indexOf(v) === i);
		const familyNamesFreqs = {};
		familyNames.forEach((fname) => {
			familyNamesFreqs[fname] = nodes.filter((n) => n.familyname === fname).length;
		});

		// families with 2 and less occurences will fall into "others" group
		const familyNamesGroups = [];
		Object.keys(familyNamesFreqs).forEach((familyName) => {
			if (familyNamesFreqs[familyName] > 2) {
				familyNamesGroups.push(familyName);
			}
		});

		// creating list of links for SNA
		const linksSna = [];
		links.forEach((link) => {
			const gLink = linksSna.find((gLink) => gLink.source === link.source && gLink.target === link.target);
			if (gLink) {
				gLink.edges.push(link);
			} else {
				linksSna.push({ source: link.source, target: link.target, edges: [ link ] });
			}
		});

		console.log('links sna', linksSna);
		console.log('link types', linkTypes);
		console.log('family names', familyNamesGroups);

		/*
			drawing
		*/
		const height = 450;
		const width = 2000;
		const svg = d3
			.select('body')
			.append('svg')
			.attr('class', 'svg-wrapper')
			.attr('width', width)
			.attr('height', height);

		// simulation
		d3
			.forceSimulation(nodes)
			.alphaDecay(0.02)
			.force(
				'link',
				d3
					.forceLink(linksSna)
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

			.force('charge', d3.forceCollide().radius(50).strength(0.85))
			.force('center', d3.forceCenter(350, height / 2))
			//.force('x', d3.forceX(width / 2))
			//.force('y', d3.forceY(height / 2).strength(1))
			.on('tick', () => {
				nodes.forEach((node) => {
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
			.data(linksSna.filter((l) => l.edges.find((e) => typesToDisplay.includes(e.type))))
			.enter()
			.append('line')
			.attr('class', 'edge-halo')
			.attr('stroke-width', (d) => d.edges.length + 5)
			.attr('stroke', (d) => {
				const types = d.edges.map((e) => e.type);
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
			.data(linksSna)
			.enter()
			.append('line')
			.attr('class', (d) => 'edge')
			.attr('stroke-width', (d) => d.edges.length);

		const nodeRadius = (val) => 12 + Math.pow(val, 0.7);

		const nodesGs = svg
			.append('g')
			.selectAll('circle')
			.data(nodes)
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
			.attr('r', (d) => nodeRadius(d.degree));

		const labelsGs = svg
			.append('g')
			.selectAll('text')
			.data(nodes)
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

		nodes.forEach((node, ni) => {
			const firstCol = ni < nodes.length / 2;
			const y = 10 + legendYStart + height / (nodes.length / 2 + 3) * (firstCol ? ni : ni - nodes.length / 2);

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
