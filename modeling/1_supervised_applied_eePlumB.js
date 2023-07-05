// written by B. Steele, ROSSyndicate, Colorado State University
// last modified 2023-07-05

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

// Train the CART model
var trainedCART = ee.Classifier.smileCart(10).train({
  features: training,
  classProperty: 'byte_property',
  inputProperties: inputFeatures
});

// Evaluate the model
var confusionMatrixCART = testing
  .classify(trainedCART)
  .errorMatrix(outputLabel, "classification");
print('CART Confusion Matrix:');
confusionMatrixCART.aside(print);

var acc_values_CART = confusionMatrixCART
  .accuracy();
print("CART Confusion Overall Accuracy: ", acc_values_CART);

// Train the RF model
var trainedRF = ee.Classifier.smileRandomForest(10).train({
  features: training,
  classProperty: 'byte_property',
  inputProperties: inputFeatures
});

// Evaluate the model
var confusionMatrixRF = testing
  .classify(trainedRF)
  .errorMatrix(outputLabel, "classification");
print('RF Confusion Matrix:');
confusionMatrixRF.aside(print);

var acc_values_RF = confusionMatrixRF
  .accuracy();
print("RF Confusion Overall Accuracy: ", acc_values_RF);

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

// function to apply the GTB model
var applyGTB = function(image) {
  // Select the bands that correspond to the input features of the CART model
  var imageFeatures = image.select(inputFeatures);
  var mission = image.get('SPACECRAFT_ID');
  var date = image.date().format('YYYY-MM-dd');
  // Classify the image using the trained GTB model
  var classifiedImage = imageFeatures
    .classify(trainedGTB)
    .set({'mission': mission,
      'date': date});
  return classifiedImage;
};

// apply the function to the image collection
var ls_miss_date_GTB = ls_aoi.map(applyGTB);
ls_miss_date_GTB.first().aside(print);

//////////////////////////////////////
// Calculate areas for each class  //
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

// save each value as its own band and mask 
function extract_classes(image) {
  var cl = image.select('classification');
  var cloud = cl.eq(0).rename('cloud').selfMask();
  var openWater = cl.eq(1).rename('openWater').selfMask();
  var lightNSSed = cl.eq(2).rename('lightNSSed').selfMask();
  var OSSed = cl.eq(3).rename('OSSed').selfMask();
  var dNSSed = cl.eq(4).rename('dNSSed').selfMask();
  var img_addBand = image.addBands(cloud)
    .addBands(openWater)
    .addBands(lightNSSed)
    .addBands(OSSed)
    .addBands(dNSSed);
  return img_addBand;
}

//apply function
var ls_GTB_class = ls_miss_date_GTB.map(extract_classes);
ls_GTB_class.first().aside(print);

// get CRS info
var img_crs = ls_GTB_class.first().select('cloud').projection();
var img_crsTrans = img_crs.getInfo().transform;

var allData = ee.FeatureCollection([]);

//function to calculate area for one image
function calcArea(image) {
  var areaImage =  image.multiply(ee.Image.pixelArea()).divide(1e5);
  
  var area = areaImage.reduceRegions({
    collection: aoi_area,
    reducer: ee.Reducer.sum().forEachBand(areaImage),
    crs: img_crs,
    crsTransform: img_crsTrans
  });
  var mission = image.get('mission');
  var dt = image.get('date');
  
  // Create a feature with the calculated area and properties
  var a = area.first().set({
    'mission': mission,
    'date': dt
  });

  return ee.FeatureCollection(a);
}

var allAreas = ls_GTB_class.map(calcArea);

allAreas.first().aside(print);

// export to drive	
Export.table.toDrive({  
  collection: allAreas,
  description: 'quick_gradientTreeBoost_landsat_stack_v2023-07-05',
  folder: 'eePlumB_classification',
  fileFormat: 'csv'
});


// Add images to map 

var one_image = ls_aoi
  .filter(ee.Filter.eq('SPACECRAFT_ID', 'LANDSAT_9'))
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .filterDate('2022-05-01', '2022-09-01');
one_image.first().aside(print);

var one_classification = ls_GTB_class
  .filter(ee.Filter.eq('mission', 'LANDSAT_9'))
  .filter(ee.Filter.eq('date', '2022-05-05'));
one_classification.first().aside(print);
  
/*var sat_viz = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0.0,
  max: 0.2,
};

var class_viz = {
  min: 0,
  max: 4,
};

Map.addLayer(one_image.first(), sat_viz, 'Satellite Image');
Map.addLayer(one_classification.first(), class_viz, 'Classified Image');
*/
// If the export has more than 1e8 pixels, set "maxPixels" higher.
Export.image.toAsset({
  image: one_image.first(),
  description: 'Sat_Example_L9_2022-05-05',
  assetId: 'projects/ee-ross-superior/assets/example_output/L9_2022-05-05_GTB',  // <> modify these
  region: all_aois,
  scale: 90,
  maxPixels: 1e13
});
// If the export has more than 1e8 pixels, set "maxPixels" higher.
Export.image.toAsset({
  image: one_classification.first(),
  description: 'Class_Example_L9_2022-05-05',
  assetId: 'projects/ee-ross-superior/assets/example_output/L9_2022-05-05_quickclass_GTB',  // <> modify these
  region: all_aois,
  scale: 90,
  maxPixels: 1e13
});