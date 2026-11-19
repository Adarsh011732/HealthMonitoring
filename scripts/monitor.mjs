import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createEmailAlerts} from './email-alerts.mjs';
let sendEmail;
try { sendEmail=createEmailAlerts(); } catch { console.error('Email alerts disabled: incomplete or invalid server configuration.'); }
const directory=process.env.DATA_DIR||'./data';
await mkdir(directory,{recursive:true});
const file=path.join(directory,'monitor.json');
let state={checks:[],incidents:[],lastOk:null,startedAt:new Date().toISOString()};
try{state=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
let stopping=false;process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
while(!stopping){
 const started=performance.now();let ok=false,message='';
 try{const response=await fetch(process.env.MONITOR_URL||'http://127.0.0.1:3000/health',{signal:AbortSignal.timeout(8000)});const body=await response.json();ok=response.ok&&body.status==='ok';if(!ok)message=`HTTP ${response.status}`;}catch(e){message=e.message;}
 const now=new Date().toISOString();
 state.checks.push({time:now,ms:Math.round(performance.now()-started),ok});
 state.checks=state.checks.filter(c=>Date.now()-Date.parse(c.time)<86400000);
 if(!ok&&state.lastOk!==false)state.incidents.push({startedAt:now,resolvedAt:null,message});
 if(ok&&state.lastOk===false){const incident=state.incidents.findLast(i=>!i.resolvedAt);if(incident)incident.resolvedAt=now;}
 const transition=state.lastOk!==ok&&(state.lastOk!==null||!ok);
 state.lastOk=ok;state.updatedAt=now;state.incidents=state.incidents.slice(-100);
 if(transition&&sendEmail){
   try{await sendEmail({ok,time:now});console.log('Email alert delivered.');}
   catch{console.error('Email alert delivery failed. Check SMTP credentials and sending limits.');}
 }
 await writeFile(file+'.tmp',JSON.stringify(state));await rename(file+'.tmp',file);
 if(transition&&process.env.DISCORD_WEBHOOK_URL){try{const response=await fetch(process.env.DISCORD_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:`Smart Deployment Health Monitor: ${ok?'RECOVERED':'UNHEALTHY'} at ${now}`}),signal:AbortSignal.timeout(8000)});if(!response.ok)console.error('Alert delivery failed:',response.status);}catch{console.error('Alert delivery failed');}}
 for(let i=0;i<30&&!stopping;i++)await new Promise(r=>setTimeout(r,1000));
}
