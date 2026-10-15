# GIS with public data: research and boundary

Research pass: October 2026. The user cannot collect field measurements; the GIS feature must use only public data and must not invent field-scale ECe, SAR or groundwater-depth values.

## Data options

| Source | Role | Limitation |
| --- | --- | --- |
| [FAO GDVI Soil salinity indicator](https://data.fao.org/catalog/dataset/83b17a94-ee3e-4163-ab60-418a2451950a) | Available global public context layer, CC BY 4.0. Original raster is 0.05° and published June 2026. Used in the site. | The stored values observed are 0–1 while catalog metadata says `%`; don't interpret them as lab ECe, calibrated percentage, or salinity classes. Colour visualization is coarser and illustrative. |
| [FAO GSASmap](https://www.fao.org/soils-portal/data-hub/soil-maps-and-databases/global-map-of-salt-affected-soils/en/) | Published EC, ESP, pH and salt-affected soil classes for 0–30 and 30–100 cm. Strong regional reference when the country is covered. | FAO reports coverage gaps, including Near East/North Africa. Do not present gaps or coarse cells as field measurements. |
| [ISRIC/Ivushkin global salinity maps](https://gee-community-catalog.org/projects/global_salinity/) | Public CC BY 4.0 modelled ECe maps for 1986–2016, possible historic change/context layer. | Last map 2016; public ISRIC file server was unreachable during this pass, so no live layer was added. |
| [Sun et al. 1980–2024 ECe and ESP](https://zenodo.org/records/16430116) | Promising 1 km yearly public GeoTIFFs with ECe and ESP, potentially more relevant than the GDVI indicator. | Zenodo download could not be verified here. Verify license, units/scale, uncertainty, depth and area coverage before integration. Not field-resolution. |
| [Sentinel-2 SR](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED) | Open optical imagery/vegetation context and seasonal change. | Salt effects are confounded with moisture, crop, phenology, soil, water stress. Not a direct ECe map. |
| [AlphaEarth Satellite Embedding](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_SATELLITE_EMBEDDING_V1_ANNUAL) | 10 m annual, 64-dimensional features for *future* locally validated inference. | Not salinity; without measured salinity labels there is no justified ECe regression model. |

## Decision

Begin with an honest **public regional screening layer** and a base map. Do not transfer map values into the workbook, which requires field/lab ECe and other measurements. The existing scenario workbook still runs its own example defaults. A later release should prioritize verified quantitative public ECe/ESP coverage (e.g. the Zenodo record, after inspecting its data and uncertainty), but label it as modelled regional data with its year, depth and resolution.

[A USDA assessment](https://www.ars.usda.gov/research/publications/publication/?seqNo115=325699) found greater remote-sensing errors at low ECe and warned against using those estimates for within-field crop-selection decisions. This reinforces the separation of map screening and the workbook's management calculations.
