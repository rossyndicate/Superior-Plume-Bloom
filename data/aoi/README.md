## superior-plume-bloom/data/aoi

This directory contains shapefiles used and created during various points within this workflow.

The shapefile in the NHDPlusHR folder is the waterbody for HUC 0418 limited to FCode 390. This was obtained directly from the [National Map Download IDE](https://apps.nationalmap.gov/downloader/#/) and processed in QGIS.

Files in the `tiledAOI` folder were created in the script `eePlumB/A_PrepAOI/01_TileAOI.Rmd`. Tiles 1-3 were edited manually in QGIS to remove the harbor from tile 1, and bays from tiles 2 and 3. These edited files have a suffix of `_noharbor` or `_no_bay`.

The shapefiles `Superior_AOI_modeling` and `Superior_AOI_minus_shoreline_contamination` were created in the scripts `eePlumB/A_PrepAOI/02_Modeling_AOI.Rmd` and `modeling/01_Shoreline_Contamination.Rmd` respectively. The tiles were manually edited as described above between running these two scripts.
