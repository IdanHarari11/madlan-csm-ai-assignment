import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata:Metadata={title:'מבט על העסקאות | מדלן',description:'גלו עסקאות במפה, בחרו כרטיסים והשוו נתונים בצ׳אט בעברית.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>;}
