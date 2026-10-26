// Caller latency is bounded even if the provider ignores cancellation.
export async function withDeadline<T>(run:(signal:AbortSignal)=>Promise<T>,timeoutMs:number,upstream?:AbortSignal):Promise<T>{
 if(upstream?.aborted)throw new DOMException('Operation cancelled','AbortError');
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 let abort:()=>void=()=>{};
 const boundary=new Promise<never>((_,reject)=>{
  timer=setTimeout(()=>{const error=new DOMException('Operation deadline exceeded','TimeoutError');controller.abort(error);reject(error);},timeoutMs);
  abort=()=>{const error=new DOMException('Operation cancelled','AbortError');controller.abort(error);reject(error);};
  upstream?.addEventListener('abort',abort,{once:true});
 });
 try{return await Promise.race([Promise.resolve().then(()=>{if(controller.signal.aborted)throw controller.signal.reason;return run(controller.signal);}),boundary]);}
 finally{clearTimeout(timer);upstream?.removeEventListener('abort',abort);}
}
