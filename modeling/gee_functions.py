# modules
import ee
import time

# feature collections
aoi_ee = ee.FeatureCollection('projects/ee-ross-superior/assets/aoi/Superior_AOI_modeling')
aoi_no_sc_ee = ee.FeatureCollection('projects/ee-ross-superior/assets/aoi/Superior_AOI_minus_shoreline_contamination')

# integer classes to new classes (this is the same for both 3 and 5-group classes)
fromlist = [0,1,2,3,4]
tolist = [1,2,3,4,5]

####--------------------------####
#### helper functions         ####
####--------------------------####

# function to split QA bits
def extract_qa_bits(qa_band, start_bit, end_bit, band_name):
  """
  Extracts specified quality assurance (QA) bits from a QA band. This function originated
  from https://calekochenour.github.io/remote-sensing-textbook/03-beginner/chapter13-data-quality-bitmasks.html

  Args:
      qa_band (ee.Image): The earth engine image QA band to extract the bits from.
      start_bit (int): The start bit of the QA bits to extract.
      end_bit (int): The end bit of the QA bits to extract (not inclusive)
      band_name (str): The name to give to the output band.

  Returns:
      ee.Image: A single band image of the extracted QA bit values.
  """
  # Initialize QA bit string/pattern to check QA band against
  qa_bits = 0
  # Add each specified QA bit flag value/string/pattern to the QA bits to check/extract
  for bit in range(end_bit):
    qa_bits += (1 << bit)
  # Return a single band image of the extracted QA bit values
  return (qa_band
    # Rename output band to specified name
    .select([0], [band_name])
    # Check QA band against specified QA bits to see what QA flag values are set
    .bitwiseAnd(qa_bits)
    # Get value that matches bitmask documentation
    # (0 or 1 for single bit,  0-3 or 0-N for multiple bits)
    .rightShift(start_bit))


## Remove geometries
def remove_geo(image):
  """ Funciton to remove the geometry from an ee.Image
  
  Args:
      image: ee.Image of an ee.ImageCollection
      
  Returns:
      ee.Image with the geometry removed
  """
  return image.setGeometry(None)


##Function for limiting the max number of tasks sent to
#earth engine at one time to avoid time out errors
def maximum_no_of_tasks(MaxNActive, waitingPeriod):
  ##maintain a maximum number of active tasks
  ## initialize submitting jobs
  ts = list(ee.batch.Task.list())
  NActive = 0
  for task in ts:
     if ('RUNNING' in str(task) or 'READY' in str(task)):
         NActive += 1
  ## wait if the number of current active tasks reach the maximum number
  ## defined in MaxNActive
  while (NActive >= MaxNActive):
    time.sleep(waitingPeriod) # if reach or over maximum no. of active tasks, wait for 2min and check again
    ts = list(ee.batch.Task.list())
    NActive = 0
    for task in ts:
      if ('RUNNING' in str(task) or 'READY' in str(task)):
        NActive += 1
  return()


def addImageDate(image):
  mission = image.get('SPACECRAFT_ID')
  date = image.date().format('YYYY-MM-dd')
  missDate = ee.String(mission).cat('_').cat(ee.String(date))
  return image.set('missDate', missDate)


def addImageDateSen(image):
  mission = image.get('SPACECRAFT_NAME')
  date = image.date().format('YYYY-MM-dd')
  missDate = ee.String(mission).cat('_').cat(ee.String(date))
  return image.set('missDate', missDate)


# save each value as its own band and mask
def extract_classes(image):
  cl = image.select('classification')
  cloud = cl.eq(0).rename('cloud').selfMask()
  openWater = cl.eq(1).rename('openWater').selfMask()
  lightNSSed = cl.eq(2).rename('lightNSSed').selfMask()
  OSSed = cl.eq(3).rename('OSSed').selfMask()
  dNSSed = cl.eq(4).rename('dNSSed').selfMask()
  classified = cl.gte(0).rename('classified').selfMask()
  img_addBand = (image.addBands(cloud)
    .addBands(openWater)
    .addBands(lightNSSed)
    .addBands(OSSed)
    .addBands(dNSSed)
    .addBands(classified))
  return img_addBand


# save each value as its own band and mask
def extract_3classes(image):
  cl = image.select('classification')
  cloud = cl.eq(0).rename('cloud').selfMask()
  openWater = cl.eq(1).rename('openWater').selfMask()
  sed = cl.eq(2).rename('sediment').selfMask()
  classified = cl.gte(0).rename('classified').selfMask()
  img_addBand = (image.addBands(cloud)
    .addBands(openWater)
    .addBands(sed)
    .addBands(classified))
  return img_addBand


def classifications_to_one_band(image):
  cl = image.select('classification').clip(aoi_ee.geometry())
  img_classified = (cl
    .remap(fromlist, tolist, defaultValue = -99)
    .rename('reclass'))
  return image.addBands(img_classified)


#Calculate total area of AOI
def calc_area(feat):
  feat_area = feat.geometry().area()
  feat_area_ha = ee.Number(feat_area).divide(1e5)
  return feat.set('area_ha', feat_area_ha)


# clip images to aoi
def clip(image):
  return image.clip(aoi_ee.geometry())


####--------------------------####
#### image-date harmonization ####
####--------------------------####

# function to add date to properties
def set_date(feature):
    """
    Adds a date as a property to a feature for filtering purposes.

    Args:
        feature (ee.Feature): The earth engine feature to add the date property to.

    Returns:
        ee.Feature: The earth engine feature with the added date property.
    """
    date = feature.get('date')
    return feature.set({'system:time_start': ee.Date(date)})


# function to add image mission-date to properties of an image
def addImageDate(image):
    """
    Adds the image date to the image properties.

    Args:
        image (ee.Image): The earth engine image to add the date to.

    Returns:
        ee.Image: The earth engine image with the added date.
    """
    mission = image.get('SPACECRAFT_ID')
    date = image.date().format('YYYY-MM-dd')
    missDate = ee.String(mission).cat('_').cat(ee.String(date))
    return image.set('missDate', missDate)


# function to add image mission-date to properties of an image for Sentinel
def addImageDate_S2(image):
    """
    Adds the image date to the image properties.

    Args:
        image (ee.Image): The earth engine image to add the date to.

    Returns:
        ee.Image: The earth engine image with the added date.
    """
    mission = image.get('SPACECRAFT_NAME')
    date = image.date().format('YYYY-MM-dd')
    missDate = ee.String(mission).cat('_').cat(ee.String(date))
    return image.set('missDate', missDate)


####--------------------------####
#### Landsat shared functions ####
####--------------------------####
# function to mask saturated pixels
def apply_radsat_mask(image):
    """
    Masks saturated pixels in a Landsat image.

    Args:
        image (ee.Image): The Landast earth engine image to mask.

    Returns:
        ee.Image: The Landast earth engine masked image.
    """
    radsat = image.select('QA_RADSAT').eq(0)
    return image.updateMask(radsat)


# function to apply scaling factors to Landsat images
def applyScaleFactors(image):
    """
    Applies scaling factors to the optical bands of an image for any Landsat 4-9 image.

    Args:
        image (ee.Image): The earth engine image to apply the scaling factors to.

    Returns:
        ee.Image: The earth engine image with the re-scaled bands.
    """
    opticalBands = image.select("SR_B.").multiply(0.0000275).add(-0.2)
    return (image
        .addBands(opticalBands, None, True))


# Bit 1: Dilated Cloud
# Bits 8-9: Cloud Confidence
# 0: None
# 1: Low
# 2: Medium
# 3: High
# Bits 10-11: Cloud Shadow Confidence
# 0: None
# 1: Low
# 2: Medium
# 3: High
# Bits 12-13: Snow/Ice Confidence
# 0: None
# 1: Low
# 2: Medium
# 3: High
# Bits 14-15: Cirrus Confidence
# 0: None
# 1: Low
# 2: Medium
# 3: High

# function to flag cirrus pixels
def flag_qa_conf(image):
  """
  Flags pixels in an image where the cirrus confidence is high and provideds
  the classified cirurs confidence for Landsat images.

  Args:
      image (ee.Image): The earth engine image to flag the pixels in.

  Returns:
      ee.Image: The image with the added band for qa bit confidence, 1 is low, 3 
      is high, except dialated cloud which is 0 none, 1 present
  """
  qa = image.select('QA_PIXEL')
  # where cirrus confidence is high
  cirrus_conf = extract_qa_bits(qa, 14, 16, 'cirrus_conf')
  snowice_conf = extract_qa_bits(qa, 12, 14, 'snowice_conf')
  cloudshad_conf = extract_qa_bits(qa, 10, 12, 'cloudshad_conf')
  cloud_conf = extract_qa_bits(qa, 8, 10, 'cloud_conf')
  dialated = extract_qa_bits(qa, 1, 2, 'dialated_cloud')
  return (image
    .addBands(cirrus_conf)
    .addBands(snowice_conf)
    .addBands(cloudshad_conf)
    .addBands(cloud_conf)
    .addBands(dialated))
    
def mask_qa_flags(image):
  qa = image.select('QA_PIXEL')
  # where qa confidence is high
  cirrus_conf = extract_qa_bits(qa, 14, 16, 'cirrus_conf').eq(3)
  snowice_conf = extract_qa_bits(qa, 12, 14, 'snowice_conf').eq(3)
  cloudshad_conf = extract_qa_bits(qa, 10, 12, 'cloudshad_conf').eq(3)
  cloud_conf = extract_qa_bits(qa, 8, 10, 'cloud_conf').eq(3)
  # create a mask where the qa is not high
  mask = (cirrus_conf.eq(0)
    .And(snowice_conf.eq(0))
    .And(cloudshad_conf.eq(0))
    .And(cloud_conf.eq(0)))
  return (image.updateMask(mask))


####--------------------------####
#### Landsat 5/7 functions    ####
####--------------------------####
def mask_high_atmos_opac(image):
  atmos = image.select("SR_ATMOS_OPACITY").multiply(0.001)
  mask = atmos.lt(0.3)
  return image.updateMask(mask)



####--------------------------####
#### Landsat 8/9 functions    ####
####--------------------------####

# function to mask high aerosol pixels
def mask_high_aerosol(image):
  qa_aero = image.select("SR_QA_AEROSOL")
  aero = extract_qa_bits(qa_aero, 6, 8, 'aero_level')
  aero_mask = aero.lt(3)
  return image.updateMask(aero_mask)
 

####--------------------------####
#### Sentinel 2 functions     ####
####--------------------------####

# function to rename S2 bands for differentiation between user-pull and re-pull
def rename_S2_band(bn):
  """
  Adds the string "SR_" to the front of a band name for use in changing the names
  of bands in the Sentinel pull to retain labeler data.
  
  Args:
      bn (ee.String): The ee.String() to add prefix to
      
  Returns:
      ee.String(): An ee.String with the prefix "SR_"
  """
  return ee.String("SR_").cat(bn)


# function to apply scaling factors to Sentinel 2
def applyScaleFactors_S2(image):
    """
    Applies scaling factors to the optical bands of Sentinel 2.

    Args:
        image (ee.Image): The earth engine image to apply the scaling factors to.

    Returns:
        ee.Image: The earth engine image with the scaled bands only.
    """
    opticalBands = image.select("B.*").multiply(0.0001)
    old_names = opticalBands.bandNames()
    new_names = old_names.map(rename_S2_band)
    opticalBands = opticalBands.select(old_names, new_names)
    keep = image.bandNames().removeAll(old_names)
    return (image
        .select(keep)
        .addBands(opticalBands, None, True))


# function to mask saturated/defective pixels in Sentinel images
def apply_sat_defect_mask(image):
    """
    Masks saturated and defective pixels in an image according to the SCL band
    in Sentinel 2 images

    Args:
        image (ee.Image): The earth engine Sentinel image to mask.

    Returns:
        ee.Image: The earth engine Sentinel masked image.
    """
    sat_def = image.select('SCL').neq(1)
    return image.updateMask(sat_def)


def add_qa_info_s2(image):
  """
  Parses the SCL classes into separate 1/0 presence/absence columns in 
  Sentinel 2 images
  
  Args:
      image (ee.Image): The earth engine Sentinel image to mask.
        
  Returns:
      ee.Image: The earth engine image with additional binary columns

  """
  scl = image.select('SCL')
  dark = scl.eq(2).rename('dark_pixel')
  cloudShad = scl.eq(3).rename('cloud_shadow')
  water = scl.eq(6).rename('water')
  lowProbCloud = scl.eq(7).rename('low_prob_cloud')
  medProbCloud = scl.eq(8).rename('med_prob_cloud')
  hiProbCloud = scl.eq(9).rename('hi_prob_cloud')
  cirrus = scl.eq(10).rename('cirrus_scl')
  snowice = scl.eq(11).rename('snow_ice')
  return (image
    .addBands(dark)
    .addBands(cloudShad)
    .addBands(water)
    .addBands(lowProbCloud)
    .addBands(medProbCloud)
    .addBands(hiProbCloud)
    .addBands(cirrus)
    .addBands(snowice))


def mask_SCL_qa(image):
  """
  Masks an image according to the SCL classification
  
  Args:
      image (ee.Image): The earth engine Sentinel image to mask.
        
  Returns:
      ee.Image: The earth engine image masked to exclude cirrus, snow/ice, cloud
      shadow, dark pixles, and med/high prob cloud.

  """
  scl = image.select('SCL')
  dark = scl.eq(2).rename('dark_pixel')
  cloudShad = scl.eq(3).rename('cloud_shadow')
  medProbCloud = scl.eq(8).rename('med_prob_cloud')
  hiProbCloud = scl.eq(9).rename('hi_prob_cloud')
  cirrus = scl.eq(10).rename('cirrus_scl')
  snowice = scl.eq(11).rename('snow_ice')
  mask = (dark.eq(0)
    .And(cloudShad.eq(0))
    .And(medProbCloud.eq(0))
    .And(hiProbCloud.eq(0))
    .And(cirrus.eq(0))
    .And(snowice.eq(0)))
  return image.updateMask(mask)

# Bit 10: Opaque clouds
# 0: No opaque clouds
# 1: Opaque clouds present
# Bit 11: Cirrus clouds
# 0: No cirrus clouds
# 1: Cirrus clouds present

# function to flag cirrus and opaque cloud pixels in Sentinel 2
def flag_cirrus_opaque(image):
  """
  Flags pixels in an image where the the QA60 band indicates cirrus or opaque 
  cloud presence in Sentinel 2 images

  Args:
      image (ee.Image): The earth engine image to flag the pixels in.

  Returns:
      ee.Image: The image with the to add a cirrus flag to.
  """
  qa = image.select('QA60')
  # where cirrus confidence is high
  cirrus = extract_qa_bits(qa, 11, 12, 'cirrus')
  opaque = extract_qa_bits(qa, 10, 11, 'opaque')
  return image.addBands(cirrus).addBands(opaque)


def mask_cirrus_opaque(image):
  """
  Masks pixels in an image where the the QA60 band indicates cirrus or opaque 
  cloud presence in Sentinel 2 images

  Args:
      image (ee.Image): The earth engine image to mask the pixels in.

  Returns:
      ee.Image: The image with pixels masked
  """
  qa = image.select('QA60')
  # where cirrus confidence is high
  cirrus = extract_qa_bits(qa, 11, 12, 'cirrus')
  opaque = extract_qa_bits(qa, 10, 11, 'opaque')
  mask = (cirrus.eq(0)
    .And(opaque.eq(0)))
  return image.updateMask(mask)




