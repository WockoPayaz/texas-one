import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'TEXAS ONE | Burgers, Pizza & Continental · Quetta',description:'Order TEXAS ONE in Quetta. Open 24 hours at PSO Askari Petrol Pump, Airport Road. Delivery, pickup and table ordering.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
