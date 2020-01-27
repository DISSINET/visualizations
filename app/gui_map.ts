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
	return await d3.tsv(require('./data/gui/places.tsv'));
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
			const personWithPlace = persons.filter((person) => {
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

				const place = places.find((place) => place.name === personPlace);
				if (place) {
					person.place = {
						name: place.name,
						x: parseFloat(place.x_coordinates),
						y: parseFloat(place.y_coordinates)
					};
				}

				return place;
			});

			console.log(personWithPlace);
		});
	});
});
