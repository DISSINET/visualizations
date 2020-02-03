import * as d3 from 'd3';
var style = require('./style.scss');

import { getSSData } from './../spreadsheet';

console.log('coventry start');

// edges
// docs.google.com/spreadsheets/d/1oU4fwqaUgSnbv9NTjAQbSIooF9J5axzt5MfYCPWEhWE/edit#gid=1338507045
const tableEdgesId = '1ABeHDLXde59akcKwsToldnW04nJU9lpdmt6wPfstnqM/1';

// nodes
// docs.google.com/spreadsheets/d/1rIcda6bQeEallBHNzjQvvaedReqtW5DWxoUw30dCecQ/edit#gid=1016955786
const tableNodesId = '1FdWb1A7lwW2j1tf9Fswj6C7LxFrb4MXbY7KTHrIjqh8/1';

getSSData(tableEdgesId).then((edges) => {
	getSSData(tableNodesId).then((nodes) => {
		console.log('edges', edges);
		console.log('nodes', nodes);
	});
});
