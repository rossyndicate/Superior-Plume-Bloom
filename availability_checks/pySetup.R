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
Sys.setenv(RETICULATE_PYTHON = file.path(dir, 'availability_checks/env/bin/python/'))
use_condaenv("availability_checks/env/")
#print the configuration
py_config()

#check install
py_install(packages = c('earthengine-api'), envname = 'availability_checks/env/')
