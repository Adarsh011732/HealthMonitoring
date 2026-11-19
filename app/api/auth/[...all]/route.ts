import {authReady,getAuth} from '../../../../lib/auth';
export const dynamic='force-dynamic';
async function handler(request:Request) {
  if(!authReady()) return Response.json({message:'Sign-in is not available yet. Please try again later.'},{status:503});
  return getAuth().handler(request);
}
export {handler as GET,handler as POST};
