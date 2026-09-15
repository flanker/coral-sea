import type {Point,SearchPlan}from'./model';
/** Coordinates on the sphere; bounds come from the historical search record, never hidden units. */
export function searchBoundary(center:Point,plan:SearchPlan):Point[]|null{
 if(!plan.arc||!plan.radiusNM)return null;
 const rad=Math.PI/180,lat=center[1]*rad,lon=center[0]*rad;
 const steps=Math.max(12,Math.ceil(plan.arc/10)),ring:Point[]=[];
 for(let i=0;i<=steps;i++){
  const bearing=(plan.bearing-plan.arc/2+plan.arc*i/steps)*rad;
  const range=plan.southRadiusNM&&Math.cos(bearing)<0?plan.southRadiusNM:plan.radiusNM;
  const distance=range/3440.065;
  const y=Math.asin(Math.sin(lat)*Math.cos(distance)+Math.cos(lat)*Math.sin(distance)*Math.cos(bearing));
  const x=lon+Math.atan2(Math.sin(bearing)*Math.sin(distance)*Math.cos(lat),Math.cos(distance)-Math.sin(lat)*Math.sin(y));
  ring.push([x/rad,y/rad]);
 }
 if(plan.arc<360)return[center,...ring,center];
 ring.push(ring[0]);return ring;
}
