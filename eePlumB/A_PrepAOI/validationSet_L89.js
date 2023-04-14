// This script creates the validation collection for eePlumB 
// for Landsat 8 & 9 at Lake Superior
// written by B. Steele
// last modified 2020-04-12

var aoi1 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_1');
var aoi2 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_2');
var aoi3 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_3');
var aoi4 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_4');
var aoi5 = ee.FeatureCollection('projects/ee-ross-superior/assets/tiledAOI/SuperiorAOI_5');

//------------------------------------//
// DATES FOR USER VALIDATION ------------//
//-------------------------------------//
var date0 = '2013-07-23';
var date1 = '2020-08-27';
var date2 = '2016-11-04';
var date3 = '2022-10-28';
var date4 = '2022-04-19';

var dates = [date1, date0, date3];

var aois = [aoi1, aoi5, aoi4];

var aoi_ids = [1, 5, 4];

// load Landsat 8 and 9 Surface Reflectance
var l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2");
var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");

// merge collections
var l89 = ee.ImageCollection(l8).merge(l9);

//filter for desired PRs
var ROWS = ee.List([27, 28]);
var l89 = l89
  .filter(ee.Filter.eq('WRS_PATH', 26))
  .filter(ee.Filter.inList('WRS_ROW', ROWS));
  
l89.aside(print);

// Applies scaling factors to LS8/9
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

var l89 = l89
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

var l89 = l89.map(satMask);

// ------------------------------- //
// -- filter to specific scenes -- //
// ------------------------------- //
// mosaic function
function mosaicOneDay(date, aoi, aoi_id){
  var today = ee.Date(date);
  var tomorrow = today.advance(1, 'days');
  var l89_oneDay = l89
    .filterDate(today, tomorrow)
    .filterBounds(aoi);
  var mission = l89_oneDay.first().get('SPACECRAFT_ID');
  var mosOneDay = l89_oneDay
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
var mos3 = mosaicOneDay(dates[2], aois[2], aoi_ids[2]);


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
  var assetIDPrefix = 'projects/ee-ross-superior/assets/eePlumB_val_n5/LS89_eePlumB_val';
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
processMos(mos1, aoi1);
processMos(mos2, aoi5);
processMos(mos3, aoi4);



// ------------------------------- //
// -- add vis params-------------- //
// ------------------------------- //

var l89_style_tc = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: -0.05,
  max: 0.20
};


// ------------------------------- //
// -- show on map and center scene -- //
// ------------------------------- //

Map.addLayer(mos1, l89_style_tc, 'True Color, Mosaic 1');
Map.centerObject(aoi1, 11);

Map.addLayer(mos2, l89_style_tc, 'True Color, Mosaic 2');
Map.centerObject(aoi5, 11);

Map.addLayer(mos3, l89_style_tc, 'True Color, Mosaic 3');
Map.centerObject(aoi4, 11);
