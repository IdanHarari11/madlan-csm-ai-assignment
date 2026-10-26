import Explorer from './explorer';
import {dataset,today,DATA_VERSION} from '../lib/data';
export const dynamic='force-dynamic';
export default function Home(){const asOf=today();return <Explorer deals={dataset(asOf)} asOf={asOf} dataVersion={DATA_VERSION}/>;}
