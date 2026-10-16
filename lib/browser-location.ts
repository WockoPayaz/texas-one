export function getOrderLocation():Promise<{latitude:number;longitude:number;accuracy:number;timestamp:number}>{
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(Error('Location is unavailable in this browser. Please use another browser or ask a team member.'));return;}
  navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp}),e=>{
   reject(Error(e.code===1?'Allow location access in your browser settings, then try again. You can also order with a team member.':e.code===3?'Location took too long. Please try again or ask a team member.':'Could not find your location. Enable precise location and try again, or ask a team member.'));
  },{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 });
}
