// This script creates the validation collection for eePlumB for Landsat 8 & 9
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

//------------------------------------//
// DATES FOR USER VALIDATION ------------//
//-------------------------------------//
var date0 = '2013-07-23';
var date1 = '2020-08-27';
var date2 = '2016-11-04';
var date3 = '2022-10-28';
var date4 = '2022-04-19';

// notes from b's noodling around - to see these yourself, uncomment
// the last two blocks of code and fill in dates on line 123, aoi on 128,
// and aoi id on 129
//date0, aoi9 -- cloud artifacts
//date0, aoi1 -- clear sediment on south shore; cloud artifacts in NE corner
//date1, aoi1 -- lots of sediment and deep sediment that looks like blooms
//date1, aoi2 -- lots of sediment and deep sediment that looks like blooms
//date1, aoi4 -- unmasked clouds, sediment along s shore
//date1, aoi9 -- open water (arguable deep sed at bottom)
//date2, aoi1 -- sediment swirls, near harbor very brown
//date2, aoi7 -- stringy sediment between island and land, sediment near inlet, lots of mixed shore pixels
//date2, aoi11 -- open water
//date3, aoi10 -- cloud artifacts (especially in bottom r; sediment between islands
//date3, aoi2 -- lots of wind-blown suspended sediment
//date3, aoi8 -- cloud artifacts
//date4, aoi3 -- cloud artifacts, sediment s of island
//date4, aoi1 -- dark dark sediment
//date4, aoi5 -- open water except near inlet of knife river
//date4, aoi6 -- cloud artifacts at the bottom edge, deep sediment

var dates = [date0,date0, 
                    date1,date1,date1,date1, 
                    date2,,date2,date2, 
                    date3,date3,date3,
                    date4,date4,date4,date4];

var aois = [aoi9, aoi1, aoi1, aoi2, aoi4, aoi9, aoi1, 
                  aoi7, aoi11, aoi10, aoi2, aoi8, aoi3, aoi1, aoi5, 
                  aoi6];

var aoi_ids = [9, 1, 1, 2, 4, 9, 1, 7, 11, 10, 2, 8, 3, 1, 5, 6];

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
  
l89.aside(print)

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

var today = ee.Date(date2);
var tomorrow = today.advance(1, 'days');
var l89_oneDay = l89
  .filterDate(today, tomorrow);
  
var aoi = aoi6;
var aoi_id = 1;

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
var mos1_1 = mosaicOneDay(dates[2], aois[2], aoi_ids[2]);
var mos1_2 = mosaicOneDay(dates[3], aois[3], aoi_ids[3]);
var mos1_4 = mosaicOneDay(dates[4], aois[4], aoi_ids[4]);
var mos1_9 = mosaicOneDay(dates[5], aois[5], aoi_ids[5]);
var mos2_1 = mosaicOneDay(dates[6], aois[6], aoi_ids[6]);
var mos2_7 = mosaicOneDay(dates[7], aois[7], aoi_ids[7]);
var mos2_11 = mosaicOneDay(dates[8], aois[8], aoi_ids[8]);
var mos3_10 = mosaicOneDay(dates[9], aois[9], aoi_ids[9]);
var mos3_2 = mosaicOneDay(dates[10], aois[10], aoi_ids[10]);
var mos3_8 = mosaicOneDay(dates[11], aois[11], aoi_ids[11]);
var mos4_3 = mosaicOneDay(dates[12], aois[12], aoi_ids[12]);
var mos4_1 = mosaicOneDay(dates[13], aois[13], aoi_ids[13]);
var mos4_5 = mosaicOneDay(dates[14], aois[14], aoi_ids[14]);
var mos4_6 = mosaicOneDay(dates[15], aois[15], aoi_ids[15]);


var validationCollection = ee.ImageCollection([mos1,
                          mos2, mos3, mos4, mos5, mos6,
                          mos7, mos8, mos9, mos10, mos11,
                          mos12, mos13, mos14, mos15, mos16
                          ]);

validationCollection.aside(print);

Export.table.toAsset(validationCollection);

/*// ------------------------------- //
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
Map.centerObject(aoi);
*/
 
