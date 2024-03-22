import ee

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

# function to apply scaling factors to LS5/7
def applyScaleFactors(image):
    """
    Applies scaling factors to the optical and thermal bands of an image for Landsat 5/7.

    Args:
        image (ee.Image): The earth engine image to apply the scaling factors to.

    Returns:
        ee.Image: The earth engine image with the re-scaled bands.
    """
    opticalBands = image.select("SR_B.").multiply(0.0000275).add(-0.2)
    thermalBands = image.select("ST_B.").multiply(0.00341802).add(149.0)
    opac = image.select('SR_ATMOS_OPACITY').multiply(0.0001)
    return (image
        .addBands(opticalBands, None, True)
        .addBands(thermalBands, None, True)
        .addBands(opac, None, True))

# function to apply scaling factors to LS8/9
def applyScaleFactors_89(image):
    """
    Applies scaling factors to the optical and thermal bands of an image for Landsat 8/9.

    Args:
        image (ee.Image): The earth engine image to apply the scaling factors to.

    Returns:
        ee.Image: The earth engine image with the scaled bands.
    """
    opticalBands = image.select("SR_B.").multiply(0.0000275).add(-0.2)
    thermalBands = image.select("ST_B..").multiply(0.00341802).add(149.0)
    return (image
        .addBands(opticalBands, None, True)
        .addBands(thermalBands, None, True))

# function to apply scaling factors to Sentinel 2
def applyScaleFactors_S2(image):
    """
    Applies scaling factors to the optical bands of Sentinel 2.

    Args:
        image (ee.Image): The earth engine image to apply the scaling factors to.

    Returns:
        ee.Image: The earth engine image with the scaled bands.
    """
    opticalBands = image.select("B.").multiply(0.0001)
    opticalBands2 = image.select("B..").multiply(0.0001)
    return (image
        .addBands(opticalBands, None, True)
        .addBands(opticalBands2, None, True))

# function to mask saturated pixels
def apply_radsat_mask(image):
    """
    Masks saturated pixels in an image.

    Args:
        image (ee.Image): The earth engine image to mask.

    Returns:
        ee.Image: The earth engine masked image.
    """
    radsat = image.select('QA_RADSAT').eq(0)
    return image.updateMask(radsat)


# function to mask saturated/defective pixels in Sentinel images
def apply_sat_defect_mask(image):
    """
    Masks saturated and defective pixels in an image according to the SCL band

    Args:
        image (ee.Image): The earth engine Sentinel image to mask.

    Returns:
        ee.Image: The earth engine Sentinel masked image.
    """
    sat_def = image.select('SCL').neq(1)
    return image.updateMask(sat_def)


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


# function to flag cirrus pixels
def flag_cirrus_conf(image):
  """
  Flags pixels in an image where the cirrus confidence is high and provideds
  the classified cirurs confidence for Landsat 8 and 9.

  Args:
      image (ee.Image): The earth engine image to flag the pixels in.

  Returns:
      ee.Image: The image with the added bands for high cirrus confidence and cirrus confidence.
  """
  qa = image.select('QA_PIXEL')
  # where cirrus confidence is high
  cirrus_high = qa.bitwiseAnd(1 << 2).rename('high_conf_cirrus')
  cirrus_conf = extract_qa_bits(qa, 14, 16, 'cirrus_conf')
  return image.addBands(cirrus_high).addBands(cirrus_conf)

# function to flag cirrus and opaque cloud pixels in Sentinel 2
def flag_cirrus_opaque(image):
  """
  Flags pixels in an image where the the QA60 band indicates cirrus or opaque cloud presence.

  Args:
      image (ee.Image): The earth engine image to flag the pixels in.

  Returns:
      ee.Image: The image with the to add a cirrus flag to.
  """
  qa = image.select('QA60')
  # where cirrus confidence is high
  cirrus_high = qa.bitwiseAnd(1 << 11).rename('cirrus')
  cirrus_conf = qa.bitwiseAnd(1 << 10).rename('opaque_cloud')
  return image.addBands(cirrus_high).addBands(cirrus_conf)
