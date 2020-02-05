import * as d3 from 'd3';
import { getSSData } from '../spreadsheet';
import urls from './../urls';

require('./style.scss');

console.log('coventry start');

getSSData(urls.coventry.edges).then((links) => {
	getSSData(urls.coventry.nodes).then((nodes) => {
		console.log('links', links);
		console.log('nodes', nodes);

		/*
      setting data into sna form
    */

		const linkTypes = links.map((l) => l.classificationlevel1).filter((v, i, a) => a.indexOf(v) === i);
		console.log(linkTypes);

		const gNodes = nodes.filter((n) => n.degree !== '0').map((node) => {
			return { ...node, id: parseInt(node.idold) };
		});

		const gLinks = links
			.map((link) => {
				const source = gNodes.find((n) => n.id == link.source);
				const target = gNodes.find((n) => n.id == link.target);
				if (source && target) {
					return { ...link, source: gNodes.indexOf(source), target: gNodes.indexOf(target) };
				} else return false;
			})
			.filter((l) => l);

		console.log(gNodes.map((n) => n.sex));
		console.log(gLinks);

		// drawing
		const height = 800;
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
			//.force('charge', d3.forceManyBody().strength(-2000).distanceMin(200).distanceMax(200))
			.force('link', d3.forceLink(gLinks))
			//.force('many', d3.forceManyBody().strength(30).distanceMax(100).distanceMin(50))
			.force('charge', d3.forceCollide().radius(25))
			.force('r', d3.forceRadial(height / 2 - 80, width / 2, height / 2).strength(100))
			//.force('center', d3.forceCenter(width / 2, height / 2))
			.on('tick', () => {
				gNodes.forEach((node) => {
					if (node.sex === 'f') {
						if (node.x > width / 2) {
							node.x = width / 2 - 300;
							node.y = height / 2;
						}
					}
					if (node.sex === 'm') {
						if (node.x < width / 2 + 20) {
							node.x = width / 2 + 300;
							node.y = height / 2;
						}
					}
					if (node.y - 50 < 0 || node.y + 50 > height) {
						node.y = height / 2;
					} else if (node.x - 50 < 0 || node.x + 50 > width) {
						node.x = width / 2;
					}
				});
				nodesGs.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
				edgesGs
					.attr('x1', (d) => d.source.x)
					.attr('x2', (d) => d.target.x)
					.attr('y1', (d) => d.source.y)
					.attr('y2', (d) => d.target.y);
			})
			.on('end', function() {
				console.log('simulation done');
				gNodes.forEach((node) => {
					if (node.sex === 'f') {
						node.x -= 200;
					}
					if (node.sex === 'm') {
						node.x += 200;
					}
				});
				nodesGs.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
				edgesGs
					.attr('x1', (d) => d.source.x)
					.attr('x2', (d) => d.target.x)
					.attr('y1', (d) => d.source.y)
					.attr('y2', (d) => d.target.y);
			});

		/*
			.tick(300);
			.force('x', d3.forceX())
			.force('collide', d3.forceCollide(3))
			.force('y', d3.forceY())
      */

		/*
				});
				nodesGs.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
				edgesGs.attr('d', (d) => {
					const x = d.source.x;
					const y = d.source.y;
					const ex = d.target.x;
					const ey = d.target.y;
					const dx = x - ex;
					const dy = y - ey;
					const dr = Math.sqrt(dx * dx + dy * dy);
					return 'M' + x + ',' + y + 'A' + dr + ',' + dr + ' 0 0,1 ' + ex + ',' + ey;
				});

      });
      */

		/*
		const edgesGs = svg
			.append('g')
			.selectAll('line')
			.data(gLinks)
			.enter()
			.append('path')
			.attr('class', (d) => 'edge')
			.attr('stroke', 'black')
			.attr('d', (d) => {
				console.log(d);
				const x = d.source.x;
				const y = d.source.y;
				const ex = d.target.x;
				const ey = d.target.y;
				const dx = x - ex;
				const dy = y - ey;
				const dr = Math.sqrt(dx * dx + dy * dy);
				return 'M' + x + ',' + y + 'A' + dr + ',' + dr + ' 0 0,1 ' + ex + ',' + ey;
      });
      */
		const edgesGs = svg
			.append('g')
			.selectAll('line')
			.data(gLinks)
			.enter()
			.append('line')
			.attr('class', (d) => {
				const classes = [ 'edge' ];
				const sSex = d.source.sex;
				const tSex = d.target.sex;
				if (sSex === tSex) {
					if (sSex === 'm') {
						classes.push('edge-male');
					} else {
						classes.push('edge-female');
					}
				} else {
					classes.push('edge-hetero');
				}
				return classes.join(' ');
			})
			.attr('x1', (d) => d.source.x)
			.attr('x2', (d) => d.target.x)
			.attr('y1', (d) => d.source.y)
			.attr('y2', (d) => d.target.y);

		const radius = (val) => 5 + Math.pow(val, 0.7);

		const nodesGs = svg
			.append('g')
			.selectAll('circle')
			.data(gNodes)
			.enter()
			.append('circle')
			.attr('class', (d) => {
				const classes = [ 'node' ];
				d.sex === 'f' ? classes.push('node-female') : classes.push('node-male');
				d.deponent === '1' ? classes.push('node-deponent') : false;
				return classes.join(' ');
			})
			.attr('data-label', (d) => d.name)
			.attr('r', (d) => radius(d.degree));
	});
});
