# a verbose version of this script exists in the pySetup.Rmd file

library('reticulate')
try(install_miniconda())
py_install(c('earthengine-api'))

#create a conda environment named 'apienv' with the packages flask and requests-oauthlib
conda_create(envname = file.path(py_env_dir, 'env/'),
             packages = c('earthengine-api'))

Sys.setenv(RETICULATE_PYTHON = file.path(py_env_dir, 'env/bin/python/'))
use_condaenv(file.path(py_env_dir, 'env/'))

#check install
py_install(packages = c('earthengine-api'), envname = file.path(py_env_dir, 'env/'))
