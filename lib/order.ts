import type {MenuItem,Settings} from './menu';
export type CartLine={id:string;variant:number;quantity:number;cheese?:boolean};
export function priceOrder(lines:CartLine[],menu:MenuItem[],mode:string,settings:Settings){
 if(!['delivery','pickup','dine-in'].includes(mode))throw Error('Choose delivery, pickup, or dine-in.');
 if(!Array.isArray(lines)||!lines.length||lines.length>80)throw Error('Your cart must contain between 1 and 80 items.');
 const items=lines.map(l=>{const item=menu.find(i=>i.id===l.id);if(!item?.available)throw Error('An item is no longer available. Please refresh your menu.');if(!Number.isInteger(l.variant)||!item.variants[l.variant]||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>30)throw Error('Invalid item option or quantity.');const v=item.variants[l.variant];if(l.cheese&&!item.extraCheese)throw Error('This item does not offer extra cheese.');const extra=l.cheese?[100,150,200][l.variant]:0;if(l.cheese&&extra===undefined)throw Error('Invalid cheese option.');return {id:item.id,name:item.name,variant:v.name,quantity:l.quantity,cheese:!!l.cheese,unitPrice:v.price+extra};});
 const subtotal=items.reduce((s,l)=>s+l.unitPrice*l.quantity,0);if(mode==='delivery'&&subtotal<settings.minimumOrder)throw Error(`Minimum delivery order is Rs. ${settings.minimumOrder}.`);
 const deliveryFee=mode==='delivery'?settings.deliveryFee:0;return {items,subtotal,deliveryFee,total:subtotal+deliveryFee};
}
export const transitions:Record<string,string[]>={new:['accepted','cancelled'],accepted:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['out-for-delivery','completed','cancelled'],'out-for-delivery':['completed','cancelled'],completed:[],cancelled:[]};
