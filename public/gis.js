import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE='https://tiles.openfreemap.org/styles/bright';
const RASTER_URL=new URL('./data/fao-salinity-indicator.png',import.meta.url).href;
const EXTENT=[[-180,85.05112878],[180,85.05112878],[180,-85.05112878],[-180,-85.05112878]];

export function initGis(){
 const status=document.getElementById('gis-error');
 const coords=document.getElementById('gis-coordinates');
 const toggle=document.getElementById('gis-layer');
 const opacity=document.getElementById('gis-opacity');
 maplibregl.setWorkerUrl(workerUrl);
 let map;
 try{map=new maplibregl.Map({container:'gis-map',style:MAP_STYLE,center:[44,33],zoom:4.5,maxZoom:16,attributionControl:true});}
 catch(error){status.textContent='The map could not start in this browser. The public data source is linked above.';return;}
 map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
 map.on('load',()=>{
  map.addSource('fao-indicator',{type:'image',url:RASTER_URL,coordinates:EXTENT});
  map.addLayer({id:'fao-indicator-overlay',type:'raster',source:'fao-indicator',paint:{'raster-opacity':Number(opacity.value)/100,'raster-resampling':'linear'}});
 });
 map.on('click',event=>{
  coords.textContent=`Map location: ${event.lngLat.lat.toFixed(3)}° N, ${event.lngLat.lng.toFixed(3)}° E · raster colour is not a local ECe measurement`;
 });
 map.on('error',event=>{if(event.error)status.textContent='Map tiles or indicator could not load. Check your connection and try again.'});
 toggle.addEventListener('change',()=>{
  if(map.getLayer('fao-indicator-overlay'))map.setLayoutProperty('fao-indicator-overlay','visibility',toggle.checked?'visible':'none');
 });
 opacity.addEventListener('input',()=>{
  if(map.getLayer('fao-indicator-overlay'))map.setPaintProperty('fao-indicator-overlay','raster-opacity',Number(opacity.value)/100);
 });
 document.getElementById('gis-world').addEventListener('click',()=>map.flyTo({center:[20,15],zoom:1.6,duration:800}));
 document.getElementById('gis-iraq').addEventListener('click',()=>map.flyTo({center:[44,33],zoom:4.5,duration:800}));
 return map;
}
