// eePlumB: Earth Engine Plume and Bloom labeling module
// written by B Steele (b.steele@colostate.edu) and Lindsay Platt (lrplatt@wisc.edu)

// Adapted from code written by Xiao Yang (yangxiao@live.unc.edu)
// from the GROD labeling workflow: https://github.com/GlobalHydrologyLab/GROD/blob/master/1_user_interface_script/GROD.js

// Last modified 2023-07-13

// Pixel Types. Mouse over and convert this part to geometry import 
// so that they can be selected from the map interface.
var openWater = /* color: #7ff6ff */ee.FeatureCollection([]),
    lightNearShoreSediment = /* color: #9c7238 */ee.FeatureCollection([]),
    darkNearShoreSediment = /* color: #d63000*/ee.FeatureCollection([]),
    offShoreSediment = /* color: #98ff00*/ee.FeatureCollection([]),
    algalBloom = /* color: #0c6320 */ee.FeatureCollection([]),
    cloud = /* color: #ffffff */ee.FeatureCollection([]),
    shorelineContamination = /* color: #0b4a8b*/ee.FeatureCollection([]),
    other = /* color: #820580 */ee.FeatureCollection([]);


var init = 'enter initials here'; // three letter initials

var mission = 'enter mission here'; // 'LS5', 'LS7', 'LS8', 'LS9', 'SEN2'

var date = 'enter date here'; // this is the mission date, NOT today's date

//---- FUNCTIONS ----//

// get xy data for the points
var addLatLon = function(f) {
  // add the coordinates of a feature as its properties
  var xy = f.geometry().coordinates();
  return f.set({lon: xy.get(0), lat: xy.get(1)}).setGeometry(null);
};

// merge all data together
var mergeCollection = function() {

  // assign point class as property to each feature and return the merged featurecollection
  openWater = openWater.map(function(f) {
    return f.set({class: 'openWater'});
  });

  lightNearShoreSediment = lightNearShoreSediment.map(function(f) {
    return f.set({class: 'lightNearShoreSediment'});
  });

  darkNearShoreSediment = darkNearShoreSediment.map(function(f) {
    return f.set({class: 'darkNearShoreSediment'});
  });

  offShoreSediment = offShoreSediment.map(function(f) {
    return f.set({class: 'offShoreSediment'});
  });

  algalBloom = algalBloom.map(function(f) {
    return f.set({class: 'algalBloom'});
  });

  cloud = cloud.map(function(f) {
    return f.set({class: 'cloud'});
  });

  shorelineContamination = shorelineContamination.map(function(f) {
    return f.set({class: 'shorelineContamination'});
  });
  
  other = other.map(function(f) {
    return f.set({class: 'other'});
  });

  return (openWater
  .merge(lightNearShoreSediment)
  .merge(darkNearShoreSediment)
  .merge(offShoreSediment)
  .merge(algalBloom)
  .merge(cloud)
  .merge(shorelineContamination)
  .merge(other)
  .map(addLatLon));
};

//---- MISSIONS ----//
// load Landsat 4, 5, 7, 8, 9 Surface Reflectance
var l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2");
var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");
var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2');
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2');
var l4 = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

// list bandnames; in part for L7 bands to match l8/9
var bn457 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_RADSAT'];
var bn89 = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_RADSAT'];
var bcolor = ['Blue', 'Green', 'Red', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_RADSAT'];

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
  
// Applies scaling factors to digital numbers
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true);
}

var ls = ls
  .map(applyScaleFactors)
  .select(bn89, bcolor);

//filter for desired tiles for sentinel, rename rgb
var TILES = ee.List(['15TWN', '15TXN', '15TYN', '15TWM', '15TXM', '15TYM']);
var s2band = ['B4', 'B3', 'B2', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12'];
var s2color = ['Red', 'Green', 'Blue', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12'];
var sen = s2
  .filter(ee.Filter.inList('MGRS_TILE', TILES));

// apply scaling factor
function applySenScale(image) {
  var optical = image.select('B.').multiply(0.0001);
  return image.addBands(optical, null, true);
}

var sen = sen.map(applySenScale)
  .select(s2band, s2color);


//---- AOI TILES ----//
// these do not need to be imported//
var aoi1 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_1');
var aoi2 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_2');
var aoi3 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_3');
var aoi4 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_4');
var aoi5 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_5');

var all_aois = ee.FeatureCollection(aoi1)
  .merge(aoi2)
  .merge(aoi3)
  .merge(aoi4)
  .merge(aoi5);
  
// function to find current tile
var getTileByIndex = function(index) {
  var i_t = index + 1;
  var this_tile = all_aois.filter(ee.Filter.eq('rowid', index));
  return this_tile;
};

// make satellite-mission dictionary
var s_m_keys = ['LS4', 'LS5', 'LS7', 'LS8', 'LS9', 'SEN2'];
var s_m_values = ['LANDSAT_4','LANDSAT_5','LANDSAT_7','LANDSAT_8','LANDSAT_9', 'SENTINEL'];
var sat_miss = ee.Dictionary.fromLists(s_m_keys, s_m_values);

//color style
var style_tc = {
  bands: ['Red', 'Green', 'Blue'],
  min: -0.05,
  max: 0.20
};

var today = ee.Date(date);
var tomorrow = today.advance(1, 'days');
var miss = sat_miss.get(mission);

var sr_oneDay = ee.Algorithms.If(
  ee.String(miss).slice(0,7).equals('LANDSAT'),
  ls
    .filterDate(today, tomorrow)
    .filter(ee.Filter.eq('SPACECRAFT_ID', miss)),
  print('')
);

sr_oneDay = ee.Algorithms.If(
  ee.String(miss).equals('SENTINEL'),
  sen.filterDate(today, tomorrow),
  sr_oneDay
);

sr_oneDay.aside(print);

// function on move between tiles
var updateMapOnClick = function(i, satellite, date) {
  Map.clear();
  Map.add(label_Panel);
  var currentTile = getTileByIndex(i);
  var miss = sat_miss.get(satellite);

//  var today = ee.Date(date);
//  var tomorrow = today.advance(1, 'days');
  var sr_oneDayTile = ee.ImageCollection(sr_oneDay)
    .filterBounds(currentTile);
  var mosOneDay = sr_oneDayTile
    .mosaic()
    .set({'date': date,
          'aoi': i,
          'mission': miss
    })
    .clip(currentTile);

  Map.addLayer(mosOneDay, style_tc);
  Map.centerObject(currentTile, 12);
};

//---- DEFINE UI WIDGETS ----//

// 1. buttons and labels
var layers = Map.layers();
var Button1 = ui.Button('Tile 1', function() {
  updateMapOnClick(1, mission, date);
});
var Button2 = ui.Button('Tile 2', function() {
  updateMapOnClick(2, mission, date);
});
var Button3 = ui.Button('Tile 3', function() {
  updateMapOnClick(3, mission, date);
});
var Button4 = ui.Button('Tile 4', function() {
  updateMapOnClick(4, mission, date);
});
var Button5 = ui.Button('Tile 5', function() {
  updateMapOnClick(5, mission, date);
});

// 2. panels
var label_Panel = ui.Panel([
  Button1,
  Button2,
  Button3,
  Button4,
  Button5
  ], ui.Panel.Layout.flow('horizontal'), {'position': 'bottom-center'});

Map.add(label_Panel);

Map.setOptions('roadmap');

//---- EXPORT ----//
// Function to get and format today's date
function getTodaysDate() {
  var date = new Date();
  var dd = ee.Date(date).format('dd');
  var mm = ee.Date(date).format('MM'); 

  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;

  var date_string = date.getFullYear() + '-' + mm.getInfo() + '-' + dd.getInfo();
  return(date_string);
}

// make file name
var filename = ee.String('eePlumB_').cat(init).cat('_').cat(mission).cat('_').cat(date).cat('_v').cat(getTodaysDate());

// Export data
var merged = mergeCollection();


//define scale
var scale = 30;

// Define a function to create a point geometry from lat and lon properties
var createPoint = function(feature) {
  var lat = feature.get('lat');
  var lon = feature.get('lon');
  return ee.Geometry.Point([lon, lat]);
};

// Map the createPoint function over the feature collection to create a new feature collection
var pointFC = merged.map(function(feature) {
  return ee.Feature(createPoint(feature), feature.toDictionary());
});

//define bands to extract
var data = ee.ImageCollection(sr_oneDay)
  .median()
  .reduceRegions({
    collection: pointFC,
    reducer: ee.Reducer.median(),
    scale: scale,
    crs: ee.ImageCollection(sr_oneDay).geometry().projection().crs()
});

var removeGeo = function(i){
  return i.setGeometry(null);
};

Export.table.toDrive({
  collection: data,
  description: filename.getInfo(),
  folder: 'labels',
  fileNamePrefix: filename.getInfo(),
  fileFormat: 'csv'});
