// This script gathers all possible LS mission-date pairs for the LS 4-9 stack 
// and exports a .csv of those for creating a mission-date list for eePlumB users.

// B. Steele 2023-04-14 b.steele@colostate.edu

//---- MISSIONS ----//
// load Landsat 4, 5, 7, 8, 9 Surface Reflectance
var l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2");
var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");
var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2');
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2');
var l4 = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2');

// list bandnames; in part for L7 bands to match l8/9
var bn457 = ['SR_B1', 'SR_B2', 'SR_B3', 'QA_RADSAT'];
var bn89 = ['SR_B2', 'SR_B3', 'SR_B4', 'QA_RADSAT'];

// join those with band interoperability
var l457 = l4.merge(l5).merge(l7).select(bn457, bn89); //join and rename
var l89 = l8.merge(l9).select(bn89);

// merge all
var all_ls = l457.merge(l89);

//filter for desired PRs
var ROWS = ee.List([27, 28]);
var ls = all_ls
  .filter(ee.Filter.eq('WRS_PATH', 26))
  .filter(ee.Filter.inList('WRS_ROW', ROWS));

ls.aside(print);

Export.table.toDrive({
  collection: ls,
  description: 'Superior_LS_mission_date_list',
  selectors: ['SPACECRAFT_ID', 'DATE_ACQUIRED', 'WRS_PATH', 'WRS_ROW'],
  folder: 'eePlumB_output',
  fileNamePrefix: 'Superior_LS_mission_date_list',
  fileFormat: 'csv'});
