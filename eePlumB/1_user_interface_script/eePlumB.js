
// Pixel Types. Mouse over and convert this part to geometry import 
// so that they can be selected from the map interface.
var openWater = /* color: #181930 */ee.FeatureCollection([]),
    sedimentPlume = /* color: #9c7238 */ee.FeatureCollection([]),
    ruddySediment = /* color:*/ee.FeatureCollection([]),
    deepOffshoreSediment = /* color: */ee.FeatureCollection([]),
    algalBloom = /* color: #0c6320 */ee.FeatureCollection([]),
    unmaskedCloud = /* color: #ffffff */ee.FeatureCollection([]),
    cloudContamination = /* color: #cccccc */ee.FeatureCollection([]),
    shorelineContamination = /* color: */ee.FeatureCollection([]),
    other = /* color: #820580 */ee.FeatureCollection([]),
    uncertain = /* color: */ ee.FeatureCollection([]);


var init = 'BGS';


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

  sedimentPlume = sedimentPlume.map(function(f) {
    return f.set({class: 'sedimentPlume'});
  });

  ruddySediment = ruddySediment.map(function(f) {
    return f.set({class: 'ruddySediment'});
  });

  deepOffshoreSediment = deepOffshoreSediment.map(function(f) {
    return f.set({class: 'deepOffshoreSediment'});
  });

  algalBloom = algalBloom.map(function(f) {
    return f.set({class: 'algalBloom'});
  });

  unmaskedCloud = unmaskedCloud.map(function(f) {
    return f.set({class: 'unmaskedCloud'});
  });

  cloudContamination = cloudContamination.map(function(f) {
    return f.set({class: 'cloudContamination'});
  });
  
  shorelineContamination = shorelineContamination.map(function(f) {
    return f.set({class: 'shorelineContamination'});
  });
  
  other = other.map(function(f) {
    return f.set({class: 'other'});
  });

  uncertain = uncertain.map(function(f) {
    return f.set({class: 'uncertain'});
  });

  return (openWater
  .merge(sedimentPlume)
  .merge(ruddySediment)
  .merge(deepOffshoreSediment)
  .merge(algalBloom)
  .merge(unmaskedCloud)
  .merge(cloudContamination)
  .merge(other)
  .merge(shorelineContamination)
  .merge(uncertain)
  .map(addLatLon));
};

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
  
// Applies scaling factors to digital numbers
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true);
}

var ls = ls
  .map(applyScaleFactors);
  
ls.aside(print);
  
//---- TILES ----//
// these do not need to be imported//
var aoi1 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_1');
var aoi2 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_2');
var aoi3 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_3');
var aoi4 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_4');
var aoi5 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_5');
var aoi6 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_6');
var aoi7 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_7');
var aoi8 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_8');
var aoi9 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_9');
var aoi10 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_10');
var aoi11 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_11');
var aoi12 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_12');
var aoi13 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_13');
var aoi14 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_14');
var aoi15 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_15');
var aoi16 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_16');

var all_aois = ee.FeatureCollection(aoi1)
  .merge(aoi2)
  .merge(aoi3)
  .merge(aoi4)
  .merge(aoi5)
  .merge(aoi6)
  .merge(aoi7)
  .merge(aoi8)
  .merge(aoi9)
  .merge(aoi10)
  .merge(aoi11)
  .merge(aoi12)
  .merge(aoi13)
  .merge(aoi14)
  .merge(aoi15)
  .merge(aoi16);
  
// function to find current tile
var getTileByIndex = function(index) {
  var i_t = index + 1;
  var this_tile = all_aois.filter(ee.Filter.eq('rowid', index));
  return this_tile;
};

// make satellite-mission dictionary
var s_m_keys = ['LS4', 'LS5', 'LS7', 'LS8', 'LS9'];
var s_m_values = ['LANDSAT_4','LANDSAT_5','LANDSAT_7','LANDSAT_8','LANDSAT_9'];
var sat_miss = ee.Dictionary.fromLists(s_m_keys, s_m_values);

//color style
var style_tc = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: -0.05,
  max: 0.20
};

// function on move between tiles
var updateMapOnClick = function(i, satellite, date) {
  var currentTile = getTileByIndex(i);
  var miss = sat_miss.get(satellite);

  var today = ee.Date(date);
  var tomorrow = today.advance(1, 'days');
  var ls_oneDay = ls
    .filterDate(today, tomorrow)
    .filter(ee.Filter.eq('SPACECRAFT_ID', miss))
    .filterBounds(currentTile);
  var mosOneDay = ls_oneDay
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
var label_gridId = ui.Label('', {
  padding: '4px',
  color: 'blue',
  fontWeight: 'bold'});
var label_tile = ui.Label('', {
  padding: '4px',
  color: 'red',
  fontWeight: 'bold'});
var jumpToId = ui.Textbox({
  placeholder: 'Enter mission-date...',
  onChange: function(ID) {
    var sat = ee.String(ID).slice(0,3);
    var d = ee.String(ID).slice(-10);
    label_gridId.setValue('Current mission-date: ' + sat.getInfo() + ' ' + d.getInfo());
    updateMapOnClick(i, sat, d);
    label_tile.setValue('Current tile: ', ee.Number(i).add(1).getInfo());
  }
});
var button_next = ui.Button({
  label: 'Next tile',
  onClick: function() {
    var ID = jumpToId.getValue();
    var sat = ee.String(ID).slice(0,3);
    var d = ee.String(ID).slice(-10);
    i = i + 1;
    updateMapOnClick(i, sat, d);
    label_tile.setValue('Current tile: ' + i);
  }
});
var button_prev = ui.Button({
  label: 'Previous tile',
  onClick: function() {
    var ID = jumpToId.getValue();
    var sat = ee.String(ID).slice(0,3);
    var d = ee.String(ID).slice(-10);
    i = i - 1;
    updateMapOnClick(i, sat, d);
    label_tile.setValue('Current tile: ' + i);
  }
});

// 2. panels
var panel1 = ui.Panel([button_prev, label_gridId, label_tile, button_next, jumpToId], ui.Panel.Layout.flow('horizontal'));
panel1.style().set({
  padding: '0px',
  position: 'bottom-center'
});

// Draw UI
var i = 0; // initiate i value

Map.add(panel1);
Map.setOptions('roadmap');

//---- EXPORT ----//
// Function to get and format today's date
function getTodaysDate() {
  var date = new Date();
  var dd = ee.Date(date).format('dd');
  var mm = ee.Date(date).format('MM'); // this is doing something weird and is not correct

  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;

  var date_string = date.getFullYear() + '-' + mm.getInfo() + '-' + dd.getInfo();
  return(date_string);
}

// make file name
var filename = ee.String('eePlumB_').cat(init).cat('_').cat(getTodaysDate());

// Export data
var merged = mergeCollection();

Export.table.toDrive({
  collection: merged,
  description: filename.getInfo(),
  folder: 'test-val',
  fileNamePrefix: filename.getInfo(),
  fileFormat: 'csv'});

/*//Add in grid cell viz
//Import fusion table
var fusionTable = ee.FeatureCollection("ft:1RJiOn0HkkHGui49Pgu6TuiLF7_l2m6-d7IyRggVW");
//Join fusion table to grid
var filter = ee.Filter.equals({
 leftField: 'fxd_ndx',
 rightField: 'Grid Cell'
});
var simpleJoin = ee.Join.saveFirst({
 matchKey: "test"
})
var simpleJoined = simpleJoin.apply(gridFiltered, fusionTable,filter);

var getProp = function (feature){
 var f2 = ee.Feature(feature.get("test"))
 var keep = ["Name","Date Completed mm/dd/yy:"]
 var newFeature = feature.copyProperties(f2, keep)
 return(newFeature)
}

var final = simpleJoined.map(getProp).aside(print)
//select done grid cells
var notdone = final.filterMetadata("Name", "equals", "")
var done = final.filterMetadata("Name", "not_equals", "")
//Plot them!
Map.addLayer(done, {color:"black"}, "done"),
Map.addLayer(notdone, {color:"red"}, "not done")*/
