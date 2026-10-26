// Bound caller latency even when a provider/transport does not settle on abort.
export async function withDeadline<T>(run:(signal:AbortSignal)=>Promise<T>,timeoutMs:number):Promise<T>{
 const controller=new AbortController();
 let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{
  const error=new DOMException('Operation deadline exceeded','TimeoutError');
  controller.abort(error);reject(error);
 },timeoutMs);});
 try{return await Promise.race([Promise.resolve().then(()=>run(controller.signal)),deadline]);}
 finally{clearTimeout(timer);}
}
