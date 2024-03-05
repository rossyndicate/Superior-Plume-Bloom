import ee

# add date as property to filter by
def set_date(feature):
  date = feature.get('date')
  return feature.set({'system:time_start': ee.Date(date)})


# function to apply scaling factors for 5/7
def applyScaleFactors(image):
  opticalBands = image.select("SR_B.").multiply(0.0000275).add(-0.2)
  thermalBands = image.select("ST_B.").multiply(0.00341802).add(149.0)
  opac = image.select('SR_ATMOS_OPACITY').multiply(0.0001)
  return (image
    .addBands(opticalBands, None, True)
    .addBands(thermalBands, None, True)
    .addBands(opac, None, True))


# function to apply scaling factors for 8/9
def applyScaleFactors_89(image):
  opticalBands = image.select("SR_B.").multiply(0.0000275).add(-0.2)
  thermalBands = image.select("ST_B..").multiply(0.00341802).add(149.0)
  return (image
    .addBands(opticalBands, None, True)
    .addBands(thermalBands, None, True))


# function to mask saturated pixels
def apply_radsat_mask(image):
  radsat = image.select('QA_RADSAT').eq(0)
  return image.updateMask(radsat)


# function to add image date
def addImageDate(image):
  mission = image.get('SPACECRAFT_ID')
  date = image.date().format('YYYY-MM-dd')
  missDate = ee.String(mission).cat('_').cat(ee.String(date))
  return image.set('missDate', missDate)


# function to split QA bits
def extract_qa_bits(qa_band, start_bit, end_bit, band_name):
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
  qa = image.select('QA_PIXEL')
  # where cirrus confidence is high
  cirrus_high = qa.bitwiseAnd(1 << 2).rename('high_conf_cirrus')
  cirrus_conf = extract_qa_bits(qa, 14, 16, 'cirrus_conf')
  return image.addBands(cirrus_high).addBands(cirrus_conf)



