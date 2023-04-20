// eePlumB: Earth Engine Plume and Bloom labeling module
// written by B Steele (b.steele@colostate.edu) and Lindsay Platt (lrplatt@wisc.edu)

// Adapted from code written by Xiao Yang (yangxiao@live.unc.edu)
// from the GROD labeling workflow: https://github.com/GlobalHydrologyLab/GROD/blob/master/1_user_interface_script/GROD_validation.js

// Last modified 2023-04-20

// your initials
var init = 'BGS';


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

// Import Date-Tile images
var td1 = ee.Image('projects/ee-ross-superior/assets/eePlumB_val_n5/LS89_eePlumB_val_aoi_4_2022-10-28')
          .select(['SR_B4', 'SR_B3', 'SR_B2'], ['R', 'G', 'B']),
    td2 = ee.Image('projects/ee-ross-superior/assets/eePlumB_val_n5/LS89_eePlumB_val_aoi_5_2013-07-23')
          .select(['SR_B4', 'SR_B3', 'SR_B2'], ['R', 'G', 'B']),
    td3 = ee.Image('projects/ee-ross-superior/assets/eePlumB_val_n5/LS4-7_eePlumB_val_aoi_3_2004-06-28')
          .select(['SR_B3', 'SR_B2', 'SR_B1'], ['R', 'G', 'B']),
    td4 = ee.Image('projects/ee-ross-superior/assets/eePlumB_val_n5/LS4-7_eePlumB_val_aoi_2_2020-05-31')
          .select(['SR_B3', 'SR_B2', 'SR_B1'], ['R', 'G', 'B']),
    td5 = ee.Image('projects/ee-ross-superior/assets/eePlumB_val_n5/LS89_eePlumB_val_aoi_1_2020-08-27')
      .select(['SR_B4', 'SR_B3', 'SR_B2'], ['R', 'G', 'B']);
      

var valTiles = ee.ImageCollection(td1).merge(td2).merge(td3).merge(td4).merge(td5);

var Button1 = ui.Button('Tile-Date 1', function() {
  pickRegionByIndex(0);
  print('You are currently working on Tile-Date 1');
});
var Button2 = ui.Button('Tile-Date 2', function() {
  pickRegionByIndex(1);
  print('You are currently working on Tile-Date 2');
});
var Button3 = ui.Button('Tile-Date 3', function() {
  pickRegionByIndex(2);
  print('You are currently working on Tile-Date 3');
});
var Button4 = ui.Button('Tile-Date 4', function() {
  pickRegionByIndex(3);
  print('You are currently working on Tile-Date 4');
});
var Button5 = ui.Button('Tile-Date 5', function() {
  pickRegionByIndex(4);
  print('You are currently working on Tile-Date 5');
});

var validationPanel = ui.Panel([
  Button1,
  Button2,
  Button3,
  Button4,
  Button5
  ], ui.Panel.Layout.flow('horizontal'), {'position': 'bottom-center'});

Map.add(validationPanel);

var tc_style = {
  bands: ['R', 'G', 'B'],
  min: -0.01,
  max: 0.20
};

// Program starts
Map.setOptions('roadmap');

// Define functions

// focus on region add only tile date
var pickRegionByIndex = function(i) {
  //on click, clear and re-add panel
  Map.clear();
  Map.add(validationPanel);
  
  //grab one tile-date
  var TileDate = ee.Image(valTiles.toList(1, i).get(0));

  //focus on tile
  Map.centerObject(TileDate, 10); 
  Map.addLayer(TileDate, tc_style);
};

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
var filename = ee.String('validation_').cat(init).cat('_').cat(getTodaysDate());

// Export data
var merged = mergeCollection();

Export.table.toDrive({
  collection: merged,
  description: filename.getInfo(),
  folder: 'test-val',
  fileNamePrefix: filename.getInfo(),
  fileFormat: 'csv'});
