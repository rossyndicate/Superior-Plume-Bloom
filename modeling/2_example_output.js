//just a quick vis of the example rasters - first is a satellite image, second is the GTB model applied to it.
var sat_img = ee.Image('projects/ee-ross-superior/assets/example_output/L9_2022-05-05');
var sat_class = ee.Image('projects/ee-ross-superior/assets/example_output/class_L9_2022-05-05');

var sat_viz = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0.0,
  max: 0.2,
};

var class_viz = {
  min: 0,
  max: 4,
};

Map.addLayer(sat_img, sat_viz, 'Satellite Image');
Map.addLayer(sat_class, class_viz, 'Classified Image');
Map.centerObject(sat_img, 10)