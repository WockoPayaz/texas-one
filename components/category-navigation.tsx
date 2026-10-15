'use client';
import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';

export function CategoryNavigation({categories, selected, onSelect}: {
 categories: string[]; selected: string; onSelect: (category: string) => void;
}) {
 const rail = useRef<HTMLDivElement>(null);
 const [edges, setEdges] = useState({start:true, end:false, overflow:false});
 useEffect(() => {
  const element = rail.current;
  if (!element) return;
  const update = () => setEdges({
   start: element.scrollLeft <= 2,
   end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
   overflow: element.scrollWidth > element.clientWidth + 2,
  });
  update();
  const observer = new ResizeObserver(update);
  observer.observe(element);
  element.addEventListener('scroll', update, {passive:true});
  return () => { observer.disconnect(); element.removeEventListener('scroll', update); };
 }, [categories.join('|')]);
 const behavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' as const : 'smooth' as const;
 const move = (direction:number) => {
  const element = rail.current;
  if (element) element.scrollBy({left:direction * element.clientWidth * .7, behavior:behavior()});
 };
 return <nav className="category-rail" aria-label="Menu categories">
  <button className="category-arrow" aria-label="Previous categories" disabled={edges.start || !edges.overflow} onClick={()=>move(-1)}><ChevronLeft size={19}/></button>
  <div ref={rail} className="categories">
   {categories.map(category=><button key={category} className={selected===category?'active':''} aria-pressed={selected===category} onClick={event=>{
    onSelect(category);
    const element=rail.current;
    if(element) element.scrollTo({left:event.currentTarget.offsetLeft-(element.clientWidth-event.currentTarget.offsetWidth)/2,behavior:behavior()});
   }}>{category}</button>)}
  </div>
  <button className="category-arrow" aria-label="More categories" disabled={edges.end || !edges.overflow} onClick={()=>move(1)}><ChevronRight size={19}/></button>
 </nav>;
}
