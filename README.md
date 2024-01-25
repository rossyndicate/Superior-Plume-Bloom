# Superior-Plume-Bloom

Description: code to rasterize presence and absence of sediment plumes and algal blooms over time for the western area of Lake Superior
Contact: B Steele (B dot Steele at colostate dot edu)

This repository is covered by the MIT use license. We request that all downstream uses of this work be available to the public when possible.

Note, there are two methods of authentication used for the Earth Engine workflows.
A major authentication changed in December 2023 v0.1.383, where authentication 
was completed using ee.Authenticate() via python. Prior to that version, authentication
was completed using `earthengine authenticate` at the command line. If you are
attempting to reproduce the code here, but have a version >= v0.1.383, you will
need to use `ee.Authenticate()` instead of the command line `earthengine authenticate`.

## Folder Descriptions

*availability_checks*: scripts to document image availability for our AOI

*data*: contains shapefiles, labels, and model output for the repo

*docs*: this folder contains all files for the deployed site for this repo.

*eePlumB*: scripts to develop the 'Earth Engine Plume and Bloom' (eePlumB) labeling modules

*modeling*: scripts to apply supervised kmeans and create output from models

*reports*: Rmd files for report generation


