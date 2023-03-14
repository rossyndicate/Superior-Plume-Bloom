# eePlumB

The purpose of this directory and the associated workflow is to label Plumes and Blooms from satellite imagery in freshwater lakes. We use the methodology and workflow established in the [Global Rivers Obstruction Database](https://github.com/GlobalHydrologyLab/GROD) (GROD) to create a training dataset of labeled pixels for image segmentation of Lake Superior's western basin as an example use case.

## Lake Superior - Why label plumes and blooms?
Cyanobacteria blooms are one of the most significant management challenges in the Great Lakes today. Recurring blooms of varying toxicity are commonly observed in four of the Great Lakes, and the fifth, Lake Superior, has experienced intermittent nearshore blooms since 2012. The recent advent of cyanobacterial blooms in Lake Superior is disconcerting, given the highly valued, pristine water quality of the large lake. Many fear the appearance of blooms portend a very different future for Lake Superior. As a public resource, the coastal water quality of Lake Superior has tremendous economic, public health, and environmental value, and therefore, preventing cyanobacterial blooms in Lake Superior is a high-priority management challenge. 

Lake Superior is a large lake, and relying on human observations of blooms restricts observations to near-shore locations. Remote sensing has the potential to catalog spatial and temporal extent of surface blooms. In this project, we are attempting to use optical imagery from Lake Superior to delineate surface plumes (sediment) and blooms (algae). It is likely that these two surface features occur at the same time (i.e a rainstorm may lead to a sediment plume from a river and subsequently an algal boom). 

To train computer algorithms to detect these features in satellite images we need a training dataset. That's where we need your help! In this exercise, we ask you to participate in identify changes in surface conditions in the western arm of Lake Superior. All you need is a computer and your eyes. 


## Future plans

The GROD workflow (folders 1_user_interface_script, 2_data_ingestion) will be adapted to using all available scenes instead of the most recent cloud-free scene.

Z_PrepAOI: auto upload of ee.FeatureCollections into Assets.

