import type { NextConfig } from "next";
const nextConfig: NextConfig = {
 async headers(){return [{source:'/auth/:path*',headers:[{key:'Content-Security-Policy',value:"frame-ancestors 'none'"},{key:'X-Content-Type-Options',value:'nosniff'}]}];},
};
export default nextConfig;
