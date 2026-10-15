'use client';
import {useEffect, useRef} from 'react';
import type {AnimationItem} from 'lottie-web';
import {ArrowDown, ArrowUpRight, Clock, Pizza, Sandwich} from 'lucide-react';

const clamp = (n:number) => Math.max(0, Math.min(1,n));
export function ScrollFoodHero({onOrder, deliveryFee, minimumOrder}:{onOrder:()=>void;deliveryFee:number;minimumOrder:number}) {
 const section=useRef<HTMLElement>(null);
 const scene=useRef<HTMLDivElement>(null);
 const burger=useRef<HTMLDivElement>(null);
 const pizza=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=section.current, frame=scene.current;
  if(!root||!frame||!burger.current||!pizza.current)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const abort=new AbortController();
  const players:AnimationItem[]=[];
  const available=new Set<AnimationItem>();
  let disposed=false, raf=0;
  const draw=()=>{
   raf=0;
   const top=parseFloat(getComputedStyle(frame).top)||0;
   const still=media.matches||window.innerHeight<=620;
   const progress=still?1:clamp((top-root.getBoundingClientRect().top)/Math.max(1,root.offsetHeight-frame.offsetHeight));
   root.style.setProperty('--food-progress',String(progress));
   root.style.setProperty('--pizza-turn',`${still?0:clamp((progress-.62)/.38)*80}deg`);
   players.forEach((player,index)=>{
    if(available.has(player))player.goToAndStop(index===0?(still?116:12+progress*104):(still?76:18+clamp(progress/.72)*58),true);
   });
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(draw);};
  const resize=new ResizeObserver(schedule);resize.observe(root);resize.observe(frame);
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  media.addEventListener('change',schedule);
  Promise.all([
   import('lottie-web'),
   fetch('/animations/burger.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Burger asset unavailable');return r.json();}),
   fetch('/animations/pizza.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Pizza asset unavailable');return r.json();}),
  ]).then(([{default:lottie},burgerData,pizzaData])=>{
   if(disposed)return;
   [burger.current!,pizza.current!].forEach((container,index)=>{
    const player=lottie.loadAnimation({container,renderer:'svg',autoplay:false,loop:false,animationData:index===0?burgerData:pizzaData,rendererSettings:{preserveAspectRatio:'xMidYMid meet'}});
    players.push(player);
    player.addEventListener('DOMLoaded',()=>{
     if(disposed)return;
     available.add(player);container.parentElement?.classList.add('food-loaded');draw();
    });
   });
  }).catch(()=>{/* Keep the illustrated fallback and order button usable. */});
  draw();
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(raf);resize.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);media.removeEventListener('change',schedule);players.forEach(player=>player.destroy());burger.current?.parentElement?.classList.remove('food-loaded');pizza.current?.parentElement?.classList.remove('food-loaded');};
 },[]);
 return <section ref={section} className="food-hero" aria-labelledby="food-hero-title">
  <div ref={scene} className="food-scene">
   <div className="food-hero-top"><span>QUETTA · AIRPORT ROAD</span><span><Clock size={13}/> OPEN 24/7</span></div>
   <div className="food-headline"><span className="eyebrow">BUILT FOR YOUR CRAVINGS</span><h1 id="food-hero-title">Big cravings. <em>One place.</em></h1><p>Pizza, burgers & your favourites. All day. All night.</p></div>
   <div className="food-stage" aria-hidden="true">
    <div className="food-art food-burger"><div className="food-orbit"/><Sandwich className="food-fallback"/><div ref={burger} className="food-player"/><span className="food-caption">STACKED WITH FLAVOUR</span></div>
    <div className="food-brand"><span className="food-star">✦</span><img src="/logo.png" alt=""/><span className="food-brand-note">THE REAL ONE.</span></div>
    <div className="food-art food-pizza"><div className="food-orbit"/><Pizza className="food-fallback"/><div ref={pizza} className="food-player"/><span className="food-caption">A SLICE OF THE GOOD STUFF</span></div>
   </div>
   <div className="food-hero-action"><button className="primary" onClick={onOrder}>Order now <ArrowUpRight size={19}/></button><p>Across Quetta · Rs. {deliveryFee.toLocaleString('en-PK')} delivery · Rs. {minimumOrder.toLocaleString('en-PK')} minimum</p></div>
   <div className="food-scroll-hint"><ArrowDown size={14}/><span>SCROLL TO BUILD YOUR CRAVING</span><div><i/></div></div>
  </div>
 </section>;
}
