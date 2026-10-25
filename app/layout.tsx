import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'מדלן | עוזר CSM',description:'משאלת לקוח לתשובה מבוססת נתונים. כלי חקירה ל־Customer Success.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>;}
