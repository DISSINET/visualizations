import * as d3 from 'd3';
import * as d3tile from 'd3-tile';

async function loadNames() {
	return await d3.tsv(require('./data/gui/names.tsv'));
}
async function loadPlaces() {
	return await d3.tsv(require('./data/gui/places.tsv'));
}
async function loadEdges() {
	return await d3.tsv(require('./data/gui/edges.tsv'));
}

loadNames().then((persons) => {
	loadPlaces().then((places) => {
		loadEdges().then((edges) => {
			console.log('persons', persons);
			console.log('places', places);
			console.log('edges', edges);

			/*
			 geocode persons
			*/
			const personWithPlace = persons.filter((p) => p.dissident_minister === 'no').filter((person: any) => {
				// assigning place name to person
				const both = person.origin_or_residence;
				const origin = person.origin;
				const residence = person.residence;

				let personPlace = '';
				if (both) {
					if (both.includes(',')) {
						personPlace = both.split(',')[0];
					} else {
						personPlace = both;
					}
				} else if (residence) {
					personPlace = residence;
				} else if (origin) {
					personPlace = origin;
				}

				const place = places.find((place: any) => place.name === personPlace);
				if (place) {
					person.place = {
						name: place.name,
						x: parseFloat(place.x_coordinates),
						y: parseFloat(place.y_coordinates)
					};
				}

				return place;
			});

			/*
				getting edges for persons with place
			*/
			personWithPlace.forEach((person: any) => {
				person.edges = [];

				edges.forEach((edge) => {
					const sourceEdge = edge.Source == person.id_old;
					const targetEdge = edge.Target == person.id_old;

					if (sourceEdge || targetEdge) {
						const targetId = sourceEdge ? edge.Target : edge.Source;
						const targetPerson = personWithPlace.find((p) => p.id_old == targetId);

						if (targetPerson) {
							person.edges.push({
								to: targetPerson,
								type: sourceEdge ? 'source' : 'target'
							});
						}
					}
				});
			});

			/*
				group persons based on their locality
			*/
			const groups: any = [];
			personWithPlace.forEach((person: any) => {
				// only known locations
				if (person.place.x && person.place.y) {
					if (person.place.name in groups) {
						groups[person.place.name].persons.push(person);
					} else {
						groups[person.place.name] = {
							x: parseFloat(person.place.x),
							y: parseFloat(person.place.y),
							persons: [ person ]
						};
					}
				}
			});

			console.log(personWithPlace);

			/* 
				summing edges for groups
			*/
			Object.keys(groups).forEach((groupKey) => {
				const group = groups[groupKey];
				group.edges = {};
				group.persons.forEach((person) => {
					person.edges.forEach((personEdge) => {
						if (personEdge.type === 'source') {
							const targetPlace = personEdge.to.place.name;
							if (targetPlace in group.edges) {
								group.edges[targetPlace].push(person.id);
							} else {
								group.edges[targetPlace] = [ person.id ];
							}
						}
					});
				});
			});
			console.log(groups);

			/* 
				chart
			*/
			const width = 1500;
			const height = 800;

			const tileSize = 256;
			var projection = d3.geoMercator().scale(20000).center([ 1.18, 43.8 ]);

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
					.attr('width', k)
					.attr('height', k)
					.style('opacity', 0.8);
			});
			console.log(d3tile);
			Object.keys(groups).forEach((groupName) => {
				const group = groups[groupName];
				const [ x, y ] = projection([ group.x, group.y ]);

				const liner = d3.line().curve(d3.curveBasis).x((d) => d[0]).y((d) => d[1]);

				if (x > 0 && x < width && y > 0 && y < height) {
					svg
						.append('circle')
						.style('fill', 'orange')
						.style('mix-blend-mode', 'multiply')
						.style('opacity', 0.7)
						.attr('r', 3 + group.persons.length * 2)
						.attr('stroke-width', 2)
						.attr('stroke', 'black')
						.attr('cx', x)
						.attr('cy', y);

					Object.keys(group.edges).forEach((edgeKey) => {
						const edge = group.edges[edgeKey];
						const targetX = groups[edgeKey].x;
						const targetY = groups[edgeKey].y;
						if (targetX !== group.x) {
							const [ ex, ey ] = projection([ targetX, targetY ]);
							if (ex > 0 && ex < width && ey > 0 && ey < height) {
								const d = liner([ [ x, y ], [ ex, ey + 20 ] ]);

								const edgeW = edge.length - 0.5;
								if (edgeW) {
									console.log(edgeW);
									svg
										.append('path')
										.attr('stroke-width', edgeW)
										.attr('fill', 'none')
										.attr('stroke', 'black')
										.attr('d', function(d) {
											const dx = x - ex;
											const dy = y - y;
											const dr = Math.sqrt(dx * dx + dy * dy);
											return 'M' + x + ',' + y + 'A' + dr + ',' + dr + ' 0 0,1 ' + ex + ',' + ey;
										});
								}
							}
						}
					});
				}
			});
		});
	});
});
