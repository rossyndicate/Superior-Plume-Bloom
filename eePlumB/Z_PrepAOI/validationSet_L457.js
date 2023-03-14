// This script creates the validation collection for eePlumB 
// for Landsat 4, 5, 7 at Lake Superior
// written by B. Steele
// last modified 2023-03-14

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
var date0 = '1984-05-04';
var date1 = '1984-05-20';
var date2 = '1987-08-17';
var date3 = '1990-07-24';
var date4 = '2004-06-28';
var date5 = '2002-10-05';
var date6 = '1995-05-19';
var date7 = '2020-05-31';

// notes from b's noodling around - to see these yourself, uncomment
// the last two blocks of code and fill in dates on line 124, aoi on 129,
// and optionally, aoi id on 130
//date0, aoi1 -- dark sediment, deep sediment, unmasked cloud top r
//date0, aoi4 -- open water, unmasked clouds
//date1, aoi1 -- pervasive sediment along shore, unmasked clouds top l
//date1, aoi9 -- cloud artifacts, open water
//date2, aoi12 -- sedmient along shore of island, unmasked clouds
//date2, aoi8 -- sedmient on N side of island, unmasked clouds
//date3, aoi10 -- stringy sediment between shore and island, open water
//date4, aoi2 - cloud artifacts (dark areas adjacent to masked clouds, brown/green sedmient, unmasked clouds
//date4, aoi6 - open water, deep plumes, cloud artifacts, unmasked clouds
//date5, aoi5 -- brilliant sediment, open water
//date5, aoi15 -- open water
//date6, aoi9 -- knife river sediment, open water, unmasked clouds, shoreline artifacts (two harbors)
//date7, aoi4 -- deep sediment, open water, near-shore artifacts (near canal park)
//date7, aoi2 -- lots of ruddy sediment, open water

var dates = [date0, date0, 
            date1, date1, 
            date2, date2, 
            date3, 
            date4, date4, 
            date5, date5, 
            date6, 
            date7, date7];

var aois = [aoi1, aoi4, 
            aoi1, aoi9,
            aoi12, aoi8, 
            aoi10, 
            aoi2, aoi6, 
            aoi5, aoi15, 
            aoi9, 
            aoi4, aoi2];

var aoi_ids = [1, 4, 1, 9, 12, 8, 10, 2, 6, 5, 15, 9, 4, 2];

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

var l457 = l457.map(fMask);

// ------------------------------- //
// -- filter to specific scenes -- //
// ------------------------------- //

// function to clip to AOI function
function clip(image) {
  var cl_im = image.clip(aoi);
  return cl_im;
}

var today = ee.Date(date7);
var tomorrow = today.advance(1, 'days');
var l457_oneDay = l457
  .filterDate(today, tomorrow);
  
var aoi = aoi2;
var aoi_id = 1;

var l457_oneDay = l457_oneDay
  .filterBounds(aoi)
  .map(clip);

l457_oneDay.aside(print);

var l457_oneDay = l457_oneDay
  .mosaic()
  .set({'date': today,
        'aoi': aoi_id});
  
l457_oneDay.aside(print);


// mosaic function
function mosaicOneDay(date, aoi, aoi_id){
  var today = ee.Date(date);
  var tomorrow = today.advance(1, 'days');
  var l457_oneDay = l457
    .filterDate(today, tomorrow)
    .filterBounds(aoi)
    .map(clip);
  var mosOneDay = l457_oneDay
    .mosaic()
    .set({'date': today,
          'aoi': aoi_id});
  return mosOneDay;
}

// this is NOT the most elegant way of doing this
// but GEE doesn't do for-loops and the nested functions
// make my head spin, sooooo reptition for the win.
var mos0_1 = mosaicOneDay(dates[0], aois[0], aoi_ids[0]);
var mos0_4 = mosaicOneDay(dates[1], aois[1], aoi_ids[1]);
var mos1_1 = mosaicOneDay(dates[2], aois[2], aoi_ids[2]);
var mos1_9 = mosaicOneDay(dates[3], aois[3], aoi_ids[3]);
var mos2_12 = mosaicOneDay(dates[4], aois[4], aoi_ids[4]);
var mos2_8 = mosaicOneDay(dates[5], aois[5], aoi_ids[5]);
var mos3_10 = mosaicOneDay(dates[6], aois[6], aoi_ids[6]);
var mos4_2 = mosaicOneDay(dates[7], aois[7], aoi_ids[7]);
var mos4_6 = mosaicOneDay(dates[8], aois[8], aoi_ids[8]);
var mos5_5 = mosaicOneDay(dates[9], aois[9], aoi_ids[9]);
var mos5_15 = mosaicOneDay(dates[10], aois[10], aoi_ids[10]);
var mos6_9 = mosaicOneDay(dates[11], aois[11], aoi_ids[11]);
var mos7_4 = mosaicOneDay(dates[12], aois[12], aoi_ids[12]);
var mos7_2 = mosaicOneDay(dates[13], aois[13], aoi_ids[13]);

mos0_1.aside(print)
var validationCollection = ee.ImageCollection([
                          mos0_1, mos0_4, 
                          mos1_1, mos1_9, 
                          mos2_12, mos2_8,
                          mos3_10, 
                          mos4_2, mos4_6, 
                          mos5_5, mos5_15,
                          mos6_9, 
                          mos7_4, mos7_2]);

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
  var assetIDPrefix = 'projects/ee-ross-superior/assets/eePlumB_valSets/LS4-7_eePlumB_val';
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
processMos(mos0_1.select(['SR_B1', 'SR_B2', 'SR_B3']));
processMos(mos0_4.select(['SR_B1', 'SR_B2', 'SR_B3']));

processMos(mos1_1.select(['SR_B1', 'SR_B2', 'SR_B3']));
processMos(mos1_9.select(['SR_B1', 'SR_B2', 'SR_B3']));

processMos(mos2_12.select(['SR_B1', 'SR_B2', 'SR_B3']));
processMos(mos2_8.select(['SR_B1', 'SR_B2', 'SR_B3']));

processMos(mos3_10.select(['SR_B1', 'SR_B2', 'SR_B3']));

processMos(mos4_2.select(['SR_B1', 'SR_B2', 'SR_B3']));
processMos(mos4_6.select(['SR_B1', 'SR_B2', 'SR_B3']));

processMos(mos5_5.select(['SR_B1', 'SR_B2', 'SR_B3']));
processMos(mos5_15.select(['SR_B1', 'SR_B2', 'SR_B3']));

processMos(mos6_9.select(['SR_B1', 'SR_B2', 'SR_B3']));

processMos(mos7_4.select(['SR_B1', 'SR_B2', 'SR_B3']));
processMos(mos7_2.select(['SR_B1', 'SR_B2', 'SR_B3']));

/*
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

Map.addLayer(l457_oneDay, l457_style_tc, 'True Color');
  Map.centerObject(aoi, 12);
*/
