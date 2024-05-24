// written by B. Steele, ROSSyndicate, Colorado State University
// last modified 2023-07-06

//////////////////////////////////////
// Load data                        //
//////////////////////////////////////
var classValues = ['cloud', 
  'openWater',
  'lightNearShoreSediment', 
  'offShoreSediment', 
  'darkNearShoreSediment'];
  
// Load your label data into GEE
var labels = ee.FeatureCollection("projects/ee-ross-superior/assets/labels/collated_label_data_v2023-05-05")
  .filter(ee.Filter.inList('class', classValues));

// Load the image collection
// load Landsat 4, 5, 7, 8, 9 Surface Reflectance
var l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2");
var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");
var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2');
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2');
var l4 = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2');

// list bandnames; in part for L7 bands to match l8/9
var bn457 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'QA_RADSAT'];
var bn89 = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'QA_RADSAT'];

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
  

// Load the AOIS
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

all_aois = all_aois.union();

// clip images to aoi
var ls_aoi = ls.map(function(image) {
  return image.clip(all_aois.geometry());
});


//////////////////////////////////////
// Train model                      //
//////////////////////////////////////

// Define the input features and output labels
//var inputFeatures = ["SR_B2", "SR_B3", "SR_B4"]; // GBT 78%
//var inputFeatures = ["SR_B2", "SR_B3", "SR_B4", "SR_B7"]; // GBT 81%
var inputFeatures = ["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"]; // GBT 83%
var outputLabel = "class";

// Remap the label values to a 0-based sequential series.
var remapValues = ee.List.sequence(0, 4);
labels = labels.remap(classValues, remapValues, outputLabel);
labels = labels.map(function(feature) {
  var byteValue = ee.Number(feature.get(outputLabel)).toByte();
  return feature.set('byte_property', byteValue);
});

print('Filtered labels:');
labels.aside(print);

// Split the data into training and testing sets
var split = 0.8; // percentage of data to use for training
labels = labels.randomColumn('random'); //set up a random column
var training = labels.filter(ee.Filter.lt("random", split));
print('Training:');
training.aside(print);
var testing = labels.filter(ee.Filter.gte("random", split));
print('Testing:');
testing.aside(print);


// Train the GTB model
var trainedGTB = ee.Classifier.smileGradientTreeBoost(10).train({
  features: training,
  classProperty: 'byte_property',
  inputProperties: inputFeatures
});

// Evaluate the model
var confusionMatrixGTB = testing
  .classify(trainedGTB)
  .errorMatrix(outputLabel, "classification");
print('GTB Confusion Matrix:');
confusionMatrixGTB.aside(print);

var acc_values_GTB = confusionMatrixGTB
  .accuracy();
print("GTB Confusion Overall Accuracy: ", acc_values_GTB);

//////////////////////////////////////
// Apply model to image stack      //
//////////////////////////////////////

// make mission-date field
function addImageDate(image) {
  var mission = image.get('SPACECRAFT_ID');
  var date = image.date().format('YYYY-MM-dd');
  var missDate = ee.String(mission).cat('_').cat(ee.String(date));
  return image.set('missDate', missDate);
}

ls_aoi = ls_aoi.map(addImageDate);


// summarize by missionDate field
var uniqueMissDate = ls_aoi.aggregate_array('missDate').distinct();
uniqueMissDate.aside(print);

//////////////////////////////////////
// Helper functions                 //
//////////////////////////////////////

// Calculate total area of AOI
function calc_area(feat) {
  var feat_area = feat.geometry().area();
  var feat_area_ha = ee.Number(feat_area).divide(1e5);
  return feat.set('area_ha', feat_area_ha);
}

var aoi_area = all_aois.map(calc_area);

print('Total AOI area:');
aoi_area.first().get('area_ha').aside(print);

// get CRS info
var img_crs = ls_aoi.first().projection();
var img_crsTrans = img_crs.getInfo().transform;


// function to apply the GTB model
function applyGTB(image) {
  // Select the bands that correspond to the input features of the CART model
  var imageFeatures = image.select(inputFeatures);
  var missDate = image.get('missDate');
  // Classify the image using the trained GTB model
  var classifiedImage = imageFeatures
    .classify(trainedGTB)
    .set({'missDate': missDate});
  return image.addBands(classifiedImage);
}

// save each value as its own band and mask 
function extract_classes(image) {
  var cl = image.select('classification');
  var cloud = cl.eq(0).rename('cloud').selfMask();
  var openWater = cl.eq(1).rename('openWater').selfMask();
  var lightNSSed = cl.eq(2).rename('lightNSSed').selfMask();
  var OSSed = cl.eq(3).rename('OSSed').selfMask();
  var dNSSed = cl.eq(4).rename('dNSSed').selfMask();
  var classified = cl.gte(0).rename('classified').selfMask();
  var img_addBand = image.addBands(cloud)
    .addBands(openWater)
    .addBands(lightNSSed)
    .addBands(OSSed)
    .addBands(dNSSed)
    .addBands(classified);
  return img_addBand;
}


function applyPerMissionDate(missDate) {
  var mission = ee.String(missDate).slice(0,9);
  var date = ee.String(missDate).slice(10,20);
  
  var short_stack = ls_aoi
    .filter(ee.Filter.eq('SPACECRAFT_ID', mission))
    .filter(ee.Filter.eq('DATE_ACQUIRED', date));
  
  var oneMissDate = short_stack.mean();
  
  var ls_miss_date_GTB = applyGTB(oneMissDate);

  var ls_GTB_class = extract_classes(ls_miss_date_GTB);

  return ls_GTB_class
    .set('missDate', missDate);
}

function mosaicStack(missDate) {
  var md_GTB = applyPerMissionDate(missDate);
  return md_GTB;
}

var newStack_list = uniqueMissDate.map(mosaicStack);
var newStack = ee.ImageCollection(newStack_list);

//function to calculate area for one image
function calcArea(image) {
  var areaImage =  image.multiply(ee.Image.pixelArea()).divide(1e5);
  
  var area = areaImage.reduceRegions({
    collection: aoi_area,
    reducer: ee.Reducer.sum().forEachBand(areaImage),
    crs: img_crs,
    crsTransform: img_crsTrans
  });
  
  var missDate = image.get('missDate');

  // Create a feature with the calculated area and properties
  var a = area.first().set({
    'missDate': missDate
  });

  return ee.FeatureCollection(a);
}

var allAreas = newStack.map(calcArea);

allAreas.aside(print)

/*// Remove the geometry column.
function dropGeo(feature) {
  return feature.set('geometry', null);
}

allAreas = allAreas.map(dropGeo);
*/

// export to drive	
Export.table.toDrive({  
  collection: allAreas,
  description: 'quick_gradientTreeBoost_landsat_stack_v2023-07-06',
  folder: 'eePlumB_classification',
  fileFormat: 'csv'
});
