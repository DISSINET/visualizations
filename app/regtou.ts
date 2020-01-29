import * as d3 from 'd3';
import * as d3tile from 'd3-tile';

async function loadPlaces() {
	return await d3.csv(require('./data/regtou/places.csv'));
}
async function loadNames() {
	return await d3.csv(require('./data/regtou/names.csv'));
}
async function loadEdges() {
	return await d3.csv(require('./data/regtou/edges.csv'));
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
			const placeGroups: any = [];
			personWithPlace.forEach((person: any) => {
				// only known locations
				if (person.place.x && person.place.y) {
					if (person.place.name in placeGroups) {
						placeGroups[person.place.name].persons.push(person);
					} else {
						placeGroups[person.place.name] = {
							x: parseFloat(person.place.x),
							y: parseFloat(person.place.y),
							persons: [ person ]
						};
					}
				}
			});

			/* 
				summing edges for groups
			*/
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

			console.log(occupancyGroups);

			const occupancyColors = [
				'#8dd3c7',
				'#ffffb3',
				'#bebada',
				'#fb8072',
				'#80b1d3',
				'#fdb462',
				'#b3de69',
				'#fccde5',
				'#d9d9d9',
				'#bc80bd',
				'#ccebc5',
				'#ffed6f'
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
			const width = 2500;
			const height = 1000;

			const tileSize = 256;
			var projection = d3.geoMercator().scale(100000).center([ 1.65, 43.65 ]);

			const svg = d3.select('body').append('svg').attr('width', width).attr('height', height);
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
				svg
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
					.style('opacity', 0.7)
					.style('mix-blend-mode', 'normal');
			});

			const gEdges = svg.append('g').attr('class', 'edges');
			const gCircles = svg.append('g').attr('class', 'circles');
			const gLabels = svg.append('g').attr('class', 'labels');

			const groupsBySize = Object.keys(placeGroups)
				.map((groupKey) => {
					placeGroups[groupKey].name = groupKey;
					return placeGroups[groupKey];
				})
				.sort((a, b) => (a.persons.length > b.persons.length ? 1 : -1));

			// labels settings
			const leftLabels = [ 'Montesquieu', 'Roumens' ];
			const topLabels = [ 'Lavaur', 'Gascogne', 'Saint-Paul-Cap-de-Joux', 'Roumens', 'Lanta' ];
			const avoidLabels = [ 'Durfort', 'Pech-Luna', 'Blan' ];

			groupsBySize.forEach((group) => {
				const [ x, y ] = projection([ group.x, group.y ]);

				const liner = d3.line().curve(d3.curveBasis).x((d) => d[0]).y((d) => d[1]);

				console.log(group.persons.map((p) => p.Occupation_type));

				if (x > 0 && x < width && y > 0 && y < height) {
					const circleSize = 10 + group.persons.length * 2;
					gCircles
						.append('circle')
						.style('fill', 'black')
						.style('opacity', 1)
						.attr('r', circleSize)
						.attr('stroke-width', 4)
						.attr('stroke', 'white')
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
											const dy = y - y;
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

			const gChord = svg.append('g').attr('class', 'chord').attr('transform', 'translate(2100,320)');

			const outerRadius = 300;
			const innerRadius = 270;
			gChord
				.append('rect')
				.attr('height', height)
				.attr('width', 800)
				.attr('fill', 'white')
				.attr('opacity', '0.7')
				.attr('x', -outerRadius - 100)
				.attr('y', -outerRadius - 20);

			const ribbon = d3.ribbon().radius(innerRadius);
			const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

			const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);

			const chords = chord(chordsData);
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
				.attr('fill-opacity', 1)
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
				.attr('fill-opacity', 1)
				.style('mix-blend-mode', 'multiply');

			/*
			group
				.append('text')
				.each((d) => {
					d.angle = (d.startAngle + d.endAngle) / 2;
				})
				.attr('dy', '.35em')
				.attr('font-size', 30)
				.attr(
					'transform',
					(d) => `
        rotate(${d.angle * 180 / Math.PI - 90})
        translate(${innerRadius + 26})
        ${d.angle > Math.PI ? 'rotate(180)' : ''}
      `
				)
				.attr('text-anchor', (d) => (d.angle > Math.PI ? 'end' : null))
				.attr('color', 'black')
				.attr('font-weight', 1000)
				.attr('stroke-width', 1)
				.attr('stroke', 'white')
				.attr('font-family', 'ubuntu')
				.text((d) => {
					const name = occNames[d.index];
					if (name.indexOf('manufacturer') > -1) {
						return 'manufacturer';
					} else {
						return name;
					}
				});
				*/

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

			occNames.forEach((name, ni) => {
				const y = outerRadius + 50 + Math.floor(ni / 2) * 50;
				const x = (ni - 1) % 2 ? -350 : 0;

				gChord
					.append('rect')
					.attr('x', x)
					.attr('y', y)
					.attr('width', 70)
					.attr('height', 40)
					.attr('fill', occupancyColors[ni])
					.attr('stroke', 'black')
					.attr('stroke-width', 3);

				gChord
					.append('text')
					.text(name.split(' ')[0])
					.attr('x', x + 80)
					.attr('y', y + 28)
					.attr('font-size', 30)
					.attr('font-family', 'ubuntu')
					.attr('stroke', 'black')
					.attr('font-weight', 1000)
					.attr('stroke-width', 2)
					.attr('stroke', 'white');
			});

			/*
				matrix chart
			*/

			/*
			// sort people
			console.log(placeGroups);
			persons.sort((a, b) => (b.edges.length > a.edges.length ? 1 : -1));
			// threshold
			const topNo = 100;
			const topPersons = persons.slice(0, topNo);
			const matrixW = 800;
			const matrixH = 800;
			const gMatrix = svg.append('g').attr('class', 'matrix').attr('transform', 'translate(0,0)');

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
