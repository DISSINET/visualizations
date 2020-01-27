import * as d3 from 'd3';
require('d3-geo');

console.log(d3);

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
			const personWithPlace = persons.filter((person: any) => {
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

			/* 
				summing edges for groups
			*/
			Object.keys(groups).forEach((groupKey) => {
				const group = groups[groupKey];
				group.edges = {};
				group.persons.forEach((person) => {
					person.edges.forEach((personEdge) => {
						const targetPlace = personEdge.to.place.name;
						if (targetPlace in group.edges) {
							group.edges[targetPlace].push(person.id);
						} else {
							group.edges[targetPlace] = [ person.id ];
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

			var projection = d3.geoMercator().scale(12000).center([ 0, 44 ]);

			const svg = d3.select('body').append('svg').attr('width', width).attr('height', height);
			var path = d3.geoPath().projection(projection);

			Object.keys(groups).forEach((groupName) => {
				const group = groups[groupName];
				const xy = projection([ group.x, group.y ]);
				svg
					.append('circle')
					.style('fill', 'steelblue')
					.style('opacity', 0.4)
					.attr('r', 3 + group.persons.length * 3)
					.attr('cx', xy[0])
					.attr('cy', xy[1]);
			});
		});
	});
});
