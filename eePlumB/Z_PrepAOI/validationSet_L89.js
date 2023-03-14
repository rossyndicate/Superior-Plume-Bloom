// This script creates the validation collection for eePlumB 
// for Landsat 8 & 9 at Lake Superior
// written by B. Steele
// last modified 2020-03-14

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


//------------------------------------//
// DATES FOR USER VALIDATION ------------//
//-------------------------------------//
var date0 = '2013-07-23';
var date1 = '2020-08-27';
var date2 = '2016-11-04';
var date3 = '2022-10-28';
var date4 = '2022-04-19';

// notes from b's noodling around - to see these yourself, uncomment
// the last two blocks of code and fill in dates on line 119, aoi on 124,
// and optionally aoi id on 125

var dates = [date0,date0, date0,
            date1,date1,date1, 
            date2,date2, 
            date3,date3,date3,
            date4,date4];

var aois = [aoi9, aoi1, aoi16, 
            aoi1, aoi4, aoi11, 
            aoi2, aoi10, 
            aoi16, aoi5, aoi11, 
            aoi1, aoi13];

var aoi_ids = [9, 1, 16,
              1, 4, 11, 
              2, 10, 
              16, 5, 11, 
              1, 13];

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

// Filter for water, clouds, etc ----- //
function fMask(image) {
  var qa = image.select('QA_PIXEL');
  var water = qa.bitwiseAnd(1 << 7);
  var cloudqa = qa.bitwiseAnd(1 << 1)
    .where(qa.bitwiseAnd(1 << 2), ee.Image(2))
    .where(qa.bitwiseAnd(1 << 3), ee.Image(3))
    .where(qa.bitwiseAnd(1 << 4), ee.Image(4))
    .where(qa.bitwiseAnd(1 << 5), ee.Image(5));
  var qaMask = cloudqa.eq(0);
  return image.updateMask(qaMask).updateMask(water);
}

var l89 = l89.map(fMask);

// ------------------------------- //
// -- filter to specific scenes -- //
// ------------------------------- //

// function to clip to AOI function
function clip(image) {
  var cl_im = image.clip(aoi);
  return cl_im;
}

var today = ee.Date(date4);
var tomorrow = today.advance(1, 'days');
var l89_oneDay = l89
  .filterDate(today, tomorrow);
  
var aoi = aoi16;
var aoi_id = 1;

//date0, aoi9 -- open water, cloud artifacts
//date0, aoi1 -- clear sediment on south shore
//date0, aoi16 - open water
//date1, aoi1 -- lots of sediment and deep sediment that looks like blooms
//date1, aoi4 -- sediment near harbor, unmasked clouds, shoreline artifacts (jetties)
//date1, aoi11 -- sediment along shores, looks like blooms (but is more likely plumes)
//date2, aoi2 -- ruddy sediment, open water (top right)
//date2, aoi10 -- stringy sediment between island and land, sediment near inlet, open water
//date3, aoi16 -- open water 
//date3, aoi5 -- lots of wind-blown suspended sediment
//date3, aoi11 -- cloud artifacts, sediment between islands
//date4, aoi1 -- dark dark sediment, cloud artifacts along s shore
//date4, aoi13 -- open water except near inlets

var l89_oneDay = l89_oneDay
  .filterBounds(aoi)
  .map(clip);

l89_oneDay.aside(print);

var l89_oneDay = l89_oneDay
  .mosaic()
  .set({'date': today,
        'aoi': aoi_id});
  
l89_oneDay.aside(print);


// mosaic function
function mosaicOneDay(date, aoi, aoi_id){
  var today = ee.Date(date);
  var tomorrow = today.advance(1, 'days');
  var l89_oneDay = l89
    .filterDate(today, tomorrow)
    .filterBounds(aoi)
    .map(clip);
  var mosOneDay = l89_oneDay
    .mosaic()
    .set({'date': today,
          'aoi': aoi_id});
  return mosOneDay;
}

// this is NOT the most elegant way of doing this
// but GEE doesn't do for-loops and the nested functions
// make my head spin, sooooo reptition for the win.
var mos0_9 = mosaicOneDay(dates[0], aois[0], aoi_ids[0]);
var mos0_1 = mosaicOneDay(dates[1], aois[1], aoi_ids[1]);
var mos0_16 = mosaicOneDay(dates[2], aois[2], aoi_ids[2]);
var mos1_1 = mosaicOneDay(dates[3], aois[3], aoi_ids[3]);
var mos1_4 = mosaicOneDay(dates[4], aois[4], aoi_ids[4]);
var mos1_11 = mosaicOneDay(dates[5], aois[5], aoi_ids[5]);
var mos2_2 = mosaicOneDay(dates[6], aois[6], aoi_ids[6]);
var mos2_10 = mosaicOneDay(dates[7], aois[7], aoi_ids[7]);
var mos3_16 = mosaicOneDay(dates[8], aois[8], aoi_ids[8]);
var mos3_5 = mosaicOneDay(dates[9], aois[9], aoi_ids[9]);
var mos3_11 = mosaicOneDay(dates[10], aois[10], aoi_ids[10]);
var mos4_1 = mosaicOneDay(dates[11], aois[11], aoi_ids[11]);
var mos4_13 = mosaicOneDay(dates[12], aois[12], aoi_ids[12]);

var validationCollection = ee.ImageCollection([mos0_9, mos0_1, mos0_16,
                          mos1_1, mos1_4, mos1_11,
                          mos2_2, mos2_10, 
                          mos3_16, mos3_5, mos3_11, 
                          mos4_1, mos4_13]);

validationCollection.aside(print);

// for whatever reason, I can't loop through or functionalize the export, so
// we're doing this the most convoluted and least data science-y way ever

//get the image
var processMos = function(mosaic){
  //get the date and aoi
  var d = mosaic.get('date');
  var dstr = ee.Date(d).format('yyyy-MM-dd');
  var a = mosaic.get('aoi');
  var astr = ee.String(a);
  var id = ee.String('aoi_').cat(astr).cat('_').cat(dstr);

  //apend with assetIDPrefix
  var assetIDPrefix = 'projects/ee-ross-superior/assets/eePlumB_valSets/LS89_eePlumB_val';
  var assetId = ee.String(assetIDPrefix).cat('_').cat(id);
  var descrip = ee.String('Export').cat('_').cat(id);  
  
  //define task
  var task = Export.image.toAsset({
    'image': mosaic,
    'description': id.getInfo(),
    'assetId': assetId.getInfo(),
    'pyramidingPolicy': 'mode',
    'scale': 30,
    'maxPixels': 1e13
  });
  
};

//select only bands for ux and export indiv
processMos(mos0_9.select(['SR_B4', 'SR_B3', 'SR_B2']));
processMos(mos0_1.select(['SR_B4', 'SR_B3', 'SR_B2']));
processMos(mos0_16.select(['SR_B4', 'SR_B3', 'SR_B2']));

processMos(mos1_1.select(['SR_B4', 'SR_B3', 'SR_B2']));
processMos(mos1_4.select(['SR_B4', 'SR_B3', 'SR_B2']));
processMos(mos1_11.select(['SR_B4', 'SR_B3', 'SR_B2']));

processMos(mos2_2.select(['SR_B4', 'SR_B3', 'SR_B2']));
processMos(mos2_10.select(['SR_B4', 'SR_B3', 'SR_B2']));

processMos(mos3_16.select(['SR_B4', 'SR_B3', 'SR_B2']));
processMos(mos3_5.select(['SR_B4', 'SR_B3', 'SR_B2']));
processMos(mos3_11.select(['SR_B4', 'SR_B3', 'SR_B2']));

processMos(mos4_1.select(['SR_B4', 'SR_B3', 'SR_B2']));
processMos(mos4_13.select(['SR_B4', 'SR_B3', 'SR_B2']));

/*
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

Map.addLayer(l89_oneDay, l89_style_tc, 'True Color');
Map.centerObject(aoi, 12);
*/