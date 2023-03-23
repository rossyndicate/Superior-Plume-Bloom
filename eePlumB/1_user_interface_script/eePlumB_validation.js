// eePlumB: Earth Engine Plume and Bloom labeling module
// written by B Steele (b.steele@colostate.edu) and Lindsay Platt (lrplatt@wisc.edu)

// Adapted from code written by Xiao Yang (yangxiao@live.unc.edu)
// from the GROD labeling workflow: https://github.com/GlobalHydrologyLab/GROD/blob/master/1_user_interface_script/GROD_validation.js

// Last modified 03/22/2023

// your initials
var init = 'BGS';


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

// Import Date-Tile images
var td1 = ee.Image('projects/ee-ross-superior/assets/eePlumB_valSets/LS89_eePlumB_val_aoi_1_2020-08-27')
          .select(['SR_B4', 'SR_B3', 'SR_B2'], ['R', 'G', 'B']),
    td2 = ee.Image('projects/ee-ross-superior/assets/eePlumB_valSets/LS89_eePlumB_val_aoi_15_2013-07-23')
          .select(['SR_B4', 'SR_B3', 'SR_B2'], ['R', 'G', 'B']),
    td4 = ee.Image('projects/ee-ross-superior/assets/eePlumB_valSets/LS89_eePlumB_val_aoi_13_2022-04-19')
          .select(['SR_B4', 'SR_B3', 'SR_B2'], ['R', 'G', 'B']),
    td5 = ee.Image('projects/ee-ross-superior/assets/eePlumB_valSets/LS89_eePlumB_val_aoi_16_2022-10-28')
          .select(['SR_B4', 'SR_B3', 'SR_B2'], ['R', 'G', 'B']),
    td7 = ee.Image('projects/ee-ross-superior/assets/eePlumB_valSets/LS4-7_eePlumB_val_aoi_12_1987-08-17')
          .select(['SR_B3', 'SR_B2', 'SR_B1'], ['R', 'G', 'B']),
    td8 = ee.Image('projects/ee-ross-superior/assets/eePlumB_valSets/LS4-7_eePlumB_val_aoi_2_2004-06-28')
          .select(['SR_B3', 'SR_B2', 'SR_B1'], ['R', 'G', 'B']),
    td9 = ee.Image('projects/ee-ross-superior/assets/eePlumB_valSets/LS4-7_eePlumB_val_aoi_4_2020-05-31')
          .select(['SR_B3', 'SR_B2', 'SR_B1'], ['R', 'G', 'B']);

var valTiles = ee.ImageCollection(td1).merge(td2).merge(td4).merge(td5).merge(td7).merge(td8).merge(td9);
valTiles.aside(print);

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
var Button6 = ui.Button('Tile-Date 6', function() {
  pickRegionByIndex(5);
  print('You are currently working on Tile-Date 6');
});
var Button7 = ui.Button('Tile-Date 7', function() {
  pickRegionByIndex(6);
  print('You are currently working on Tile-Date 7');
});

var validationPanel = ui.Panel([
  Button1,
  Button2,
  Button3,
  Button4,
  Button5,
  Button6,
  Button7
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
  Map.centerObject(TileDate, 12); 
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
