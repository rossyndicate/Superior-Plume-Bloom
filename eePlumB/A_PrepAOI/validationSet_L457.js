// This script creates the validation collection for eePlumB 
// for Landsat 4, 5, 7 at Lake Superior
// written by B. Steele
// last modified 2023-04-12

var aoi1 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_1');
var aoi2 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_2');
var aoi3 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_3');
var aoi4 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_4');
var aoi5 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_5');

//------------------------------------//
// DATES FOR USER VALIDATION ------------//
//-------------------------------------//
var date0 = '1984-05-04';
var date1 = '1984-05-20';
var date2 = '1987-08-17';
var date3 = '1990-07-24';
var date4 = '2004-06-28';
var date5 = '2002-10-05';
var date6 = '1995-05-19';
var date7 = '2020-05-31';

var dates = [date7, date4];

var aois = [aoi2, aoi3];

var aoi_ids = [2, 3];

// load Landsat 4, 5, 7 Surface Reflectance
var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2');
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2');
var l4 = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2');

// the metadata for these layers are the same, so we don't need any placeholder layers for harmonization //
var l457 = l4.merge(l5).merge(l7);

//filter for desired PRs
var ROWS = ee.List([27, 28]);
var l457 = l457
  .filter(ee.Filter.eq('WRS_PATH', 26))
  .filter(ee.Filter.inList('WRS_ROW', ROWS));
  
l457.aside(print);

// Applies scaling factors to LS4,5,7
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

var l457 = l457
  .map(applyScaleFactors);
  
//------------------------//
// QA FILTERS ------------//
//------------------------//

// filter out saturated pixels
function satMask(image){
  var sat = image.select('QA_RADSAT');
  var noSat = sat.eq(0);
  return image.updateMask(noSat);
}

var l457 = l457.map(satMask);


// ------------------------------- //
// -- filter to specific scenes -- //
// ------------------------------- //

// mosaic function
function mosaicOneDay(date, aoi, aoi_id){
  var today = ee.Date(date);
  var tomorrow = today.advance(1, 'days');
  var l457_oneDay = l457
    .filterDate(today, tomorrow)
    .filterBounds(aoi);
  var mission = l457_oneDay.first().get('SPACECRAFT_ID');
  var mosOneDay = l457_oneDay
    .mosaic()
    .set({'date': date,
          'aoi': aoi_id,
          'mission': mission
    });
  return mosOneDay.clip(aoi);
}


// this is NOT the most elegant way of doing this
// but GEE doesn't do for-loops and the nested functions
// make my head spin, sooooo reptition for the win.
var mos1 = mosaicOneDay(dates[0], aois[0], aoi_ids[0]);
var mos2 = mosaicOneDay(dates[1], aois[1], aoi_ids[1]);


// for whatever reason, I can't loop through or functionalize the export, so
// we're doing this the most convoluted and least data science-y way ever

//get the image
var processMos = function(mosaic, mos_aoi){
  //get the date and aoi
  var d = mosaic.get('date');
  var dstr = ee.Date(d).format('yyyy-MM-dd');
  var a = mosaic.get('aoi');
  var astr = ee.String(a);
  var id = ee.String('aoi_').cat(astr).cat('_').cat(dstr);

  //apend with assetIDPrefix
  var assetIDPrefix = 'projects/ee-ross-superior/assets/eePlumB_val_n5/LS4-7_eePlumB_val';
  var assetId = ee.String(assetIDPrefix).cat('_').cat(id);
  var descrip = ee.String('Export').cat('_').cat(id);  
  
  //define task
  var task = Export.image.toAsset({
    'image': mosaic,
    'description': id.getInfo(),
    'assetId': assetId.getInfo(),
    'pyramidingPolicy': 'mode',
    'crs': 'EPSG:4326',
    'scale': 30,
    'region': mos_aoi.geometry(),
    'maxPixels': 1e13
  });

};


//select only bands for ux and export indiv
processMos(mos1, aoi2);
processMos(mos2, aoi3);


// ------------------------------- //
// -- add vis params-------------- //
// ------------------------------- //

var l457_style_tc = {
  bands: ['SR_B3', 'SR_B2', 'SR_B1'],
  min: -0.01,
  max: 0.20
};


// ------------------------------- //
// -- show on map and center scene -- //
// ------------------------------- //

Map.addLayer(mos1, l457_style_tc, 'True Color - Mosaic 1');
Map.addLayer(mos2, l457_style_tc, 'True Color - Mosaic 2');

Map.centerObject(aoi3, 10);

