
options(timeout = 1000)
try(install_miniconda(force = T))

# list python modules
py_modules = c('earthengine-api', 'pandas', 'xarray', 'rasterio', 
               'rioxarray', 'fiona', 'geopandas', 'geemap', 'spatialindex')

py_install(envname = 'env/', 
           packages = py_modules, 
           python_version = "3.8")

# you may need to install geopandas and spatialindex via conda_install:
# conda_install(envname = 'env/',
#               packages = c('geopandas', 'spatialindex'),
#               python_version = '3.8')



#create a conda environment named 'env' with the packages you need
conda_create(envname = file.path(getwd(), 'env'),
             python_version = "3.8",
             packages = py_modules)

# Set correct python path based on OS
if (grepl('win', osVersion, ignore.case = T) == T ){
  path_pat = 'env/python.exe'
  message('Windows OS detected.')
} else if (grepl('mac', osVersion, ignore.case = T) == T ){
  path_pat = 'env/bin/python/'
  message('Mac OS detected')
} else {
  message('OS path pattern not detected. Please store OS path pattern manually.')
}

Sys.setenv(RETICULATE_PYTHON = file.path(getwd(), path_pat))

use_condaenv(file.path(getwd(), "env/"))
