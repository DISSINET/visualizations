import * as d3 from 'd3';
import * as d3tile from 'd3-tile';
import * as d3force from 'd3-force';
var style = require('./regtou.css');

const width = 2800;
const height = 1000;
const m = 20;

const snaW = 800;
const chordW = 600;
const legendW = 1000;
const chordH = 600;
const mapW = width - snaW - chordW;

const svgs = {
	map: { id: 'map', h: height, w: width, x: 0, y: 0 },
	chord: { id: 'chord', h: chordH, w: chordW, x: width - chordW - snaW - 2 * m, y: m },
	legend: {
		id: 'legend',
		h: height - chordH - 3 * m,
		w: legendW,
		x: width - snaW - legendW - 2 * m,
		y: chordH + 2 * m
	},
	sna: { id: 'sna', h: height - 2 * m, w: snaW, x: mapW + chordW - m, y: m }
};

Object.keys(svgs).forEach((svgKey) => {
	const svg = svgs[svgKey];
	svg.div = d3
		.select('body')
		.append('svg')
		.attr('id', svg.id)
		.attr('class', 'svg-wrapper')
		.attr('width', svg.w)
		.attr('height', svg.h)
		.style('position', 'absolute')
		.style('top', svg.y)
		.style('left', svg.x);
});

async function loadPlaces() {
	return await d3.csv(require('./data/regtou/places.csv'));
}
async function loadNames() {
	return await d3.csv(require('./data/regtou/names.csv'));
}
async function loadEdges() {
	return await d3.csv(require('./data/regtou/edges.csv'));
}

function sortByFrequency(array) {
	var frequency = {};

	array.forEach(function(value) {
		frequency[value] = 0;
	});

	var uniques = array.filter(function(value) {
		return ++frequency[value] == 1;
	});

	return uniques.sort(function(a, b) {
		return frequency[b] - frequency[a];
	});
}

loadNames().then((persons) => {
	loadPlaces().then((places) => {
		loadEdges().then((edges) => {
			console.log('persons', persons);
			console.log('edges', edges);
			console.log('places', places);

			/*
				getting edges for persons
			*/

			persons.forEach((p) => (p.edges = []));

			edges.forEach((edge) => {
				const targetPerson = persons.find((p) => p.ID === edge.Target);
				const sourcePerson = persons.find((p) => p.ID === edge.Source);

				if (targetPerson && sourcePerson) {
					sourcePerson.edges.push({
						to: targetPerson,
						type: 'source'
					});

					targetPerson.edges.push({
						to: sourcePerson,
						type: 'target'
					});
				}
			});

			/*
			 geocode persons
			*/
			const personWithPlace = persons.filter((person: any) => {
				// assigning place name to person
				const both = person.Origin_or_residence;
				const origin = person.Origin;
				const residence = person.Residence;

				let personPlace = '';
				if (both) {
					if (both.includes('/')) {
						personPlace = both.split('/')[0];
					} else {
						personPlace = both;
					}
				} else if (residence) {
					personPlace = residence;
				} else if (origin) {
					personPlace = origin;
				}

				if (personPlace.indexOf(' region') > -1) {
					personPlace = personPlace.split(' ')[0];
				}

				const place = places.find((place: any) => place.Place === personPlace);

				// logging places that are not geocoded
				if (!place && personPlace) {
					//console.log(personPlace);
				}

				if (place) {
					person.place = {
						name: place.Place,
						x: parseFloat(place.x_kontrola),
						y: parseFloat(place.y_kontrola)
					};
				}

				return place;
			});

			/*
			group persons based on their locality
			*/
			const placeGroups: any = {};
			personWithPlace.forEach((person: any) => {
				// only known locations
				const { name, x, y } = person.place;

				if (x && y) {
					const previouslyUsedPlace = Object.keys(placeGroups).find((placeName) => {
						const place = placeGroups[placeName];
						return (place.x === x && place.y === y) || placeName === name;
					});
					if (previouslyUsedPlace) {
						placeGroups[previouslyUsedPlace].persons.push(person);
					} else {
						placeGroups[name] = {
							x: x,
							y: y,
							persons: [ person ]
						};
					}
				}
			});

			/* 
				summing edges for groups
			*/
			console.log(placeGroups);
			Object.keys(placeGroups).forEach((groupKey) => {
				const group = placeGroups[groupKey];
				group.edges = {};
				group.persons.forEach((person) => {
					person.edges.filter((e) => e.to.place).forEach((personEdge) => {
						const targetPlace = personEdge.to.place.name;
						if (targetPlace in group.edges) {
							group.edges[targetPlace].push(personEdge.to.ID);
						} else {
							group.edges[targetPlace] = [ personEdge.to.ID ];
						}
					});
				});
			});

			/*
				occupancyGroups
			*/
			const occupancyGroups: any = {};

			const getOccupancies = (occ) => {
				if (occ.indexOf(', ') > -1) {
					return occ.split(', ');
				} else {
					return [ occ ];
				}
			};

			edges.forEach((edge) => {
				const targetP = persons.find((p) => p.ID === edge.Target);
				const sourceP = persons.find((p) => p.ID === edge.Source);

				const allowedNetworks = [ 'd', '' ];
				if (
					targetP &&
					sourceP &&
					allowedNetworks.includes(targetP.Network) &&
					allowedNetworks.includes(sourceP.Network)
				) {
					const targetOs = getOccupancies(targetP.Occupation_type);
					const sourceOs = getOccupancies(sourceP.Occupation_type);

					targetOs.forEach((targetO) => {
						sourceOs.forEach((sourceO) => {
							if (targetO && sourceO) {
								// creating new root object
								if (!(targetO in occupancyGroups)) {
									occupancyGroups[targetO] = { persons: [] };
								}
								if (!(sourceO in occupancyGroups)) {
									occupancyGroups[sourceO] = { persons: [] };
								}
								// creating new list
								if (!(sourceO in occupancyGroups[targetO])) {
									occupancyGroups[targetO][sourceO] = 0;
								}
								if (!(targetO in occupancyGroups[sourceO])) {
									occupancyGroups[sourceO][targetO] = 0;
								}

								// adding new person to the list
								occupancyGroups[targetO].persons.push(targetP.ID);
								occupancyGroups[sourceO].persons.push(sourceP.ID);
								occupancyGroups[targetO][sourceO]++;
								occupancyGroups[sourceO][targetO]++;
							}
						});
					});
				}
			});

			const occupancyColors = [
				'#8dd3c7',
				'#ffffb3',
				'#bebada',
				'#fb8072',
				'#80b1d3',
				'#fdb462',
				'#b3de69',
				'#fccde5',
				'lightblue',
				'#bc80bd',
				'#ccebc5',
				'#CCBE59'
			];
			const chordsData = [];
			Object.keys(occupancyGroups).forEach((oKey) => {
				const group = occupancyGroups[oKey];
				let total = 0;
				Object.keys(group).forEach((gKey) => {
					if (gKey !== 'persons') {
						total += group[gKey];
					}
				});
				group.total = total;
			});

			const occNames = Object.keys(occupancyGroups)
				.map((oName) => {
					occupancyGroups[oName].name = oName;
					return occupancyGroups[oName];
				})
				.sort((a, b) => (a.total < b.total ? 1 : -1))
				.map((o) => o.name);

			occNames.forEach((on1, oi1) => {
				if (!chordsData[oi1]) {
					chordsData[oi1] = [];
				}
				occNames.forEach((on2, oi2) => {
					const value = occupancyGroups[on1][on2] || 0;
					chordsData[oi1][oi2] = value;
				});
			});

			/* 
				drawing map
			*/

			const tileSize = 256;
			var projection = d3.geoMercator().scale(70000).center([ 1.7, 43.59 ]);

			const mapSvg = svgs['map'].div;
			const gTiles = mapSvg.append('g').attr('class', 'tiles');
			const gEdges = mapSvg.append('g').attr('class', 'edges');
			const gCircles = mapSvg.append('g').attr('class', 'circles');
			const gLabels = mapSvg.append('g').attr('class', 'labels');

			var path = d3.geoPath().projection(projection);

			const url = (x, y, z) => `https://stamen-tiles-a.a.ssl.fastly.net/terrain-background/${z}/${x}/${y}.png`;
			const tiler = d3tile
				.tile()
				.size([ width, height ])
				.scale(projection.scale() * 2 * Math.PI)
				.tileSize(tileSize)
				.translate(projection([ 0, 0 ]));

			const tiles = tiler();
			const [ tx, ty ] = tiles.translate;
			const k = tiles.scale;

			/* 
				setting tiles
			*/
			tiles.map(([ x, y, z ]) => {
				gTiles
					.append('image')
					.datum(function(d) {
						return d;
					})
					.attr('xlink:href', function(d) {
						return url(x, y, z);
					})
					.attr('x', (x + tx) * k)
					.attr('y', (y + ty) * k)
					.attr('width', k + 0.2)
					.attr('height', k + 0.2)
					.style('opacity', 1)
					.style('mix-blend-mode', 'normal');
			});

			const groupsBySize = Object.keys(placeGroups)
				.map((groupKey) => {
					placeGroups[groupKey].name = groupKey;
					return placeGroups[groupKey];
				})
				.sort((a, b) => (a.persons.length < b.persons.length ? 1 : -1));

			// labels settings
			const leftLabels = [
				'Lasbordes',
				'Montesquieu',
				'Saint-Paul-Cap-de-Joux',
				'Roumens',
				'Saint-Martin-Lalande'
			];
			const topLabels = [
				'Fanjeaux',
				'Lavaur',
				'Gascogne',
				'Saint-Paul-Cap-de-Joux',
				'Roumens',
				'Lanta',
				'Saint-Martin-Lalande'
			];
			const avoidLabels = [ 'Durfort', 'Pech-Luna', 'Blan', 'Palleville' ];

			groupsBySize.forEach((group) => {
				const [ x, y ] = projection([ group.x, group.y ]);

				const liner = d3.line().curve(d3.curveBasis).x((d) => d[0]).y((d) => d[1]);

				const cityOccs = group.persons.map((p) => p.Occupation_type);
				const freqs = sortByFrequency(cityOccs).filter((c) => c);
				const colorI = occNames.indexOf(freqs[0]);

				if (x > 0 && x < width && y > 0 && y < height) {
					const circleSize = 10 + group.persons.length * 2;
					gCircles
						.append('circle')
						.style('fill', colorI !== -1 ? occupancyColors[colorI] : 'grey')
						.style('opacity', 1)
						.attr('r', circleSize)
						.attr('stroke-width', 5)
						.attr('stroke', 'black')
						.attr('cx', x)
						.attr('cy', y);

					Object.keys(group.edges).forEach((edgeKey) => {
						const edge = group.edges[edgeKey];
						const target = placeGroups[edgeKey];
						if (target) {
							const targetX = target.x;
							const targetY = target.y;
							if (targetX !== group.x) {
								const [ ex, ey ] = projection([ targetX, targetY ]);
								//	if (ex > 0 && ex < width && ey > 0 && ey < height) {
								const d = liner([ [ x, y ], [ ex, ey + 20 ] ]);

								const edgeW = edge.length - 0.5;
								if (edgeW) {
									gEdges
										.append('path')
										.attr('stroke-width', edgeW)
										.attr('fill', 'none')
										.attr('stroke', 'black')
										.attr('stroke-linecap', 'round')
										.attr('d', function(d) {
											const dx = x - ex;
											const dy = y - ey;
											const dr = Math.sqrt(dx * dx + dy * dy);
											return 'M' + x + ',' + y + 'A' + dr + ',' + dr + ' 0 0,1 ' + ex + ',' + ey;
										});
								}
								//	}
							}
						}
					});

					let edgesSum = 0;
					Object.keys(group.edges).forEach((e) => {
						if (e !== group.name) {
							edgesSum = edgesSum + parseInt(group.edges[e].length);
						}
					});
					const label = group.name;
					if (avoidLabels.indexOf(label) === -1 && (group.persons.length > 5 || edgesSum > 5)) {
						const textSize = 35 + group.persons.length * 1.5;

						const left = leftLabels.includes(label);
						const top = topLabels.includes(label);
						gLabels
							.append('text')
							.style('font-size', textSize)
							.text(label)
							.attr('color', 'black')
							.attr('text-anchor', left ? 'end' : 'start')
							.attr('alignment-baseline', top ? 'middle' : 'middle')
							.attr('font-weight', 1000)
							.attr('stroke-width', textSize / 12)
							.attr('stroke', 'white')
							.attr('font-family', 'ubuntu')
							.attr('x', left ? x - textSize / 1.5 : x + textSize / 1.5)
							.attr('y', top ? y - textSize / 1.5 : y + textSize / 1.5);
					}
				}
			});

			/*
			chord chart
			*/

			const chordSvg = svgs['chord'];
			const chordSvgDiv = chordSvg.div;
			const gChord = chordSvgDiv
				.append('g')
				.attr('class', 'chord')
				.attr('transform', 'translate(' + chordSvg.w / 2 + ', ' + chordSvg.h / 2 + ')');

			const outerRadius = 265;
			const innerRadius = 220;

			const ribbon = d3.ribbon().radius(innerRadius);
			const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

			const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);

			const chords = chord(chordsData);

			gChord
				.append('circle')
				.attr('r', outerRadius + 35)
				.attr('fill', 'white')
				.attr('stroke-width', 3)
				.attr('opacity', 0.7);
			gChord
				.append('circle')
				.attr('r', outerRadius)
				.attr('stroke', 'black')
				.attr('fill', 'black')
				.attr('stroke-width', 3);

			const group = gChord.append('g').selectAll('g').data(chords.groups).join('g');

			gChord
				.append('g')
				.selectAll('path')
				.data(chords)
				.join('path')
				.attr('d', ribbon)
				.attr('fill', (d) => occupancyColors[d.target.index])
				.attr('fill-opacity', 1)
				.style('mix-blend-mode', 'normal');

			gChord
				.append('g')
				.selectAll('path')
				.data(chords)
				.join('path')
				.attr('d', ribbon)
				.attr('fill', (d) => occupancyColors[d.source.index])
				//.attr('fill', '#0000dc')
				.attr('fill-opacity', 0.5)
				.style('mix-blend-mode', 'multiply');

			group
				.append('path')
				.attr('fill', (d) => occupancyColors[d.index])
				.attr('d', arc)
				.attr('stroke', 'black')
				.attr('stroke-width', 4)
				.attr('fill-opacity', 1)
				.style('mix-blend-mode', 'normal');

			group
				.append('path')
				.attr('fill', (d) => occupancyColors[d.index])
				.attr('d', arc)
				.attr('stroke', 'black')
				.attr('stroke-width', 4)
				.attr('fill-opacity', 0.5)
				.style('mix-blend-mode', 'multiply');

			gChord
				.append('circle')
				.attr('r', innerRadius)
				.attr('stroke', 'black')
				.attr('fill', 'none')
				.attr('stroke-width', 4);

			gChord
				.append('circle')
				.attr('r', outerRadius)
				.attr('stroke', 'black')
				.attr('fill', 'none')
				.attr('stroke-width', 8);

			/*
				legend
			*/

			const legendSvg = svgs['legend'];
			const legendSvgDiv = legendSvg.div;

			const rowH = (legendSvg.h - 20) / (occNames.length / 2);
			const legendRectW = 60;

			// legend
			occNames.forEach((name, ni) => {
				const y = 15 + Math.floor(ni / 2) * rowH;
				const x = (ni - 1) % 2 ? legendSvg.w / 2 : legendSvg.w - m;

				legendSvgDiv
					.append('rect')
					.attr('x', x - legendRectW)
					.attr('y', y)
					.attr('width', legendRectW)
					.attr('height', rowH - 10)
					.attr('class', 'legend-rectangle')
					.attr('fill', occupancyColors[ni]);

				legendSvgDiv
					.append('text')
					.text(name.split(' ')[0].replace('-', ' '))
					.attr('x', x - legendRectW - 20)
					.attr('y', y + rowH / 2)
					.attr('class', 'legend-label');
			});

			/*
				sna chart
			*/
			const snaSvg = svgs['sna'];
			const snaSvgDiv = snaSvg.div;
			// sort people
			persons.sort((a, b) => (b.edges.length > a.edges.length ? 1 : -1));
			// threshold
			const topNo = 100;
			//const topPersons = persons.filter((p) => p.Occupation_type).slice(0, topNo);
			const topPersons = persons.slice(0, topNo);

			snaSvgDiv
				.append('rect')
				.attr('width', snaSvg.w)
				.attr('height', snaSvg.h)
				.attr('opacity', 0.7)
				.attr('fill', 'white');

			const nodes = [];
			const links = [];
			console.log(topPersons);

			topPersons.forEach((person) => {
				nodes.push({
					name: person.Label,
					id: parseInt(person.ID),
					occupationType: person.Occupation_type,
					weight: 1,
					x: 0,
					y: 0
				});
				person.edges.forEach((edge) => {
					const toNode = parseInt(edge.to.ID);
					if (topPersons.find((p) => parseInt(p.ID) === toNode)) {
						links.push({
							sourceID: parseInt(person.ID),
							targetID: parseInt(edge.to.ID)
						});
					}
				});
			});

			links.forEach((link) => {
				nodes.forEach((node, ni) => {
					if (node.id === link.sourceID) {
						link.source = ni;
					}
					if (node.id === link.targetID) {
						link.target = ni;
					}
				});
			});
			console.log(nodes);
			console.log(links);
			const simulation = d3force
				.forceSimulation(nodes)
				.force('link', d3.forceLink(links))
				.force('charge', d3.forceManyBody().strength(-400).distanceMin(15).distanceMax(500))
				.force('center', d3.forceCenter(snaSvg.w / 2, snaSvg.h / 2))
				.force('x', d3.forceX())
				.force('y', d3.forceY())
				.stop();

			d3.timeout(function() {
				for (
					var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
					i < n;
					++i
				) {
					simulation.tick();
				}

				snaSvgDiv
					.append('g')
					.selectAll('line')
					.data(links)
					.enter()
					.append('path')
					.attr(
						'class',
						(d) => (d.target.occupationType && d.source.occupationType ? 'edge edge-important' : 'edge')
					)
					.attr('d', function(d) {
						const x = d.source.x;
						const y = d.source.y;
						const ex = d.target.x;
						const ey = d.target.y;
						const dx = x - ex;
						const dy = y - ey;
						const dr = Math.sqrt(dx * dx + dy * dy);
						return 'M' + x + ',' + y + 'A' + dr + ',' + dr + ' 0 0,1 ' + ex + ',' + ey;
					});
				/*
					.attr('x1', function(d) {
						return d.source.x;
					})
					.attr('y1', function(d) {
						return d.source.y;
					})
					.attr('x2', function(d) {
						return d.target.x;
					})
					.attr('y2', function(d) {
						return d.target.y;
					});
					*/

				snaSvgDiv
					.append('g')
					.attr('stroke-width', 3)
					.selectAll('circle')
					.data(nodes)
					.enter()
					.append('circle')
					.attr('class', (d) => (d.occupationType ? 'node node-important' : 'node'))
					.attr('r', (d) => (d.occupationType ? 3 + topPersons[d.index].edges.length / 3 : 5))
					.attr('fill', (d) => {
						if (d.occupationType) {
							const i = occNames.indexOf(d.occupationType);
							return occupancyColors[i];
						} else {
							return 'grey';
						}
					})
					.attr('cx', function(d) {
						return d.x;
					})
					.attr('cy', function(d) {
						return d.y;
					});
			});
			/*
			const sexColors = {
				f: '#ca0020',
				n: 'grey',
				m: '#0571b0'
			};
			const margins = [ [ 20, 20 ], [ 20, 20 ] ];
			const cellW = (matrixW - margins[0][0] - margins[0][1]) / topNo;
			const cellH = (matrixH - margins[1][0] - margins[1][1]) / topNo;

			topPersons.forEach((person1, pi1) => {
				topPersons.forEach((person2, pi2) => {
					const interaction = !!person1.edges.find((e) => e.to.ID === person2.ID);

					const gender1 = person1.Sex;
					const gender2 = person2.Sex;

					let color = interaction ? sexColors['n'] : 'white';

					if (interaction) {
						if (gender1 === 'f' && gender2 === 'f') {
							color = sexColors['f'];
						}
						if (gender1 === 'm' && gender2 === 'm') {
							color = sexColors['m'];
						}
					}

					gMatrix
						.append('rect')
						.attr('width', cellW)
						.attr('height', cellH)
						.attr('x', margins[0][0] + cellW * pi1)
						.attr('y', margins[1][0] + cellH * pi2)
						.attr('fill', color);
				});
			});

			console.log(topPersons);
			*/
		});
	});
});
