import * as d3 from 'd3';
import { inflate } from 'zlib';

console.log(d3.tsv);

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
								to: targetId,
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
			console.log(groups);
		});
	});
});
