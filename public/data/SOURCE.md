# Public GIS layer provenance

`fao-salinity-indicator.png` is a visual derivative of the FAO Global Drought Vulnerability Inventory (GDVI) **Soil salinity indicator** raster (map code `ENV-SSL`), published June 30, 2026.

- Metadata and license (CC BY 4.0): https://data.fao.org/catalog/dataset/83b17a94-ee3e-4163-ab60-418a2451950a
- Original raster: https://storage.googleapis.com/fao-gismgr-gdvi-data/DATA/GDVI/MAP/GDVI.ENV-SSL.tif
- The source grid is 0.05° in WGS84, with NoData -999. Its observed stored values range 0–1. Although the catalog lists the unit as %, that range is **not documented here as a calibration to ECe or a directly interpretable percentage**. This is a relative regional screening image, not a laboratory soil salinity measurement.
- Processing: GDAL warp to EPSG:3857, bounds ±20037508.342789 m, 2048 × 2048, average resampling, then a green–yellow–red colour relief and transparency for NoData. The web image is more generalized than the source raster.
- Colour stops (source values): 0 green, 0.15 light green, 0.35 yellow, 0.6 orange, 1 red. Colours are illustrative, not salinity classes. No analysis thresholds or workbook cell values are derived from this image.

Attribution: FAO GDVI soil salinity indicator, CC BY 4.0. Basemap imagery is provided separately by OpenFreeMap using OpenStreetMap data and its own attribution.
