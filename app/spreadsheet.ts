export async function getSSData(id: string) {
	const url = createUrl(id);
	const res = await loadTable(url);
	const records: {}[] = [];
	res.feed.entry.map((entry: any) => {
		const record: any = {};

		Object.keys(entry).forEach((key: string) => {
			if (key.indexOf('gsx$') > -1) {
				const keyName = key.replace('gsx$', '');
				const value = entry[key].$t;
				record[keyName] = value;
			}
		});
		records.push(record);
	});

	return records;
}

async function loadTable(tableUrl: string) {
	const response = await fetch(tableUrl);
	let data = await response.json();
	return data;
}

const createUrl = (id: string): string =>
	'https://spreadsheets.google.com/feeds/list/' + id + '/public/values?alt=json';
