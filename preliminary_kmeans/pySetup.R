# a verbose version of this script exists in the pySetup.Rmd file

library('reticulate')

try(install_miniconda())
py_install(c('xarray', 'rasterio', 'pandas', 'rioxarray'))

#grab your current WD
dir = getwd()

#create a conda environment named 'apienv' with the packages you need
conda_create(envname = file.path(dir, 'env'),
             packages = c('xarray', 'pandas', 'rasterio', 'rioxarray'))
Sys.setenv(RETICULATE_PYTHON = file.path(dir, 'env/bin/python/'))
use_condaenv(file.path(dir, "env/"))

#print the configuration
py_config()

#check install
py_install(packages = c('xarray', 'pandas', 'rasterio', 'rioxarray'), envname = file.path(dir, 'env/'))
