import Explorer from './explorer';
import {dataset,today} from '../lib/data';
export const dynamic='force-dynamic';
export default function Home(){const asOf=today();return <Explorer deals={dataset(asOf)} asOf={asOf}/>;}
