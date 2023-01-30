# Landsat and MODIS stack inventory

The scripts landsat_availability.Rmd and MODIS_availability use the Python GEE API to access and process data inventory for our AOI.

# HLS stack inventory

This script (HLS_inventory.Rmd) facilitates the access and processing of HLS (Harmonized Landsat-Sentinel) images from NASA'S LP DAAC (Land Processes Distributed Active Archive Center). The access and filtering workflow is modeled after the tutorials presented in the `HLS_Tutorial_R` and `CMR STAC API` [resources provided by the LP DAAC](https://git.earthdata.nasa.gov/projects/LPDUR).

# pySetup

The two pySetup files are the same, but one is the verbose Rmd, and the other is the `source`-able R file. These set up a conda virtual environment in R using the reticulate package.
