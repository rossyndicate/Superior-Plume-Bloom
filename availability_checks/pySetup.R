# a verbose version of this script exists in the pySetup.Rmd file

library('reticulate')
library('tidyverse')
try(install_miniconda())
py_install(c('earthengine-api'))

#grab your current WD
dir = getwd()
#create a conda environment named 'apienv' with the packages flask and requests-oauthlib
conda_create(envname = file.path(dir, 'availability_checks/env'),
             packages = c('earthengine-api'))
# Set correct path based on OS
if (grepl('win', osVersion, ignore.case = T) == T ){
  path_pat = 'availability_checks/env/python.exe'
  message('Windows OS detected.')
} else if (grepl('mac', osVersion, ignore.case = T) == T ){
  path_pat = 'availability_checks/env/bin/python/'
  message('Mac OS detected')
} else {
  message('OS path pattern not detected. Please store OS path pattern manually.')
}
Sys.setenv(RETICULATE_PYTHON = file.path(dir, path_pat))
use_condaenv("availability_checks/env/")
#print the configuration
py_config()

#check install
py_install(packages = c('earthengine-api'), envname = 'availability_checks/env/')
