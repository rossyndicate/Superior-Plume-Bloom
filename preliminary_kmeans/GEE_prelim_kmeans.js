// adapted from https://www.eefabook.org/ Section F3.3  //
// for use in creation of preliminary rasters for Lindsay's pipeline //
// to walk through images, you must change the input on line 214 //


////////////////////////////////////////////////////////////
// 0. Prepare Landsat stack
// even though we won't have clouds/rad masked, let's do that here
// to make the clustering a bit more accurate.
////////////////////////////////////////////////////////////

var l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"),
    l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2"),
    l7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2"),
    l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2'),
    l4 = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2'),
    aoi = ee.FeatureCollection("projects/ee-ross-superior/assets/aoi_superior_no_harbor")
      .filter(ee.Filter.eq('Feature', 'Water'));
    
// rename L7 bands to match l8/9
var bn7 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7', 'ST_B6', 'QA_PIXEL', 'QA_RADSAT'];
// new band names
var bns = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7', 'ST_B10', 'QA_PIXEL', 'QA_RADSAT'];
var l4 = l4.select(bn7, bns);
var l5 = l5.select(bn7, bns);
var l7 = l7.select(bn7, bns);
var l8 = l8.select(bns);
var l9 = l9.select(bns);

// merge collections
var ls = ee.ImageCollection(l9).merge(l8).merge(l7).merge(l5).merge(l4);


//filter for desired PRs
var ROWS = ee.List([27, 28]);
var ls = ls
  .filter(ee.Filter.eq('WRS_PATH', 26))
  .filter(ee.Filter.inList('WRS_ROW', ROWS))
  .filter(ee.Filter.lt('CLOUD_COVER', 10));
  
// Applies scaling factors
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// Masks out saturated pixels
function satQAMask(image) {
  var satQA = image.select('QA_RADSAT');
  var satMask = satQA.eq(0); //all must be non-saturated per pixel
  return image.updateMask(satMask);
}

// Masks out clouds, masks for water
function cfMask(image) {
  var qa = image.select('QA_PIXEL');
  var water = qa.bitwiseAnd(1 << 7); //water bit
  var cloudqa = qa.bitwiseAnd(1 << 1) //
    .where(qa.bitwiseAnd(1 << 2), ee.Image(2)) //
    .where(qa.bitwiseAnd(1 << 3), ee.Image(3)) // clouds
    .where(qa.bitwiseAnd(1 << 4), ee.Image(4)) // cloud shadows
    .where(qa.bitwiseAnd(1 << 5), ee.Image(5)); // snow/ice
  var qaMask = cloudqa.eq(0);
  return image.updateMask(qaMask).updateMask(water);
}

var ls = ls
  .map(applyScaleFactors)
  .map(satQAMask)
  .map(cfMask);
  
ls.aside(print);

// CLIP FUNCTION
function clip(image) {
  var cl_im = image.clip(aoi);
  return cl_im;
}

// mosaic function
function mosaicOneDay(date, mission){
  var today = ee.Date(date);
  var tomorrow = today.advance(1, 'days');
  var oneDay = ls
    .filterDate(today, tomorrow)
    .filterBounds(aoi)
    .filter(ee.Filter.eq('SPACECRAFT_ID', mission));
  var mosOneDay = oneDay
    .mosaic()
    .set({'date': date,
          'mission': mission
    });
  return mosOneDay.clip(aoi);
}

var img1 = mosaicOneDay('2022-05-05', 'LANDSAT_9');
var img2 = mosaicOneDay('2022-06-22', 'LANDSAT_9');
var img3 = mosaicOneDay('2022-07-08', 'LANDSAT_9');
var img4 = mosaicOneDay('2022-08-09', 'LANDSAT_9');
var img5 = mosaicOneDay('2022-10-28', 'LANDSAT_9');
var img7 = mosaicOneDay('2019-04-19', 'LANDSAT_8');
var img8 = mosaicOneDay('2019-05-05', 'LANDSAT_8');
var img9 = mosaicOneDay('2019-05-21', 'LANDSAT_8');
var img10 = mosaicOneDay('2019-06-22', 'LANDSAT_8');
var img11 = mosaicOneDay('2019-07-24', 'LANDSAT_8');
var img12 = mosaicOneDay('2019-09-26', 'LANDSAT_8');
var img13 = mosaicOneDay('2007-05-12', 'LANDSAT_7');
var img14 = mosaicOneDay('2007-06-13', 'LANDSAT_7');
var img15 = mosaicOneDay('2007-06-29', 'LANDSAT_7');
var img16 = mosaicOneDay('2007-07-31', 'LANDSAT_7');
var img17 = mosaicOneDay('2007-08-16', 'LANDSAT_7');
var img18 = mosaicOneDay('1998-05-27', 'LANDSAT_5');
var img19 = mosaicOneDay('1998-08-31', 'LANDSAT_5');
var img20 = mosaicOneDay('1998-09-16', 'LANDSAT_5');
var img21 = mosaicOneDay('1998-10-02', 'LANDSAT_5');



////////////////////////////////////////////////////////////
// 1. Functions for kmeans
////////////////////////////////////////////////////////////

// This function does unsupervised clustering classification 
// input = any image. All bands will be used for clustering.
// numberOfUnsupervisedClusters = tunable parameter for how 
//        many clusters to create.

var afn_Kmeans = function(input, numberOfUnsupervisedClusters,
    defaultStudyArea, nativeScaleOfImage) {

    // Make a new sample set on the input. Here the sample set is 
    // randomly selected spatially. 
    var training = input.sample({
        region: defaultStudyArea,
        scale: nativeScaleOfImage,
        numPixels: 1000
    });

    var cluster = ee.Clusterer.wekaKMeans(
            numberOfUnsupervisedClusters)
        .train(training);

    // Now apply that clusterer to the raw image that was also passed in. 
    var toexport = input.cluster(cluster);

    // The first item is the unsupervised classification. Name the band.
    var clusterUnsup = toexport.select(0).rename(
        'unsupervisedClass');
    return (clusterUnsup);
};

// 1.1 Simple normalization by maxes function.
var afn_normalize_by_maxes = function(img, bandMaxes) {
    return img.divide(bandMaxes);
};

// 1.2 Simple add mean to Band Name function
var afn_addMeanToBandName = (function(i) {
    return i + '_mean';
});

// 1.3 Seed Creation and SNIC segmentation Function
var afn_SNIC = function(imageOriginal, SuperPixelSize, Compactness,
    Connectivity, NeighborhoodSize, SeedShape) {
    var theSeeds = ee.Algorithms.Image.Segmentation.seedGrid(
        SuperPixelSize, SeedShape);
    var snic2 = ee.Algorithms.Image.Segmentation.SNIC({
        image: imageOriginal,
        size: SuperPixelSize,
        compactness: Compactness,
        connectivity: Connectivity,
        neighborhoodSize: NeighborhoodSize,
        seeds: theSeeds
    });
    var theStack = snic2.addBands(theSeeds);
    return (theStack);
};

////////////////////////////////////////////////////////////
// 2. Parameters to function calls
////////////////////////////////////////////////////////////
 
// 2.1. Unsupervised KMeans Classification Parameters
var numberOfUnsupervisedClusters = 4;

// 2.2. Visualization and Saving parameters
// For different images, you might want to change the min and max 
// values to stretch. Useful for images 2 and 3, the normalized images.
var centerObjectYN = true;

// 2.3 Object-growing parameters to change
// Adjustable Superpixel Seed and SNIC segmentation Parameters:
// The superpixel seed location spacing, in pixels.
var SNIC_SuperPixelSize = 16;
// Larger values cause clusters to be more compact (square/hexagonal). 
// Setting this to 0 disables spatial distance weighting.
var SNIC_Compactness = 0;
// Connectivity. Either 4 or 8. 
var SNIC_Connectivity = 4;
// Either 'square' or 'hex'.
var SNIC_SeedShape = 'square';

// 2.4 Parameters that can stay unchanged
// Tile neighborhood size (to avoid tile boundary artifacts). Defaults to 2 * size.
var SNIC_NeighborhoodSize = 2 * SNIC_SuperPixelSize;

//////////////////////////////////////////////////////////
// 3. Statements
//////////////////////////////////////////////////////////

// 3.1  Selecting Image to Classify 
var originalImage = img1;//no 6
var date = originalImage.get('date');
var mission = originalImage.get('mission');
var nativeScaleOfImage = 30;
var threeBandsToDraw = ['SR_B4', 'SR_B3', 'SR_B2'];
var bandsToUse = ['SR_B4', 'SR_B3', 'SR_B2'];
var bandMaxes = [1, 1, 1];
var drawMin = 0;
var drawMax = 0.3;
var defaultStudyArea = aoi;
var zoomArea = aoi;

Map.addLayer(originalImage.select(threeBandsToDraw), {
  min: 0,
  max: 0.3
}, '3.1 ' + mission.getInfo() + ' ' + date.getInfo(), true, 1);

////////////////////////////////////////////////////////////
// 4. Image Preprocessing 
////////////////////////////////////////////////////////////

var clippedImageSelectedBands = originalImage.clip(defaultStudyArea)
    .select(bandsToUse);
var ImageToUse = afn_normalize_by_maxes(clippedImageSelectedBands,
    bandMaxes);


////////////////////////////////////////////////////////////
// 5. SNIC Clustering
////////////////////////////////////////////////////////////

// This function returns a multi-banded image that has had SNIC
// applied to it. It automatically determine the new names 
// of the bands that will be returned from the segmentation.

var SNIC_MultiBandedResults = afn_SNIC(
    ImageToUse,
    SNIC_SuperPixelSize,
    SNIC_Compactness,
    SNIC_Connectivity,
    SNIC_NeighborhoodSize,
    SNIC_SeedShape
);

var SNIC_MultiBandedResults = SNIC_MultiBandedResults
    .reproject('EPSG:3857', null, nativeScaleOfImage);

var theSeeds = SNIC_MultiBandedResults.select('seeds');

var bandMeansToDraw = threeBandsToDraw.map(afn_addMeanToBandName);

var clusterMeans = SNIC_MultiBandedResults.select(bandMeansToDraw);

////////////////////////////////////////////////////////////
// 6. Execute Classifications
////////////////////////////////////////////////////////////

// 6.1 Per Pixel Unsupervised Classification for Comparison
var PerPixelUnsupervised = afn_Kmeans(ImageToUse,
    numberOfUnsupervisedClusters, defaultStudyArea,
    nativeScaleOfImage);
Map.addLayer(PerPixelUnsupervised.select('unsupervisedClass')
    .randomVisualizer(), {}, '6.1 Per-Pixel Unsupervised', true, 0
);
print('6.1b Per-Pixel Unsupervised Results:', PerPixelUnsupervised);

// 6.2 SNIC Unsupervised Classification for Comparison
var bandMeansNames = bandsToUse.map(afn_addMeanToBandName);

var meanSegments = SNIC_MultiBandedResults.select(bandMeansNames);
var SegmentUnsupervised = afn_Kmeans(meanSegments,
    numberOfUnsupervisedClusters, defaultStudyArea,
    nativeScaleOfImage)
    .select('unsupervisedClass').add(1).int8()
    .set({'mission': originalImage.get('mission'),
      'date': originalImage.get('date')});
Map.addLayer(SegmentUnsupervised.randomVisualizer(), {},
    '6.3 SNIC Clusters Unsupervised', true, 0);
print('6.3b Per-Segment Unsupervised Results:', SegmentUnsupervised);

////////////////////////////////////////////////////////////
// 7. Zoom if requested
////////////////////////////////////////////////////////////

if (centerObjectYN === true) {
    Map.centerObject(zoomArea, 10);
}

////////////////////////////////////////////////////////////
// 8. Export raster to drive
////////////////////////////////////////////////////////////

// Set the export parameters
var exportParams = {
  driveFolder: 'Superior_unsup_kmean_GEEout',
  crs: 'EPSG:4326',
  scale: 30,
  region: aoi
};

// Export the image to Google Drive
Export.image.toDrive({
  image: SegmentUnsupervised,
  description: originalImage.get('mission').getInfo() + '_' + originalImage.get('date').getInfo() + '_SNIC_kmeans',
  folder: exportParams.driveFolder,
  crs: exportParams.crs,
  scale: exportParams.scale,
  region: exportParams.region
});
