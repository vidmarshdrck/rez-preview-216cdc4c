// REZ data layer (v4). Everything is stored in this browser's localStorage today.
// To move to Supabase, re-implement these functions with the Supabase client
// (see ../supabase/README.md for the table-by-table mapping). The UI only calls DB.*.
const DB=(()=>{
const C=window.REZ_CONFIG, DAY=864e5;
const K=k=>"rez_"+k, get=(k,d)=>{try{return JSON.parse(localStorage.getItem(K(k)))??d}catch(e){return d}}, set=(k,v)=>localStorage.setItem(K(k),JSON.stringify(v));
const uid=()=>Math.random().toString(36).slice(2,10);
const now=()=>Date.now()+get("clock",0); // demo clock offset (admin can advance it to test expiry)
const SAMPLE=[
{id:"s1",title:"Self-contained student rooms near CBU",city:"Kitwe",type:"room",rent:1200,deposit:1200,upfront:3,yard:"Shared yard, 600 m²",address:"Riverside, Kitwe",lat:-12.808,lng:28.237,photos:["img/p5.jpg"],criteria:["Student ID","Guardian contact","1 reference"],amenities:["Wi-Fi","Water incl.","Security guard"],vstatus:"verified",featured:true},
{id:"s2",title:"Girls' boarding house, Northrise",city:"Ndola",type:"boarding",rent:950,deposit:500,upfront:2,yard:"Walled plot, 30 × 40 m",address:"Northrise, Ndola",lat:-12.948,lng:28.651,photos:["img/p2.jpg"],criteria:["Student ID","Guardian contact"],amenities:["Water & power incl.","Shared kitchen"],vstatus:"verified"},
{id:"s3",title:"3-bed family house, Kabulonga",city:"Lusaka",type:"house",rent:9500,deposit:9500,upfront:3,yard:"Garden, 1,200 m²",address:"Kabulonga, Lusaka",lat:-15.415,lng:28.335,photos:["img/p7.jpg"],criteria:["Payslip or bank statement","NRC","2 references"],amenities:["Borehole","Parking ×2","Walled & gated"],vstatus:"verified"},
{id:"s4",title:"2-bed apartment near UNZA",city:"Lusaka",type:"apartment",rent:3800,deposit:3800,upfront:2,yard:"Shared compound",address:"Great East Rd, Lusaka",lat:-15.392,lng:28.329,photos:["img/p4.jpg"],criteria:["Payslip","NRC"],amenities:["Parking","Solar backup"],vstatus:"verified"},
{id:"s5",title:"Boarding rooms near Mulungushi Univ.",city:"Kabwe",type:"boarding",rent:800,deposit:400,upfront:3,yard:"Plot, 20 × 30 m",address:"Kabwe",lat:-14.44,lng:28.45,photos:["img/p1.jpg"],criteria:["Student ID"],amenities:["Wi-Fi"],vstatus:"verified"},
{id:"s6",title:"2-bed house, Dambwa",city:"Livingstone",type:"house",rent:4500,deposit:4500,upfront:1,yard:"Garden, 800 m²",address:"Dambwa, Livingstone",lat:-17.84,lng:25.84,photos:["img/p6.jpg"],criteria:["Payslip","NRC","1 reference"],amenities:["Garden","Water tank"],vstatus:"verified"},
{id:"s7",title:"Shop space on Cha Cha Cha Road",city:"Lusaka",type:"shop",rent:7000,deposit:7000,upfront:3,yard:"Shop floor 45 m², shared parking",address:"Cha Cha Cha Rd, Lusaka CBD",lat:-15.4214,lng:28.2836,photos:["img/p9.jpg"],criteria:["PACRA business registration","NRC","Trading licence (council)"],amenities:["Street frontage","Roller shutter","Prepaid ZESCO meter","Toilet"],vstatus:"verified"}
].map(x=>({...x,sample:true,owner:"sample",created:Date.now()-20*DAY}));
// migrate v2 records (status "pending", verified flag) once
(()=>{const a=get("listings",[]);if(a.some(l=>!l.vstatus)){set("listings",a.map(l=>l.vstatus?l:{...l,vstatus:l.verified?"verified":"awaiting_payment",payConfirmed:false}))}})();
const users=()=>get("users",[]), userById=id=>users().find(u=>u.id===id);
const plan=u=>C.PLANS.find(p=>p.id===(u?.plan||"starter"))||C.PLANS[0];
const subActive=u=>!!u&&(u.subPaidUntil||0)>now();
const raw=()=>get("listings",[]);
// Lifecycle status (computed): draft | verification | rejected | unpaid (verified, first month not paid) | active | occupied | expired
function status(l){
 if(l.sample)return"active";
 if(l.vstatus==="draft")return"draft";
 if(l.vstatus==="rejected")return"rejected";
 if(l.vstatus!=="verified")return"verification";
 if(l.hidden)return"occupied";
 const u=userById(l.owner);return subActive(u)?"active":u?.subPaidUntil?"expired":"unpaid";
}
const vexp=l=>!l.sample&&l.vstatus==="verified"&&!!l.verifiedUntil&&l.verifiedUntil<now(); // annual re-verification due
const listings=()=>[...SAMPLE,...raw()].map(l=>({...l,status:status(l),views:(get("views",{})[l.id]||0),verified:l.vstatus==="verified"&&!vexp(l),vexpired:vexp(l)}));
const listing=id=>listings().find(x=>x.id===id);
const upd=(id,p)=>set("listings",raw().map(x=>x.id===id?{...x,...(typeof p==="function"?p(x):p)}:x));
const log=(id,text,by)=>upd(id,x=>({notes:[...(x.notes||[]),{at:now(),text,by:by||(DB.user()||{}).name||"system"}]}));
const feeRequired=(ownerId)=>C.VERIFICATION_FEE>0&&(C.VERIFICATION_FEE_SCOPE==="property"||!raw().some(l=>l.owner===ownerId&&l.everVerified));
const ref=()=>"REZ-"+new Date(now()).toISOString().slice(2,10).replace(/-/g,"")+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
const activeCount=ownerId=>listings().filter(l=>l.owner===ownerId&&l.status==="active").length;

// ----- v4 helpers -----
const CITYLL={Lusaka:[-15.4167,28.2833],Ndola:[-12.96,28.64],Kitwe:[-12.81,28.21],Kabwe:[-14.44,28.45],Livingstone:[-17.85,25.86],Chingola:[-12.53,27.85],Kasama:[-10.21,31.18]};
const km=(a,b)=>{if(!a||!b||a.lat==null||b.lat==null)return 9999;const r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dg=r(b.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dg/2)**2;return 12742*Math.asin(Math.sqrt(h))};
const ACTIVE_T=["open","offered","accepted","submitted"];
// One live task per listing that needs an inspection: fee recorded (or no fee due) and not yet inspected, or annual re-verification paid.
function ensureTasks(){const ts=get("tasks",[]);let ch=false;
 raw().forEach(l=>{const need=((l.vstatus==="awaiting_payment"&&l.payConfirmed)||(l.vstatus==="verified"&&l.renewalPaid));
  if(need&&!ts.some(t=>t.listingId===l.id&&ACTIVE_T.includes(t.status))&&!(l.vstatus==="awaiting_payment"&&l.staffHandling)){ts.push({id:"t"+uid(),listingId:l.id,kind:l.vstatus==="verified"?"renewal":"verification",status:"open",commission:C.AGENT_COMMISSION,created:now()});ch=true}});
 if(ch)set("tasks",ts)}
const updTask=(id,p)=>{let out;set("tasks",get("tasks",[]).map(t=>t.id===id?(out={...t,...p}):t));return out};
const closeTasks=(lid,why,sts=["open","offered"])=>set("tasks",get("tasks",[]).map(t=>t.listingId===lid&&sts.includes(t.status)?{...t,status:why,closedAt:now()}:t));
const fmtK=n=>"K"+Number(n||0).toLocaleString();
const fmtDT=s=>s?new Date(s).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";
function tplData(a){const l=listing(a.listingId)||{},ll=userById(l.owner)||{},t=userById(a.tenant)||{},base=location.origin+location.pathname;
 return{tenant_name:(a.name||t.name||"").split(" ")[0],listing_title:l.title||a.listingTitle,city:l.city||"",address:l.address||"",landlord_name:ll.name||"The landlord",landlord_phone:ll.phone||"(landlord phone)",
  viewing_date:fmtDT(a.viewingAt),landlord_note_line:a.landlordNote?` Note from the landlord: "${a.landlordNote}"`:"",rent:fmtK(l.rent),deposit:fmtK(l.deposit),upfront:l.upfront,move_in_total:fmtK((l.rent||0)*(l.upfront||0)+(+l.deposit||0)),
  directions_url:`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`,listing_url:`${base}#/l/${l.id}`,site_url:base,landlord_wa_url:window.REZ_TPL?REZ_TPL.waLink(ll.phone,"Hi, about "+(l.title||"")):""}}
function notify(userId,key,data,link,extra){const r=window.REZ_TPL?.render(key,"in_app",data)||{title:key,body:""};const n={id:uid(),userId,key,title:r.title,body:r.body,data,link:link||"",created:now(),read:false,channels:["in_app"],pendingChannels:["email","sms","whatsapp"],delivery:C.DELIVERY_ENABLED?"queued":"preview_only",...(extra||{})};set("notifs",[...get("notifs",[]),n]);return n}
function notifyApp(a,key){return notify(a.tenant,key,tplData(a),"#/l/"+a.listingId,{appId:a.id,listingId:a.listingId,tenantPhone:a.phone,tenantEmail:a.tenantEmail})}
const DB={
 now,DAY,plan,subActive,feeRequired,
 listings,listing,
 publicListings:()=>listings().filter(l=>l.status==="active"),
 // ----- landlord: create / submit -----
 addListing(l,{draft}={}){const a=raw();const n={...l,id:"u"+uid(),created:now(),vstatus:draft?"draft":"awaiting_payment",payConfirmed:false,notes:[]};a.push(n);set("listings",a);if(!draft)DB.submitForVerification(n.id);return n},
 updateListing:upd,
 submitForVerification(id){const l=listing(id);const need=feeRequired(l.owner)&&!l.feePaid;upd(id,{vstatus:"awaiting_payment",payConfirmed:!need,submittedAt:now()});log(id,need?`Submitted. Verification fee K${C.VERIFICATION_FEE} due.`:"Submitted. No verification fee due; awaiting inspection booking.")},
 // ----- staff: verification -----
 scheduleInspection(id,{date,inspector}){closeTasks(id,"handled_by_staff");upd(id,{vstatus:"inspection_scheduled",inspection:{...(listing(id).inspection||{}),scheduledFor:date,inspector}});log(id,`Inspection scheduled for ${date} with ${inspector}.`)},
 completeInspection(id,{result,inspector,date,notes,photos,checks},viaTask){if(!viaTask)closeTasks(id,"handled_by_staff",["open","offered","accepted"]);const ok=result==="verified";upd(id,x=>({vstatus:ok?"verified":"rejected",everVerified:x.everVerified||ok,flagReverify:false,hidden:ok?false:x.hidden,verifiedAt:ok?now():x.verifiedAt,verifiedUntil:ok?now()+C.VERIFICATION_PERIOD_DAYS*DAY:x.verifiedUntil,renewalPaid:false,inspection:{...(x.inspection||{}),inspector,date,notes,photos:photos||[],checks:checks||null,result,recordedAt:now()}}));log(id,`Inspection ${ok?"passed: Verified":"failed: Rejected"} by ${inspector} on ${date}. ${notes||""}`)},
 flagReverify(id,reason){upd(id,{flagReverify:true});log(id,"Flagged for re-verification: "+reason)},
 // ----- lifecycle -----
 markOccupied(id,by){upd(id,{hidden:true,occupiedSince:now(),leavingDate:null,hiddenBy:by});log(id,`Marked occupied (hidden) by ${by}.`)},
 // returns {ok:true}|{needPayment:true}|{reverify:true}|{limit:true}
 reactivate(id,{leavingDate}={}){const l=listing(id),u=userById(l.owner);
  if(l.flagReverify){upd(id,{vstatus:"awaiting_payment",payConfirmed:true,hidden:true,leavingDate:leavingDate||null});log(id,"Reactivation requested; admin flagged re-verification, so it returns to the inspection queue (no fee).");return{reverify:true}}
  if((l.status==="occupied"||l.status==="expired")&&activeCount(l.owner)>=plan(u).listings)return{limit:true};
  upd(id,{hidden:false,leavingDate:leavingDate||null,reactivatedAt:now()});log(id,leavingDate?`Tenant leaving ${leavingDate}: relisted early.`:"Reactivated by landlord.");
  return subActive(u)?{ok:true}:{needPayment:true}},
 // ----- payments (placeholder: nothing is charged) -----
 createPayment({purpose,listingId,landlord,amount,method,planId,weeks}){const p={id:uid(),ref:ref(),purpose,listingId:listingId||null,landlord,amount,method,planId:planId||null,weeks:weeks||null,status:"pending",created:now()};set("payments",[...get("payments",[]),p]);return p},
 payments:()=>get("payments",[]),
 // Staff records a payment that arrived outside the site (e.g. mobile money). Boaz verifies transaction_id + amount + timestamp.
 recordPayment(pid,{transaction_id,amount,paid_at,recorded_by}){
  if(!transaction_id||!amount||!paid_at)throw Error("Transaction ID, amount and timestamp are all required");
  const ps=get("payments",[]),p=ps.find(x=>x.id===pid);if(!p)throw Error("Payment not found");
  if(+amount!==+p.amount)throw Error(`Amount K${amount} does not match the K${p.amount} due`);
  if(ps.some(x=>x.transaction_id===transaction_id))throw Error("This transaction ID is already recorded");
  Object.assign(p,{status:"recorded",transaction_id,paid_amount:+amount,paid_at,recorded_by,recorded_at:now(),boaz_verified:false});set("payments",ps);
  if(p.purpose==="verification"&&p.listingId){const l=listing(p.listingId);if(l.vstatus==="verified"){upd(p.listingId,{renewalPaid:true});log(p.listingId,`Annual re-verification fee recorded (txn ${transaction_id}). Inspection task created.`,recorded_by)}else{upd(p.listingId,{payConfirmed:true,feePaid:true});log(p.listingId,`Verification fee recorded (txn ${transaction_id}).`,recorded_by)}}
  if(p.purpose==="subscription"){const u=userById(p.landlord);const from=Math.max(now(),u.subPaidUntil||0);DB.updateUser({subPaidUntil:from+C.LISTING_PERIOD_DAYS*DAY,plan:p.planId||u.plan},u.id)}
  if(p.purpose==="boost"&&p.listingId){const l=listing(p.listingId);const wk=Math.min(C.BOOST.maxWeeks,Math.max(1,+p.weeks||1));upd(p.listingId,{boostUntil:Math.max(now(),l.boostUntil||0)+wk*7*DAY,boostWeeks:wk});log(p.listingId,`Boost ${wk} week(s) recorded (txn ${transaction_id}).`,recorded_by)}
  return p},
 // ----- metrics -----
 lastViewed:()=>get("lastViewed",null),
 trackView(id){set("lastViewed",id);const k="rez_seen_"+id;if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,1);const v=get("views",{});v[id]=(v[id]||0)+1;set("views",v);set("viewlog",[...get("viewlog",[]).slice(-2000),{id,at:now()}])},
 addEnquiry(e){set("enquiries",[...get("enquiries",[]),{...e,id:uid(),at:now()}])},
 enquiries:()=>get("enquiries",[]),
 viewlog:()=>get("viewlog",[]),
 // ----- accounts -----
 users, userById,
 user:()=>get("session",null)&&userById(get("session")),
 signUp({name,email,password,role,google,phone}){const us=users();if(us.find(u=>u.email===email))throw Error("An account with this email already exists");const u={id:uid(),name,email,password,role,phone:phone||"",google:!!google,plan:"starter",subPaidUntil:0,saved:[],trips:[],meets:{},created:now()};us.push(u);set("users",us);set("session",u.id);return u},
 signIn(email,password){const u=users().find(u=>u.email===email&&u.password===password);if(!u)throw Error("Wrong email or password");set("session",u.id);return u},
 signOut(){localStorage.removeItem(K("session"))},
 updateUser(p,id){const s=id||get("session");set("users",users().map(u=>u.id===s?{...u,...p}:u))},
 staffDemo(){const email="staff.demo@rez.example";let u=users().find(x=>x.email===email);if(!u){const us=users();u={id:"staff-demo",name:"REZ Staff (demo)",email,password:"",role:"admin",saved:[],trips:[],meets:{}};us.push(u);set("users",us)}set("session",u.id);return u},
 applications:()=>get("apps",[]),
 apply(a){const x=get("apps",[]);const n={...a,id:uid(),status:"Submitted",created:now()};x.push(n);set("apps",x);return n},
 setAppStatus(id,status){set("apps",get("apps",[]).map(a=>a.id===id?{...a,status}:a))},
 // ----- tenant profile (optional fields; saved on the user) -----
 saveTenantProfile(p){DB.updateUser({profile:{...(DB.user()?.profile||{}),...p}})},
 // ----- acceptance -> notification (in-app now; email/SMS/WhatsApp at launch) -----
 acceptApplication(id,{viewingAt,note}={}){const a=get("apps",[]).find(x=>x.id===id);if(!a)throw Error("Application not found");
  const seen=a.seen==="yes";if(!seen&&!viewingAt)throw Error("Propose a viewing date and time");
  set("apps",get("apps",[]).map(x=>x.id===id?{...x,status:"Accepted",acceptedAt:now(),viewingAt:seen?null:viewingAt,landlordNote:note||""}:x));
  return notifyApp({...a,viewingAt,landlordNote:note||""},seen?"application_accepted_pay":"application_accepted_viewing")},
 declineApplication(id){const a=get("apps",[]).find(x=>x.id===id);DB.setAppStatus(id,"Declined");return notifyApp(a,"application_declined")},
 tplData,
 notifications:uid2=>get("notifs",[]).filter(n=>n.userId===(uid2||get("session"))).sort((a,b)=>b.created-a.created),
 unread:()=>DB.notifications().filter(n=>!n.read).length,
 markRead(id){set("notifs",get("notifs",[]).map(n=>n.id===id?{...n,read:true}:n))},
 markAllRead(){const s=get("session");set("notifs",get("notifs",[]).map(n=>n.userId===s?{...n,read:true}:n))},
 // ----- field agents (existing estate agents working for REZ as inspectors) -----
 agents:()=>users().filter(u=>u.role==="agent"&&u.agent),
 saveAgentProfile(p){const u=DB.user();if(!p.agreement&&!u.agent?.agreementAt)throw Error("Tick the agent agreement to continue");
  const prev=u.agent||{status:"pending"};const ll=p.lat!=null?[+p.lat,+p.lng]:prev.lat!=null&&p.baseCity===prev.baseCity?[prev.lat,prev.lng]:CITYLL[p.baseCity]||CITYLL.Lusaka;
  DB.updateUser({role:"agent",name:p.name||u.name,phone:p.phone||u.phone,agent:{...prev,nrc:p.nrc||"",areas:p.areas||[],areaText:p.areaText||"",availability:p.availability||[],baseCity:p.baseCity,lat:ll[0],lng:ll[1],locSource:p.lat!=null?"device":prev.locSource&&p.baseCity===prev.baseCity?prev.locSource:"city",agreementAt:prev.agreementAt||now(),agreementVersion:C.AGENT_AGREEMENT_VERSION}})},
 setAgentLocation(lat,lng){const u=DB.user();DB.updateUser({agent:{...u.agent,lat,lng,locSource:"device"}})},
 approveAgent(id,status="approved"){const u=userById(id);DB.updateUser({agent:{...u.agent,status,reviewedAt:now()}},id)},
 // ----- inspection tasks -----
 tasks:()=>{ensureTasks();return get("tasks",[])},
 task:id=>DB.tasks().find(t=>t.id===id),
 km,
 assignTask(tid,agentId,by){const a=userById(agentId);if(a?.agent?.status!=="approved")throw Error("Agent is not approved");
  const t=updTask(tid,{status:"offered",agentId,assignedBy:by,offeredAt:now()});const l=listing(t.listingId);log(t.listingId,`Inspection task offered to field agent ${a.name}.`,by);
  notify(agentId,"agent_task_assigned",{agent_name:a.name,listing_title:l.title,address:`${l.address}, ${l.city}`,distance:km(a.agent,l).toFixed(1)+" km",commission:"K"+t.commission},"#/agent");return t},
 acceptTask(tid,visitDate){const u=DB.user(),t=DB.task(tid);if(u?.agent?.status!=="approved")throw Error("Your agent profile is waiting for REZ approval");
  if(!(t.status==="open"||(t.status==="offered"&&t.agentId===u.id)))throw Error("This task is no longer available");if(!visitDate)throw Error("Pick a visit date");
  updTask(tid,{status:"accepted",agentId:u.id,acceptedAt:now(),visitDate});const l=listing(t.listingId);
  if(l.vstatus!=="verified")upd(t.listingId,{vstatus:"inspection_scheduled",inspection:{...(l.inspection||{}),scheduledFor:visitDate,inspector:u.name+" (REZ field agent)",agentId:u.id}});
  log(t.listingId,`Field agent ${u.name} accepted the inspection for ${visitDate}.`,u.name)},
 declineTask(tid){const t=DB.task(tid);updTask(tid,{status:"open",agentId:null,offeredAt:null});log(t.listingId,"Field agent declined the offered task; it is open again.")},
 submitReport(tid,r){const u=DB.user(),t=DB.task(tid);if(t.agentId!==u.id||t.status!=="accepted")throw Error("You can only report on a task you accepted");
  if(!r.notes)throw Error("Add your notes");updTask(tid,{status:"submitted",report:{...r,submittedAt:now()}});log(t.listingId,`Field agent ${u.name} submitted an inspection report (recommends ${r.recommendation}).`,u.name)},
 reviewReport(tid,decision,{by,note}={}){const t=DB.task(tid);if(t.status!=="submitted")throw Error("No report to review");const a=userById(t.agentId);
  if(decision==="return"){updTask(tid,{status:"accepted",staffNote:note||"Please redo",returnedAt:now()});log(t.listingId,`Report sent back to ${a.name}: ${note||""}`,by);return}
  const r=t.report;DB.completeInspection(t.listingId,{result:r.recommendation==="pass"?"verified":"rejected",inspector:a.name+" (REZ field agent)",date:r.visitedAt||t.visitDate,notes:r.notes,photos:r.photos||[],checks:r.checks},true);
  updTask(tid,{status:"approved",reviewedBy:by,reviewedAt:now(),staffNote:note||""});
  set("commissions",[...get("commissions",[]),{id:uid(),agentId:t.agentId,taskId:tid,listingId:t.listingId,amount:t.commission,status:"pending",created:now()}]);
  log(t.listingId,`Report approved by ${by}. Commission K${t.commission} (PROPOSED) owed to ${a.name}; payout pending.`,by)},
 commissions:aid=>get("commissions",[]).filter(c=>!aid||c.agentId===aid),
 // MOCK: records that a payout happened outside the site. No money moves; real payouts stay disabled until Boaz and the lawyer sign off.
 markCommissionPaid(id,{ref,by}){if(!ref)throw Error("Payout reference required");set("commissions",get("commissions",[]).map(c=>c.id===id?{...c,status:"paid",payoutRef:ref,paidAt:now(),paidBy:by,mock:true}:c))},
 advanceClock(days){set("clock",get("clock",0)+days*DAY)}, resetClock(){set("clock",0)}, clockOffset:()=>get("clock",0)
};
return DB})();
