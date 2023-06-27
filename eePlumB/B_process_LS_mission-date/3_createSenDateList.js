// This script gathers all possible Sentinel 2 mission-date pairs 
// and exports a .csv of those for creating a mission-date list for eePlumB users.

// B. Steele 2023-06-26 b.steele@colostate.edu

//---- MISSIONS ----//
// add sentinel 2 harmonized surface reflectance
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

//filter for desired tiles
var TILES = ee.List(['15TWN', '15TXN', '15TYN', '15TWM', '15TXM', '15TYM']);
var sen = s2
  .filter(ee.Filter.inList('MGRS_TILE', TILES));

// function to get date and add as a bit of metadata
function addDate(image) {
  var date = ee.Date(image.date()).format('YYYY-MM-dd');
  return image.set('date', date);
}

sen = sen.map(addDate);

Export.table.toDrive({
  collection: sen,
  description: 'Superior_sen_mission_date_list',
  selectors: ['date', 'MGRS_TILE'],
  folder: 'eePlumB_output',
  fileNamePrefix: 'Superior_sen2_date_list',
  fileFormat: 'csv'});
