import { createNeonAuth } from '@neondatabase/auth/next/server';
import { AppError } from './http';
let instance:ReturnType<typeof createNeonAuth>|undefined;
export function getAuth(){
 const baseUrl=process.env.NEON_AUTH_BASE_URL,secret=process.env.NEON_AUTH_COOKIE_SECRET;
 if(!baseUrl||!secret)throw new AppError('AUTH_NOT_CONFIGURED',503,'ההתחברות עדיין אינה מוגדרת.');
 return instance??=createNeonAuth({baseUrl,cookies:{secret,sessionDataTtl:60}});
}
export async function getCurrentUser(){
 if(!process.env.NEON_AUTH_BASE_URL||!process.env.NEON_AUTH_COOKIE_SECRET)return null;
 const {data:session}=await getAuth().getSession();
 if(!session?.user?.emailVerified)return null;
 const user=session.user;
 return {userId:user.id,email:user.email,displayName:user.name||user.email};
}
