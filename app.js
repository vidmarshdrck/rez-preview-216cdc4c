// REZ Homes v5: hash-routed static app. Data via DB (data.js), settings via REZ_CONFIG (config.js).
const CFG=window.REZ_CONFIG, WA=CFG.WHATSAPP_NUMBER, BOOST=CFG.BOOST;
const $=s=>document.querySelector(s), app=$("#app");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const K=n=>"K"+Number(n||0).toLocaleString();
const D=t=>t?new Date(t).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—";
const TYPES={boarding:"Boarding house",room:"Room",apartment:"Apartment",house:"House",flat:"Flat",shop:"Shop / Store"};
const CITIES=["Lusaka","Ndola","Kitwe","Kabwe","Livingstone","Chingola","Kasama"];
const CITYLL={Lusaka:[-15.4167,28.2833],Ndola:[-12.96,28.64],Kitwe:[-12.81,28.21],Kabwe:[-14.44,28.45],Livingstone:[-17.85,25.86],Chingola:[-12.53,27.85],Kasama:[-10.21,31.18]};
const PRICES=[["Under K1,000",0,999],["K1,000–2,000",1000,2000],["K2,000–5,000",2000,5000],["K5,000+",5000,1e9]];
const SLIDES=[["img/p3.jpg","Find your next <span>home</span>, fast."],["img/p8.jpg","Rooms for <span>students</span>, close to campus."],["img/p6.jpg","Family homes in <span>7 cities</span>."],["img/p2.jpg","Every listing <span>inspected</span> by REZ."]];
const VSTEPS=[["draft","Draft"],["awaiting_payment","Awaiting verification payment"],["inspection_scheduled","Inspection scheduled"],["verified","Verified"]];
const VLABEL={draft:"Draft",awaiting_payment:"Awaiting verification payment",inspection_scheduled:"Inspection scheduled",verified:"Verified",rejected:"Rejected"};
const SLABEL={draft:"Draft",verification:"In verification",rejected:"Rejected",unpaid:"Verified · pay plan to go live",active:"Active",occupied:"Occupied · hidden",expired:"Expired · fee unpaid"};
let F={cities:[],types:[],price:null,max:20000}, maps=[], timer;
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),2400)};
const wa=m=>`https://wa.me/${WA}?text=${encodeURIComponent(m)}`;
const isFeat=l=>!!(l.featured||(l.boostUntil&&l.boostUntil>DB.now()));
const sortF=a=>a.sort((x,y)=>(isFeat(y)-isFeat(x)));
const vvv=l=>l.vstatus==="verified"&&!l.flagReverify&&!l.vexpired;
const vstatusLabel=l=>l.vexpired?(l.renewalPaid?"Re-verification fee recorded · inspection due":"Re-verification due"):l.vstatus==="awaiting_payment"&&l.payConfirmed?"Fee recorded · booking inspection":VLABEL[l.vstatus];
const tags=l=>l.sample?`<div class="tags"><span class="tag s">EXAMPLE · FOR RENT</span></div>`:`<div class="tags">${isFeat(l)?'<span class="tag f">★ Featured</span>':""}${vvv(l)?'<span class="tag v vb">Verified</span>':(l.vstatus&&l.vstatus!=='verified'?`<span class="tag p">${esc(vstatusLabel(l))}</span>`:"")}${l.leavingDate?`<span class="tag a">Available ${esc(D(l.leavingDate))}</span>`:""}</div>`;

/** Builds a swipeable photo strip with dots for a listing's photos. */
function photoCarousel(photos, opts={}){
  const list=(photos&&photos.length?photos:["img/p1.jpg"]).slice(0,12);
  const cls=opts.hero?"phero":"pcard";
  return `<div class="pcar ${cls}" tabindex="0" aria-label="Photos"><div class="ptrack">${list.map((src,i)=>`<div class="pslide${i?"":" on"}"><img loading="${i?"lazy":"eager"}" src="${esc(src)}" alt=""></div>`).join("")}</div>${list.length>1?`<div class="pdots">${list.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div>`:""}</div>`;
}
/** Wires touch/mouse swipe and dots on every .pcar inside root. */
function bindPhotoCarousels(root){
  (root||document).querySelectorAll(".pcar").forEach(car=>{
    if(car.dataset.bound)return; car.dataset.bound="1";
    const slides=[...car.querySelectorAll(".pslide")], dots=[...car.querySelectorAll(".pdots i")];
    if(slides.length<2)return;
    let i=0, startX=0, dx=0;
    const show=n=>{i=(n+slides.length)%slides.length;slides.forEach((s,j)=>s.classList.toggle("on",j===i));dots.forEach((d,j)=>d.classList.toggle("on",j===i))};
    const onStart=x=>{startX=x;dx=0};
    const onMove=x=>{dx=x-startX};
    const onEnd=()=>{if(Math.abs(dx)>40)show(i+(dx<0?1:-1));dx=0};
    car.addEventListener("touchstart",e=>onStart(e.touches[0].clientX),{passive:true});
    car.addEventListener("touchmove",e=>onMove(e.touches[0].clientX),{passive:true});
    car.addEventListener("touchend",onEnd);
    let down=false;
    car.addEventListener("mousedown",e=>{down=true;onStart(e.clientX)});
    car.addEventListener("mousemove",e=>{if(down)onMove(e.clientX)});
    car.addEventListener("mouseup",()=>{if(down){down=false;onEnd()}});
    car.addEventListener("mouseleave",()=>{if(down){down=false;onEnd()}});
    dots.forEach((d,j)=>d.onclick=e=>{e.preventDefault();e.stopPropagation();show(j)});
  });
}
/** Horizontal featured listings strip for the home page. */
function featuredStrip(list){
  if(!list.length)return"";
  return `<section class="feat-row" aria-label="Featured homes"><div class="sechead"><h2>Featured</h2></div><div class="feat-scroller">${list.map(l=>`<a class="feat-card" href="#/l/${l.id}">${photoCarousel(l.photos)}<div class="feat-meta"><span class="city">${esc(l.city)}</span><b>${esc(l.title)}</b><span class="pr">${K(l.rent)}<small>/mo</small></span></div></a>`).join("")}</div></section>`;
}
const card=(l,n=0)=>`<a class="card lcard" href="#/l/${l.id}" style="animation-delay:${n*50}ms"><div class="ph">${photoCarousel(l.photos)}${tags(l)}</div><div class="cb"><span class="city">${esc(l.city)} · ${TYPES[l.type]||esc(l.type)}</span><h3>${esc(l.title)}</h3><div class="d">Deposit ${K(l.deposit)} · ${l.upfront} month(s) upfront · ${esc(l.yard||"")}</div><div class="pr">${K(l.rent)}<small> /month</small></div></div></a>`;
function clearMaps(){maps.forEach(m=>m.remove());maps=[];clearInterval(timer)}
function mkMap(el,ll,z,sat){const m=L.map(el).setView(ll,z);const b=BASE().addTo(m);if(sat)L.control.layers({"Map":b,"Satellite":SAT()},null,{position:"topright"}).addTo(m);maps.push(m);return m}
L.Icon.Default.imagePath="vendor/images/";
const sv3d=l=>`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${l.lat},${l.lng}`, sat3d=l=>`https://www.google.com/maps/@${l.lat},${l.lng},150m/data=!3m1!1e3`;
const BASE=()=>L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"});
const SAT=()=>L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles © Esri, Maxar, Earthstar Geographics"});
const isStaff=u=>u&&(u.role==="admin"||u.role==="staff");

// ---------- Recommendations ----------
// Rank by city/type/price match, then featured first, then the landlord's plan tier.
const tierOf=l=>l.sample?(l.featured?2:0):(CFG.PLANS.find(p=>p.id===(DB.userById(l.owner)||{}).plan)||{tier:0}).tier;
function recommend(ctx,n=3,exclude){const pool=DB.publicListings().filter(l=>l.id!==exclude);
 const score=l=>(ctx.cities?.includes(l.city)?3:0)+(ctx.types?.includes(l.type)?3:0)+(ctx.rent?(Math.abs(l.rent-ctx.rent)<=ctx.rent*.35?2:0):ctx.max<20000&&l.rent<=ctx.max?2:0);
 return pool.map(l=>({l,s:score(l)})).sort((a,b)=>b.s-a.s||isFeat(b.l)-isFeat(a.l)||tierOf(b.l)-tierOf(a.l)).slice(0,n).map(x=>x.l)}
function homeCtx(){const u=DB.user(),lv=DB.listing(DB.lastViewed()||""),sv=(u?.saved||[]).map(DB.listing).filter(Boolean),seed=[lv,...sv].filter(Boolean);
 return{cities:F.cities.length?F.cities:[...new Set(seed.map(l=>l.city))],types:F.types.length?F.types:[...new Set(seed.map(l=>l.type))],rent:seed[0]?.rent,max:F.max,why:seed.length?"Based on homes you viewed and saved":F.cities.length||F.types.length?"Based on your filters":"Featured and verified picks"}}
const recHTML=(title,why,list)=>list.length?`<section id="recs"><div class="sechead"><h2>${title}</h2></div><p class="note">${esc(why)}</p><div class="grid">${list.map(card).join("")}</div></section>`:"";

// ---------- Home ----------
/** Renders the home page with listings leading on mobile and the carousel kept for desktop. */
if(window.REZ_EXAMPLES?.length){
 const notice=document.createElement('aside');notice.id='example-notice';notice.className='wrap';
 notice.innerHTML='<div class="card box" style="margin:16px 0"><strong>Example properties for review</strong><p class="note" style="margin:6px 0">Fictional listings, illustrative prices and stock photos — not real properties, availability or verified inspections. Map pins represent approximate areas only. No enquiries, applications or payments for these examples.</p><a class="pill pill-ghost sm" href="'+location.pathname+'">Exit examples</a></div>';
 app.before(notice);document.querySelector('#wafloat').style.display='none';
}
function home(){
 app.innerHTML=`<div class="home-stack fade">
 <section class="mhero" aria-label="Browse homes">
  <h1>Homes for rent across Zambia</h1>
  <p class="lead">Boarding houses, rooms and family homes — deposit and upfront shown up front.</p>
 </section>
 <section class="carousel" id="car">${SLIDES.map((s,i)=>`<div class="slide${i?"":" on"}" style="background-image:url('${s[0]}')"></div>`).join("")}
 <div class="ovl"><p class="eyebrow">Rentals · Boarding houses · Zambia</p><h1 id="hl">${SLIDES[0][1]}</h1><p class="lead">Student rooms and family homes. Deposit, upfront months and requirements shown before you visit.</p><a class="pill pill-gold" href="#search">Search homes</a></div>
 <div class="dots">${SLIDES.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div></section>
 <form id="search" class="card search home-search" onsubmit="return false">
  <span class="lbl">City</span><div class="chips" id="cityChips">${["All",...CITIES].map(c=>`<button type="button" class="chip${(c==="All"?!F.cities.length:F.cities.includes(c))?" on":""}" data-c="${c}">${c}</button>`).join("")}</div>
  <span class="lbl">Type</span><div class="fl" id="typeT">${Object.entries(TYPES).map(([k,v])=>`<button type="button" class="chip t${F.types.includes(k)?" on":""}" data-t="${k}">${v}</button>`).join("")}</div>
  <span class="lbl">Price</span><div class="dd"><button type="button" class="ddb" id="ddb"><span id="ddl">Any price</span><span>▾</span></button>
   <div class="ddp hide" id="ddp"><div class="fl">${PRICES.map((p,i)=>`<button type="button" class="chip pr" data-i="${i}">${p[0]}</button>`).join("")}</div>
   <span class="lbl">Max rent: <b id="mx">${K(F.max)}</b></span><input type="range" id="rng" min="500" max="20000" step="250" value="${F.max}">
   <div class="btns" style="margin-top:10px"><button type="button" class="pill pill-ghost sm" id="pclr">Clear</button><button type="button" class="pill pill-green sm" id="pok">Apply</button></div></div></div>
 </form>
 <div id="featwrap"></div>
 <div id="recwrap">${(c=>recHTML("Recommended for you",c.why,recommend(c)))(homeCtx())}</div>
 <section id="listings"><div class="sechead"><h2>${window.REZ_EXAMPLES?.length?"For rent — examples":"Listings"}</h2></div><p class="note">Browse homes across Zambia. Verified means a REZ inspector checked the listing. Free to browse.</p><div id="grid" class="grid"></div></section>
 ${pricingHTML()}
 <section id="agents" class="card box agentcta"><div><h2>Inspect for REZ</h2><p class="note">Apply with your experience and qualifications. Once REZ approves you, you get a REZ Certified Inspector certificate and can inspect properties near you in your free time. Commission depends on the property size, how far you travel and how long the inspection takes. Nearby tasks show up first.</p></div><a class="pill pill-gold" href="#/agent-info">How agents work</a></section>
 <section id="contact" class="card cta"><h2>Need a hand?</h2><p>Listing a home or looking for one — message us on WhatsApp.</p><a class="pill pill-gold" href="${wa("Hi REZ, I'd like to list my property / ask about a rental.")}" target="_blank">Chat on WhatsApp</a><p class="note light">REZ customer service · ${esc(CFG.WHATSAPP_DISPLAY)}</p></section>
 </div>`;
 let i=0;const sl=app.querySelectorAll(".slide"),dt=app.querySelectorAll(".dots i");
 timer=setInterval(()=>{sl[i].classList.remove("on");dt[i].classList.remove("on");i=(i+1)%sl.length;sl[i].classList.add("on");dt[i].classList.add("on");$("#hl").innerHTML=SLIDES[i][1]},4500);
 $("#cityChips").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;const c=b.dataset.c;if(c==="All")F.cities=[];else F.cities=F.cities.includes(c)?F.cities.filter(x=>x!==c):[...F.cities,c];home2()};
 $("#typeT").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;const t=b.dataset.t;F.types=F.types.includes(t)?F.types.filter(x=>x!==t):[...F.types,t];b.classList.toggle("on");grid()};
 const p=$("#ddp");$("#ddb").onclick=()=>p.classList.toggle("hide");
 p.querySelectorAll(".pr").forEach(b=>b.onclick=()=>{p.querySelectorAll(".pr").forEach(x=>x.classList.remove("on"));b.classList.add("on");F.price=+b.dataset.i;});
 $("#rng").oninput=e=>{F.max=+e.target.value;$("#mx").textContent=K(F.max)};
 $("#pclr").onclick=()=>{F.price=null;F.max=20000;p.classList.add("hide");home2()};
 $("#pok").onclick=()=>{p.classList.add("hide");grid()};
  bindBoost($("#pboost"));
 grid();
 const feat=DB.publicListings().filter(isFeat).slice(0,12);
 const fw=$("#featwrap"); if(fw) fw.innerHTML=featuredStrip(feat);
 bindPhotoCarousels(app);
}
// ---------- Boost weeks selector (1-12 weeks, live total) ----------
const boostWidget=(w)=>`<div class="bw" data-w="${w}"><div class="bwq">${[1,2,3,4,5].map(n=>`<button type="button" class="chip${n===w?" on":""}${n===BOOST.recommendedWeeks?" rec":""}" data-bw="${n}">${n===BOOST.recommendedWeeks?"★ 5 weeks (recommended)":n+" week"+(n>1?"s":"")}</button>`).join("")}</div>
 <div class="bwrow"><button type="button" class="step" data-d="-1" aria-label="Fewer weeks">−</button><div class="bwv"><b class="bwn">${w}</b><span class="bwu"> week${w>1?"s":""}</span><small class="bwd">${bwDesc(w)}</small></div><button type="button" class="step" data-d="1" aria-label="More weeks">+</button></div>
 <input type="range" class="bwr" min="${BOOST.minWeeks}" max="${BOOST.maxWeeks}" value="${w}" aria-label="Boost weeks">
 <div class="bwt"><span>${K(BOOST.week)} × <span class="bwn2">${w}</span> week(s)</span><b class="bwtotal">${K(w*BOOST.week)}</b></div>
 <p class="note bwrec" style="margin:0">${w===BOOST.recommendedWeeks?`Recommended: ${BOOST.recommendedWeeks} weeks.`:`Recommended: ${BOOST.recommendedWeeks} weeks. You picked ${w}.`}</p></div>`;
const bwDesc=w=>w===BOOST.recommendedWeeks?"Covers a full paid month (about 4.3 weeks)":w===4?"28 days — a little short of a calendar month":`${w*7} days`;
function bindBoost(root,onChange){const el=root&&root.querySelector(".bw");if(!el)return;const setW=w=>{w=Math.max(BOOST.minWeeks,Math.min(BOOST.maxWeeks,w||1));el.dataset.w=w;
  el.querySelector(".bwn").textContent=w;el.querySelector(".bwn2").textContent=w;el.querySelector(".bwu").textContent=` week${w>1?"s":""}`;el.querySelector(".bwd").textContent=bwDesc(w);const rec=el.querySelector(".bwrec");if(rec)rec.textContent=w===BOOST.recommendedWeeks?`Recommended: ${BOOST.recommendedWeeks} weeks.`:`Recommended: ${BOOST.recommendedWeeks} weeks. You picked ${w}.`;
  el.querySelector(".bwtotal").textContent=K(w*BOOST.week);el.querySelector(".bwr").value=w;el.querySelectorAll("[data-bw]").forEach(b=>b.classList.toggle("on",+b.dataset.bw===w));onChange&&onChange(w)};
 el.querySelectorAll("[data-bw]").forEach(b=>b.onclick=()=>setW(+b.dataset.bw));el.querySelectorAll(".step").forEach(b=>b.onclick=()=>setW(+el.dataset.w+ +b.dataset.d));el.querySelector(".bwr").oninput=e=>setW(+e.target.value);return()=>+el.dataset.w}
// v5: "Apply for a discount". One offer per listing, held for BOOST_DISCOUNT_OFFER_HOURS, so re-ticking or reloading shows the same offer.
function boostSheet(l){const band=DB.discountBand();let offer=DB.boostOffer(l.id),on=!!offer;const paused="Discount offers are paused while boost demand is high. Check again later.";
 sheet(`<h3>Boost: ${esc(l.title)}</h3><p class="note" style="margin:0">Shown first in search with a gold ★ Featured badge. Pick how many weeks.</p>${boostWidget(BOOST.recommendedWeeks)}
 <div class="card box disc" id="bdbox"><label class="ck"><input type="checkbox" id="bdisc" ${on?"checked":""} ${band.off&&!offer?"disabled":""}> Apply for a discount </label>
  <p class="note" id="bdnote" style="margin:0">${band.off&&!offer?paused:`Tick to see your discount offer: ${band.min}% to ${band.max}% off, depending on current demand. One offer per listing, held for ${CFG.BOOST_DISCOUNT_OFFER_HOURS} hours. A boost never costs less than ${K(CFG.BOOST_PRICE_FLOOR_PER_WEEK)} a week.`}</p>
  <div id="boffer" class="offer hide"></div></div>
 <p class="note" style="margin:0" id="bwend"></p><button class="pill pill-gold" id="bwgo">Continue to payment</button><button class="pill pill-ghost" id="cx">Cancel</button>`);
 const q=w=>on&&offer?DB.boostQuote(w,offer.pct,offer):DB.boostQuote(w,0);
 const paint=w=>{$("#bwend").textContent=`Featured until about ${D(Math.max(DB.now(),l.boostUntil||0)+w*7*DB.DAY)}.`;const x=q(w);
  $("#sheet .bwtotal").innerHTML=x.total<x.was?`<s class="was">${K(x.was)}</s> ${K(x.total)}`:K(x.total);
  const bo=$("#boffer");if(!(on&&offer))return bo.classList.add("hide");bo.classList.remove("hide");
  bo.innerHTML=`<div class="sechead"><b>Your discount offer</b><span class="offpct">${offer.pct}% off</span></div><p class="offline">Was <s class="was">${K(x.was)}</s> · now <b class="now">${K(x.total)}</b> for ${w} week${w>1?"s":""} · you save ${K(x.saved)}</p><small class="note">${x.floorApplied?`Capped at the ${K(offer.floorPerWeek)}/week minimum price. `:""}Held for this listing until ${esc(new Date(offer.expires).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}.</small>`};
 const gw=bindBoost($("#sheet"),paint);paint(gw());
 const cb=$("#bdisc");cb.onchange=()=>{if(cb.checked){try{offer=DB.getBoostOffer(l.id)}catch(e){cb.checked=false;return toast(e.message)}
   if(!offer){cb.checked=false;cb.disabled=true;$("#bdnote").textContent=paused;on=false}else on=true}else on=false;paint(gw())};
 $("#cx").onclick=closeSheet;
 $("#bwgo").onclick=()=>{const w=gw(),x=q(w),d=on&&offer&&x.total<x.was?{offerId:offer.id,pct:offer.pct,was:x.was,floorApplied:x.floorApplied}:null;
  payFlow({purpose:"boost",amount:x.total,weeks:w,listingId:l.id,discount:d,label:`Boost ${w} week${w>1?"s":""}: ${l.title}${d?` (${d.pct}% discount offer)`:""}`,onDone:rerender})}}
function home2(){const y=scrollY;clearMaps();home();scrollTo(0,y)}
function grid(){
 let list=DB.publicListings();
 if(F.cities.length)list=list.filter(l=>F.cities.includes(l.city));
 if(F.types.length)list=list.filter(l=>F.types.includes(l.type));
 if(F.price!=null){const[,a,b]=PRICES[F.price];list=list.filter(l=>l.rent>=a&&l.rent<=b)}
 list=list.filter(l=>l.rent<=F.max);sortF(list);
 const empty=`<p class="empty">No listings${F.cities.length?` in ${esc(F.cities.join(", "))}`:" yet"}. <a href="#/account">List your property</a></p>`;
 $("#grid").innerHTML=list.length?list.map(card).join(""):empty;
 bindPhotoCarousels($("#grid"));
}
const pricingHTML=()=>`<section id="pricing"><div class="sechead"><h2>List your property</h2></div>
<p class="note">Landlords pay a monthly subscription to advertise. Tenants search free.</p><div class="tiers t4">
${CFG.PLANS.map(p=>`<div class="card tier${p.popular?" best":""}">${p.popular?'<span class="pop">Most popular</span>':p.tag?`<span class="pop start">${esc(p.tag)}</span>`:""}<h3>${esc(p.name)} </h3><p class="amt">${K(p.price)}<small>/mo</small></p><ul>${p.perks.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}
<div class="card tier"><h3>Boost / Featured </h3><p class="amt">${K(BOOST.week)}<small>/week</small></p><ul><li>Shown first in search</li><li>Gold ★ Featured badge</li><li>Choose 1 to ${BOOST.maxWeeks} weeks</li></ul></div></div>
<div class="card box boostcalc" id="pboost"><div class="sechead"><h3>Boost calculator</h3></div>${boostWidget(BOOST.recommendedWeeks)}
<div class="bundle"><b>Bundle example</b><p>Starter ${K(CFG.PLANS[0].price)} + 5-week boost ${K(5*BOOST.week)} = <b>${K(CFG.PLANS[0].price+5*BOOST.week)}</b></p><p>Landlord ${K(CFG.PLANS[1].price)} + 5-week boost ${K(5*BOOST.week)} = <b>${K(CFG.PLANS[1].price+5*BOOST.week)}</b></p><small class="note">A month is about 4.3 weeks, so a 5-week boost covers your whole paid month with a few days to spare.</small></div></div>
<div class="card box vfee"><div><h3>✓ Property verification </h3><p class="note" style="margin:0">Yearly fee per property. A REZ inspector visits, checks the photos and claims are true, and the listing earns the Verified badge for 12 months. Re-verification is due each year. If a tenant finds it doesn't match, it's taken off the site.</p></div><p class="amt">${K(CFG.VERIFICATION_FEE)}<small> /year</small></p></div>
<p class="note">Pay by mobile money (MTN or Airtel), Binance (USDT, ETH or BTC), or PayPal. We'll send payment details after you submit.</p></section>`;

// ---------- Payments ----------
/** Shows payment method choices. We'll send details after submit — no account numbers here. */
function payFlow({purpose,amount,listingId,label,planId,weeks,discount,onDone}){const u=DB.user();
 sheet(`<h3>${esc(label)}</h3><p class="amt" style="margin:0">${discount?`<s class="was">${K(discount.was)}</s> `:""}${K(amount)}</p>${discount?`<p class="note" style="margin:0">Your discount: ${discount.pct}% off</p>`:""}
 <p class="note" style="margin:0">How would you like to pay?</p>
 <div class="paygrid">${CFG.PAY_METHODS.map(m=>`<button class="paybtn" data-m="${m.id}" style="--pc:${m.color}"><i>${m.icon}</i>${esc(m.name)}</button>`).join("")}</div>
 <p class="note" style="margin:0">We'll send payment details after you submit. Our team confirms payments.</p>
 <button class="pill pill-ghost" id="cx">Cancel</button>`);
 $("#cx").onclick=closeSheet;
 document.querySelectorAll(".paybtn").forEach(b=>b.onclick=()=>{const m=CFG.PAY_METHODS.find(x=>x.id===b.dataset.m);
  const p=DB.createPayment({purpose,listingId,landlord:u?.id,amount,method:m.id,planId,weeks,discount});
  const msg=`Hi REZ, I submitted a payment for ${label} by ${m.name}. Reference: ${p.ref}`;
  sheet(`<h3>Submitted</h3><p class="note">We'll send payment details for <b>${esc(m.name)}</b> shortly. Your reference is <b>${esc(p.ref)}</b>. Status stays pending until our team confirms.</p>
  <a class="pill pill-green" id="wap" target="_blank" href="${wa(msg)}">Message REZ on WhatsApp</a>
  <button class="pill pill-ghost" id="cp">Copy reference</button><button class="pill pill-ghost" id="cx">Done</button>`);
  $("#cp").onclick=()=>{navigator.clipboard?.writeText(p.ref);toast("Reference copied")};
  $("#cx").onclick=()=>{closeSheet();onDone&&onDone(p)};$("#wap").onclick=()=>{closeSheet();onDone&&onDone(p)};
 });
}

// ---------- Detail ----------
function exampleDetail(l){
 app.innerHTML=`<article id="example-detail" class="detail fade"><a class="pill pill-ghost sm" href="#/">← Back to examples</a><div class="detail-hero" style="margin-top:16px">${photoCarousel(l.photos,{hero:true})}${tags(l)}</div><p class="city" style="margin-top:16px">${esc(l.city)} · ${esc(l.address)}</p><h2>${esc(l.title)}</h2><div class="card box"><strong>Example only — not a real property</strong><p class="note">${esc(l.disclosure)}</p><p class="note">Photos are illustrative stock images, not photos of this example property.</p></div><div class="kv"><div><small>Monthly rent</small><b>${K(l.rent)}</b></div><div><small>Bedrooms</small><b>${l.beds}</b></div><div><small>Bathrooms</small><b>${l.baths}</b></div><div><small>Deposit</small><b>${K(l.deposit)}</b></div><div><small>Upfront rent</small><b>${l.upfront} month(s)</b></div></div><div class="card box"><h3>About this example</h3><p class="note">${esc(l.description)}</p><p>${esc(l.yard)}</p></div><div class="card box"><h3>Example amenities</h3><div class="fl">${l.amenities.map(a=>`<span class="chip">${esc(a)}</span>`).join("")}</div></div><button class="pill pill-ghost" disabled aria-disabled="true">Enquiries unavailable — example only</button><p class="note">No application, payment, viewing or message will be sent. <a href="img/CREDITS.md">Stock photo credits</a>.</p></article>`;
 bindPhotoCarousels(app);
}
function detail(id){
 const l=DB.listing(id),u=DB.user();
 if(!l||(l.status!=="active"&&l.owner!==u?.id&&!isStaff(u))){app.innerHTML="<div class='card box' style='margin-top:20px'><h3>This listing isn't available right now</h3><p class='note'>It may be occupied or waiting for verification. <a href='#/' style='color:var(--g);font-weight:700'>Browse other homes</a></p></div>";return}
 if(l.sample)return exampleDetail(l);
 if(l.owner!==u?.id&&!isStaff(u))DB.trackView(id);
 // carousels bound after HTML set
 const meets=(u?.meets||{})[id]||[],saved=u?.saved?.includes(id);
 app.innerHTML=`<div class="detail fade"><a href="#/" class="note">← Back</a>${l.status!=="active"?`<div class="status-banner" style="margin:8px 0">Not public yet: ${esc(SLABEL[l.status])}. Only you and REZ staff can see this.</div>`:""}<div class="detail-hero">${photoCarousel(l.photos,{hero:true})}${tags(l)}</div>
 <div class="dgrid"><div><p class="city" style="margin-top:16px">${esc(l.city)} · ${TYPES[l.type]||""} · ${esc(l.address)}</p><h2>${esc(l.title)}</h2>
 <div class="kv"><div><small>Monthly rent</small><b>${K(l.rent)}</b></div><div><small>Security deposit</small><b>${K(l.deposit)}</b></div><div><small>Upfront</small><b>${l.upfront} month(s)</b></div><div><small>Yard / plot</small><b style="font-size:15px">${esc(l.yard||"—")}</b></div></div>
 ${l.leavingDate?`<div class="card box"><b>Available from ${esc(D(l.leavingDate))}</b><p class="note" style="margin:4px 0 0">The current tenant is moving out. Apply now to be next.</p></div>`:""}
 ${vvv(l)&&!l.sample&&l.inspection?`<div class="card box"><h3 class="vh">Verified</h3><p class="note" style="margin:0">Inspected by ${esc(l.inspection.inspector)} on ${esc(D(l.inspection.date))}. Photos and claims checked on site.${l.verifiedUntil?` Valid until ${esc(D(l.verifiedUntil))}.`:""}</p></div>`:""}
 <div class="card box"><small class="note">Move-in cost estimate: ${K(l.rent*l.upfront)} rent upfront + ${K(l.deposit)} deposit = <b>${K(l.rent*l.upfront+(+l.deposit))}</b></small></div>
 <div class="card box"><h3>Do you meet the criteria?</h3>${(l.criteria||[]).map((c,i)=>`<label class="ck"><input type="checkbox" data-i="${i}" ${meets.includes(i)?"checked":""} ${u?"":"disabled"}>${esc(c)}</label>`).join("")||"<p class='note'>No special requirements.</p>"}
 <p class="note" id="mt">${u?`You meet ${meets.length} of ${(l.criteria||[]).length}.`:'<a href="#/account" style="color:var(--g);font-weight:700">Sign in</a> to check criteria and apply.'}</p>
 <div class="btns">${l.owner!==u?.id?`<button class="pill pill-green" id="apply">Apply</button>`:""}<button class="pill pill-ghost" id="sv">${saved?"♥ Saved":"♡ Save"}</button><a class="pill pill-ghost" id="enq" target="_blank" href="${wa("Hi, I'm interested in: "+l.title+" ("+l.city+") on REZ Homes")}">WhatsApp</a><button class="pill pill-ghost sm" id="rep">Report: doesn't match</button></div></div>
 <div class="card box"><h3>Amenities</h3><div class="fl">${(l.amenities||[]).map(a=>`<span class="chip">${esc(a)}</span>`).join("")||"<p class='note'>Not listed.</p>"}</div></div></div>
 <div><div class="card box"><h3>Location</h3><div class="mini" id="mini"></div><button class="pill pill-gold" style="width:100%;margin-top:12px" id="dir">Directions</button><a class="pill pill-ghost" style="width:100%;margin-top:8px" id="sv3d" target="_blank" rel="noopener" href="${sv3d(l)}">🧭 View in 3D / Street View</a><p class="note" style="margin:6px 0 0;font-size:12px">Street View coverage varies in Zambia. No imagery? <a href="${sat3d(l)}" target="_blank" rel="noopener" id="sat3d" style="color:var(--g);font-weight:700">Open 3D satellite view</a>. Use the layer button on the map for satellite.</p></div></div></div>${recHTML("Similar homes","Same city, type or price range",recommend({cities:[l.city],types:[l.type],rent:l.rent},3,l.id))}</div>`;
 const m=mkMap("mini",[l.lat,l.lng],15,true);L.marker([l.lat,l.lng]).addTo(m);
 bindPhotoCarousels(app);
 $("#dir").onclick=()=>dirSheet(l);
 $("#enq").onclick=()=>DB.addEnquiry({listingId:id,landlord:l.owner,channel:"whatsapp",tenant:u?.id||null});
 $("#rep").onclick=()=>{location.href=wa(`Hi REZ, I'd like to report a listing that doesn't match: ${l.title} (${l.id}).`)};
 $("#sv").onclick=()=>{if(!u)return location.hash="#/account";const s=u.saved||[];DB.updateUser({saved:saved?s.filter(x=>x!==id):[...s,id]});toast(saved?"Removed from saved":"Saved");detail(id)};
 app.querySelectorAll(".ck input").forEach(c=>c.onchange=()=>{const v=[...app.querySelectorAll(".ck input:checked")].map(x=>+x.dataset.i);DB.updateUser({meets:{...(DB.user().meets||{}),[id]:v}});$("#mt").textContent=`You meet ${v.length} of ${l.criteria.length}.`});
 const ab=$("#apply");if(ab)ab.onclick=()=>u?applySheet(l):location.hash="#/account";
}
function sheet(html){const s=$("#sheet");s.innerHTML=`<div class="in">${html}</div>`;s.classList.remove("hide");s.onclick=e=>{if(e.target===s)closeSheet()}}
const closeSheet=()=>$("#sheet").classList.add("hide");
function dirSheet(l){
 if(l.sample)return toast("Approximate example area only — no real property directions.");
 sheet(`<h3>Directions to ${esc(l.title)}</h3><p class="note">${esc(l.address)}</p><a class="pill pill-green" id="go" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}">Start trip now</a><button class="pill pill-gold" id="later">Save trip for later</button><button class="pill pill-ghost" id="cx">Cancel</button>`);
 $("#go").onclick=closeSheet;$("#cx").onclick=closeSheet;
 $("#later").onclick=()=>{const u=DB.user();const t={id:l.id,title:l.title,lat:l.lat,lng:l.lng,at:Date.now()};if(u)DB.updateUser({trips:[...(u.trips||[]).filter(x=>x.id!==l.id),t]});else{const g=JSON.parse(localStorage.getItem("rez_guestTrips")||"[]").filter(x=>x.id!==l.id);g.push(t);localStorage.setItem("rez_guestTrips",JSON.stringify(g))}closeSheet();toast("Trip saved. Find it in Saved.")};
}
const OCC=[["student","Student"],["employed","Employed"],["self","Self-employed"],["none","Not working"],["other","Other"]];
const OCCL=Object.fromEntries(OCC),HH=[["single","Single"],["couple","Couple"],["family","Family"]],HHL=Object.fromEntries(HH);
const instLabel=o=>({student:"School / college / university",employed:"Employer",self:"Business name",none:"Anything to add",other:"Details"}[o]||"School or employer");
const segH=(id,opts,v)=>`<div class="seg wrapseg" id="${id}">${opts.map(([k,t])=>`<button type="button" class="${k===v?"on":""}" data-v="${k}">${t}</button>`).join("")}</div>`;
const segBind=(id,cb)=>{const r=$("#"+id);r.onclick=e=>{const b=e.target.closest("button");if(!b)return;r.querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");cb(b.dataset.v)}};
const hhText=a=>a.household==="family"?`Family · ${a.adults||1} adult${(a.adults||1)>1?"s":""}${+a.children?`, ${a.children} child${+a.children>1?"ren":""}`:""}`:a.household==="couple"?"Couple · 2 adults":a.household==="single"?"Single · 1 adult":`${a.people||1} people`;
function applySheet(l){const u=DB.user(),meets=(u.meets||{})[l.id]||[],pf=u.profile||{};let occ=pf.occupation||"student",hh=pf.household||"single",seen="";
 sheet(`<h3>Apply: ${esc(l.title)}</h3><p class="note" style="margin:0">You ticked ${meets.length} of ${(l.criteria||[]).length} criteria. The landlord sees this and the details below.</p>
 <form class="f" id="af"><input name="name" required placeholder="Full name" value="${esc(u.name)}"><input name="phone" required placeholder="Phone / WhatsApp (e.g. 097...)" value="${esc(u.phone||"")}">
 <span class="lbl">I am</span>${segH("occ",OCC,occ)}
 <input name="institution" id="inst" placeholder="${instLabel(occ)} (optional)" value="${esc(pf.institution||"")}">
 <input name="fromTown" required placeholder="Coming from which city / town? (e.g. Kasama)" value="${esc(pf.fromTown||"")}">
 <span class="lbl">Who will live here</span>${segH("hh",HH,hh)}
 <div class="row" id="fam" style="${hh==="family"?"":"display:none"}"><label class="mini-l">Adults<input name="adults" type="number" min="1" max="20" value="${esc(pf.adults||2)}"></label><label class="mini-l">Children<input name="children" type="number" min="0" max="20" value="${esc(pf.children??0)}"></label></div>
 <span class="lbl">Have you already seen this property?</span>${segH("seen",[["yes","Yes, seen it"],["no","No, I'd like to view it"]],"")}
 <span class="lbl">Move-in date</span><input name="moveIn" type="date" required>
 <textarea name="msg" rows="2" placeholder="Message to the landlord (optional)"></textarea>
 <label class="ck"><input type="checkbox" name="save" checked> Save these details to my profile</label>
 <p class="note" id="aerr" style="color:#c33;margin:0"></p><button class="pill pill-green">Submit application</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 segBind("occ",v=>{occ=v;$("#inst").placeholder=instLabel(v)+" (optional)"});segBind("hh",v=>{hh=v;$("#fam").style.display=v==="family"?"":"none"});segBind("seen",v=>seen=v);
 $("#cx").onclick=closeSheet;
 $("#af").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(!seen)return $("#aerr").textContent="Tell the landlord whether you've already seen the property.";
  const adults=hh==="family"?Math.max(1,+d.adults||1):hh==="couple"?2:1,children=hh==="family"?Math.max(0,+d.children||0):0;
  const prof={occupation:occ,institution:d.institution.trim(),fromTown:d.fromTown.trim(),household:hh,adults,children};
  if(d.save)DB.saveTenantProfile(prof);if(!u.phone)DB.updateUser({phone:d.phone});
  DB.apply({name:d.name,phone:d.phone,moveIn:d.moveIn,msg:d.msg,...prof,people:adults+children,seen,listingId:l.id,listingTitle:l.title,landlord:l.owner,tenant:u.id,tenantEmail:u.email,meets:meets.map(i=>l.criteria[i]),criteriaTotal:(l.criteria||[]).length});
  closeSheet();toast("Application sent");location.hash="#/account"};
}
// ---------- Applicant card (landlord) ----------
const initials=n=>String(n||"?").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();
function applicantCard(a){const pct=a.criteriaTotal?Math.round(100*a.meets.length/a.criteriaTotal):100;
 return`<div class="appcard" data-app="${a.id}"><div class="ach"><div class="av">${esc(initials(a.name))}</div><div style="flex:1;min-width:0"><b>${esc(a.name)}</b><small class="note" style="display:block;margin:0">${esc(a.listingTitle)} · applied ${D(a.created)}</small></div><span class="st ${a.status==="Submitted"?"warn":a.status==="Declined"?"bad":""}">${esc(a.status==="Submitted"?"New":a.status)}</span></div>
 <div class="facts"><span title="Occupation">${a.occupation==="student"?"🎓":a.occupation==="employed"?"💼":a.occupation==="self"?"🏪":"👤"} ${esc(OCCL[a.occupation]||"Not given")}${a.institution?` · ${esc(a.institution)}`:""}</span>
  <span title="Coming from">📍 From ${esc(a.fromTown||"not given")}</span><span title="Household">${a.household==="family"?"👪":a.household==="couple"?"👫":"🧍"} ${esc(hhText(a))}</span>
  <span class="${a.seen==="yes"?"seen":"view"}">${a.seen==="yes"?"✓ Already seen the property":a.seen==="no"?"🗓 Wants to view it first":"Viewing: not stated"}</span><span>📅 Move-in ${esc(a.moveIn||"—")}</span><span>📞 ${esc(a.phone)}</span></div>
 <div class="crit"><div class="sechead"><small>Meets ${a.meets.length} of ${a.criteriaTotal} criteria</small><small>${pct}%</small></div><div class="bar"><i style="width:${pct}%"></i></div>${a.meets.length?`<small class="note" style="margin:4px 0 0;display:block">${esc(a.meets.join(" · "))}</small>`:""}</div>
 ${a.msg?`<p class="amsg">“${esc(a.msg)}”</p>`:""}
 ${a.status==="Accepted"?`<p class="note" style="margin:6px 0 0">${a.viewingAt?`Viewing invite sent for <b>${esc(new Date(a.viewingAt).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}</b>`:"Told to confirm and pay to secure it (first come, first served)"} · <a href="#" data-prev="${a.id}" style="color:var(--g);font-weight:700">See messages</a></p>`:""}
 ${a.status==="Submitted"?`<div class="btns"><button class="pill pill-green sm" data-acc="${a.id}">Accept</button><button class="pill pill-ghost sm" data-dec="${a.id}">Decline</button><a class="pill pill-ghost sm" target="_blank" rel="noopener" href="${REZ_TPL.waLink(a.phone,`Hi ${a.name.split(" ")[0]}, about your REZ Homes application for ${a.listingTitle}`)}">WhatsApp</a></div>`:""}</div>`}
function acceptSheet(a,done){const seen=a.seen==="yes";const min=new Date(DB.now()+36e5).toISOString().slice(0,16);
 sheet(`<h3>Accept ${esc(a.name)}</h3>${seen?`<div class="card box" style="box-shadow:none;background:var(--g2);margin:0"><b>They've already seen the property.</b><p class="note" style="margin:4px 0 0">We'll tell them: <i>“Accepted. First come, first served: confirm and pay to secure it.”</i></p></div>`:`<div class="card box" style="box-shadow:none;background:var(--gold2);margin:0"><b>They'd like to view it first.</b><p class="note" style="margin:4px 0 0">Propose a viewing time. We'll tell them: <i>“Your application was accepted. The landlord invites you to view the property.”</i></p></div>`}
 <form class="f" id="accf">${seen?"":`<span class="lbl">Viewing date and time</span><input type="datetime-local" name="viewingAt" required min="${min}">`}<textarea name="note" rows="2" placeholder="Note to the applicant (optional), e.g. ask for the caretaker at the gate"></textarea>
 <p class="note" id="acerr" style="color:#c33;margin:0"></p><button class="pill pill-green">Accept and notify</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 $("#cx").onclick=closeSheet;$("#accf").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{const n=DB.acceptApplication(a.id,d);msgPreviewSheet(n,a,done)}catch(x){$("#acerr").textContent=x.message}}}
// Channel templates from templates.js. Delivery stays off until switched on.
function msgPreviewSheet(n,a,done){const data=n.data,key=n.key;let ch="in_app";
 const body=()=>{const r=REZ_TPL.render(key,ch,data)||{};return`${r.subject?`<p class="note" style="margin:0"><b>Subject:</b> ${esc(r.subject)}</p>`:""}${r.title?`<b>${esc(r.title)}</b>`:""}<pre class="msgbody">${esc(r.body)}</pre>`};
 sheet(`<h3>${a.tenantView?"Message versions":"Notification created"}</h3><p class="note" style="margin:0">${a.tenantView?"How this message will reach you at launch.":esc(a.name)+" sees this in their REZ inbox now."}</p><div class="tabs mini" id="cht">${REZ_TPL.CHANNELS.map(([k,t])=>`<button class="${k===ch?"on":""}" data-c="${k}">${t}</button>`).join("")}</div>
 <div class="card box msgprev" id="mp">${body()}</div><p class="note" id="dlv">Email, SMS and WhatsApp copies are ready — we send them once delivery is switched on.</p>
 ${a.tenantView?"":`<a class="pill pill-green" id="wact" target="_blank" rel="noopener" href="${REZ_TPL.waLink(a.phone,(REZ_TPL.render(key,"whatsapp",data)||{}).body)}">Open WhatsApp chat with ${esc(a.name.split(" ")[0])} (prefilled)</a>`}<button class="pill pill-ghost" id="cx">Done</button>`);
 $("#cht").onclick=e=>{const b=e.target.closest("button");if(!b)return;ch=b.dataset.c;$("#cht").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));$("#mp").innerHTML=body()};
 $("#cx").onclick=()=>{closeSheet();done&&done()};const wl=$("#wact");if(wl)wl.onclick=()=>{closeSheet();done&&done()}}
// ---------- Map ----------
function mapView(){
 app.innerHTML=`<div class="fade"><div class="sechead" style="margin-top:20px"><h2>Map</h2></div><div class="mapbig" id="bigmap"></div></div>`;
 const m=mkMap("bigmap",[-13.9,28.0],6,true),ls=DB.publicListings();
 ls.forEach(l=>L.marker([l.lat,l.lng]).addTo(m).bindPopup(`<b>${esc(l.title)}</b><br>${K(l.rent)}/month · ${esc(l.city)}<br><a href="#/l/${l.id}">View</a> · <a href="#" class="pdir" data-id="${l.id}">Directions</a><br><a href="${sv3d(l)}" target="_blank" rel="noopener" class="p3d">🧭 3D / Street View</a> · <a href="${sat3d(l)}" target="_blank" rel="noopener">Satellite</a><br><small style="color:#6B7A72">Street View coverage varies</small>`));
 m.on("popupopen",e=>{const a=e.popup.getElement().querySelector(".pdir");if(a)a.onclick=ev=>{ev.preventDefault();dirSheet(DB.listing(a.dataset.id))}});
}

// ---------- Saved ----------
function savedView(){const u=DB.user(),trips=u?u.trips||[]:JSON.parse(localStorage.getItem("rez_guestTrips")||"[]"),sv=(u?.saved||[]).map(DB.listing).filter(Boolean);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><h2>Saved</h2><div class="card box"><h3>Saved trips</h3><div class="list">${trips.map(t=>`<div class="it"><a href="#/l/${t.id}"><b>${esc(t.title)}</b></a><a class="pill pill-green sm" target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}">Start trip</a></div>`).join("")||"<p class='note'>No saved trips yet. Tap Directions on a listing, then Save trip for later.</p>"}</div></div>
 <div class="card box"><h3>Saved homes</h3>${u?`<div class="grid">${sv.map(card).join("")||"<p class='note'>Nothing saved yet.</p>"}</div>`:"<p class='note'><a href='#/account' style='color:var(--g);font-weight:700'>Sign in</a> to save homes.</p>"}</div></div>`}

// ---------- Account / profile ----------
let AUTHROLE="tenant";
/** Account home: everyone starts as a tenant; apply from here to become a landlord or agent. */
function account(){const u=DB.user();if(!u)return authView("in");
 const apps=DB.applications().filter(a=>a.tenant===u.id);
 const llApp=DB.latestRoleApp("landlord"), agApp=DB.latestRoleApp("agent");
 const roles=new Set([u.role,...(u.roles||["tenant"])]);
 const statusLine=a=>!a?"Not applied":a.status==="submitted"?"Submitted — we review and approve or decline":a.status==="under_review"?"Under review":a.status==="approved"?"Approved":a.status==="declined"?`Declined${a.reviewNote?" — "+a.reviewNote:""}`:esc(a.status);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>Hi, ${esc(u.name.split(" ")[0])}</h2><button class="pill pill-ghost sm" id="so">Sign out</button></div>
 <div class="card box"><h3>Your account</h3><p>${esc(u.email)}${u.google?" · Google":""}</p>
 <form class="f" id="pf" style="margin:10px 0"><input name="phone" placeholder="Phone / WhatsApp (e.g. 097...)" value="${esc(u.phone||"")}"><button class="pill pill-ghost sm">Save phone</button></form>
 <p class="note" style="margin:0">You can rent and apply for homes with this account. Become a landlord or agent when you're ready.</p></div>
 ${tenantProfileHTML(u)}
 <div class="card box"><h3>Become a landlord</h3>
  <p class="note">${statusLine(llApp)}</p>
  ${roles.has("landlord")?`<a class="pill pill-gold" href="#/landlord">Open landlord portal</a>`:`<button class="pill pill-gold" id="applyLL">Apply as landlord</button>`}</div>
 <div class="card box"><h3>Become an agent</h3>
  <p class="note">${statusLine(agApp)}</p>
  ${roles.has("agent")?`<a class="pill pill-gold" href="#/agent">Open agent tasks</a>`:`<button class="pill pill-gold" id="applyAG">Apply as agent</button>`}
  <a class="pill pill-ghost sm" href="#/agent-info" style="margin-top:8px">How REZ agents work</a></div>
 <div class="card box"><div class="sechead"><h3>Notifications</h3><a class="pill pill-ghost sm" href="#/inbox">Open inbox${DB.unread()?` (${DB.unread()} new)`:""}</a></div></div>
 <div class="card box"><h3>My applications</h3><div class="list">${apps.map(a=>`<div class="it"><a href="#/l/${a.listingId}">${esc(a.listingTitle)}<br><small class="note">Move-in ${esc(a.moveIn)}</small></a><span class="st">${esc(a.status)}</span></div>`).join("")||"<p class='note'>No applications yet.</p>"}</div></div>
 <div class="card box"><h3>Saved</h3><p class="note">${(u.saved||[]).length} homes · ${(u.trips||[]).length} trips. <a href="#/saved" style="color:var(--g);font-weight:700">Open Saved</a></p></div></div>`;
 $("#so").onclick=()=>{DB.signOut();toast("Signed out");route()};
 bindTenantProfile();
 const pf=$("#pf");if(pf)pf.onsubmit=e=>{e.preventDefault();DB.updateUser({phone:new FormData(pf).get("phone")});toast("Saved")};
 const aLL=$("#applyLL");if(aLL)aLL.onclick=()=>roleApplicationSheet("landlord");
 const aAG=$("#applyAG");if(aAG)aAG.onclick=()=>roleApplicationSheet("agent");
}

/** Collects ID and documents for a landlord or agent application (file names only — never uploaded to a public repo). */
function roleApplicationSheet(kind){
 const isLL=kind==="landlord";
 sheet(`<h3>Apply as ${isLL?"landlord":"agent"}</h3>
 <p class="note" style="margin:0">We review and approve or decline. Files stay on this device for now — only the file name is saved.</p>
 <form class="f" id="raf">
  <span class="lbl">ID type</span>
  <div class="seg" id="idtype"><button type="button" class="on" data-v="nrc">NRC</button><button type="button" data-v="licence">Driving licence</button><button type="button" data-v="passport">Passport</button></div>
  <input name="idNumber" required placeholder="ID number">
  <span class="lbl">Photo of your ID</span><input type="file" id="idfile" accept="image/*,.pdf" required>
  <span class="lbl">Selfie holding your ID</span><input type="file" id="selfie" accept="image/*" required>
  <input name="address" required placeholder="Home address / area">
  <input name="tpin" required placeholder="TPIN">
  ${isLL?`<span class="lbl">Proof of ownership (title deed or land document)</span>
  <label class="ck"><input type="radio" name="own" value="upload" checked> Upload a photo</label>
  <label class="ck"><input type="radio" name="own" value="email"> I'll email the documents instead</label>
  <input type="file" id="ownfile" accept="image/*,.pdf">
  <p class="note" id="ownemail" style="display:none;margin:0">Email your documents to REZ after you submit. We'll reply with the address.</p>`:""}
  <p class="note" id="raerr" style="color:#c33;margin:0"></p>
  <button class="pill pill-green">Submit application</button>
  <button type="button" class="pill pill-ghost" id="cx">Cancel</button>
 </form>`);
 let idType="nrc";
 $("#idtype").onclick=e=>{const b=e.target.closest("button");if(!b)return;$("#idtype").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");idType=b.dataset.v};
 const ownRadios=[...document.querySelectorAll('input[name=own]')];
 ownRadios.forEach(r=>r.onchange=()=>{const email=r.value==="email"&&r.checked;const of=$("#ownfile"),oe=$("#ownemail");if(of)of.style.display=email?"none":"";if(oe)oe.style.display=email?"":"none"});
 $("#cx").onclick=closeSheet;
 $("#raf").onsubmit=e=>{e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target));
  const idf=$("#idfile")?.files?.[0], sf=$("#selfie")?.files?.[0], of=$("#ownfile")?.files?.[0];
  if(!idf||!sf)return $("#raerr").textContent="Add your ID photo and selfie.";
  const own=(document.querySelector('input[name=own]:checked')||{}).value||"upload";
  if(isLL&&own==="upload"&&!of)return $("#raerr").textContent="Add proof of ownership, or choose email instead.";
  try{
    DB.submitRoleApplication(kind,{
      idType,idNumber:d.idNumber,address:d.address,tpin:d.tpin,
      idFileName:idf.name,selfieFileName:sf.name,
      ownershipVia:isLL?own:null,ownershipFileName:isLL&&of?of.name:null,
      agentId:kind==="agent"?("REZ-AG-"+Math.random().toString(36).slice(2,8).toUpperCase()):null
    });
    // Move to under_review immediately so the status line reads clearly
    const app=DB.latestRoleApp(kind); if(app) DB.setRoleAppStatus(app.id,"under_review");
    closeSheet();toast("Application submitted — we review and approve or decline");account();
  }catch(x){$("#raerr").textContent=x.message}};
}

function tenantProfileHTML(u){const p=u.profile||{};return`<div class="card box" id="tprof"><div class="sechead"><h3>About me</h3><span class="note" style="margin:0">Landlords see this when you apply</span></div>
 <form class="f" id="tpf"><span class="lbl">I am</span>${segH("tocc",OCC,p.occupation||"")}<input name="institution" placeholder="School or employer (optional)" value="${esc(p.institution||"")}"><input name="fromTown" placeholder="Coming from (city / town)" value="${esc(p.fromTown||"")}">
 <span class="lbl">Household</span>${segH("thh",HH,p.household||"")}<div class="row" id="tfam" style="${p.household==="family"?"":"display:none"}"><label class="mini-l">Adults<input name="adults" type="number" min="1" value="${esc(p.adults||2)}"></label><label class="mini-l">Children (optional)<input name="children" type="number" min="0" value="${esc(p.children??0)}"></label></div>
 <button class="pill pill-ghost sm">Save profile</button></form></div>`}
function bindTenantProfile(){const f=$("#tpf");if(!f)return;const p=DB.user().profile||{};let occ=p.occupation,hh=p.household;segBind("tocc",v=>occ=v);segBind("thh",v=>{hh=v;$("#tfam").style.display=v==="family"?"":"none"});
 f.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));DB.saveTenantProfile({occupation:occ||"",institution:d.institution.trim(),fromTown:d.fromTown.trim(),household:hh||"",adults:hh==="family"?Math.max(1,+d.adults||1):hh==="couple"?2:1,children:hh==="family"?Math.max(0,+d.children||0):0});toast("Profile saved")}}
/** Sign-in / create-account. New accounts are tenants by default. */
function authView(mode){
 app.innerHTML=`<div class="fade" style="max-width:440px;margin:30px auto"><div class="card box"><div class="seg" id="mode"><button class="${mode==="in"?"on":""}" data-m="in">Sign in</button><button class="${mode==="up"?"on":""}" data-m="up">Create account</button></div>
 <form class="f" id="auth" style="margin-top:14px">${mode==="up"?`<input name="name" required placeholder="Full name"><input name="phone" placeholder="Phone / WhatsApp (optional)">`:""}
 <input name="email" type="email" required placeholder="Email"><input name="password" type="password" required minlength="6" placeholder="Password (min 6)">
 <p class="note" id="err" style="color:#c33;margin:0"></p><button class="pill pill-green">${mode==="up"?"Create account":"Sign in"}</button></form>
 <p class="note" style="text-align:center">or</p><button class="pill gbtn" id="g"><b style="color:#4285F4">G</b>&nbsp; Continue with Google</button>
 </div>
 <p class="note" style="text-align:center;margin-top:12px">New accounts can rent and apply straight away. Become a landlord or agent from Account after you sign in.</p></div>`;
 $("#mode").onclick=e=>{const b=e.target.closest("button");if(b)authView(b.dataset.m)};
 $("#auth").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{mode==="up"?DB.signUp({...d,role:"tenant"}):DB.signIn(d.email,d.password);toast("Welcome!");route()}catch(x){$("#err").textContent=x.message}};
 $("#g").onclick=()=>{const email="google.user."+Date.now()+"@example.com";try{DB.signUp({name:"Google User",email,password:"google-oauth",role:"tenant",google:true});toast("Welcome!");route()}catch(x){$("#err")&&($("#err").textContent=x.message)}};
}
/** Days a listing has been live since verification (or creation). */
const daysListed=l=>l.verifiedAt||l.created?Math.max(0,Math.floor((DB.now()-(l.verifiedAt||l.created))/DB.DAY)):0;
function vstepper(l){if(l.vstatus==="rejected")return`<div class="steps"><span class="s bad">✕ Rejected</span></div>`;const i=VSTEPS.findIndex(s=>s[0]===l.vstatus);
 return`<div class="steps">${VSTEPS.map((s,j)=>`<span class="s${j<i?" done":j===i?" cur":""}">${j<i?"✓ ":""}${s[1]}</span>`).join("")}</div>`}
/** Renders the landlord portal: plan, listings and applicant actions. */
function landlord(){const u=DB.user();if(!u){toast("Sign in as a landlord first");return authView("up")}
 if(isStaff(u))return location.hash="#/admin";
 if(u.role!=="landlord")return app.innerHTML=`<div class="card box" style="margin-top:20px"><h3>Landlord portal</h3><p class="note">Your account is set to Tenant.</p><button class="pill pill-gold" id="sw">Switch to landlord</button></div>`,$("#sw").onclick=()=>{DB.updateUser({role:"landlord"});landlord()};
 const mine=DB.listings().filter(l=>l.owner===u.id),apps=DB.applications().filter(a=>a.landlord===u.id),enq=DB.enquiries().filter(e=>e.landlord===u.id),pl=DB.plan(u),sub=DB.subActive(u);
 const tv=mine.reduce((a,l)=>a+l.views,0),act=mine.filter(l=>l.status==="active").length;
 const wk=DB.viewlog().filter(v=>mine.some(l=>l.id===v.id)&&v.at>DB.now()-7*DB.DAY).length;
 const payments=DB.payments().filter(p=>p.landlord===u.id);
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>Landlord portal</h2></div>
 <div class="card box profile"><div class="av">${esc(u.name[0]||"?")}</div><div style="flex:1"><h3 style="margin:0">${esc(u.name)}</h3><p class="note" style="margin:2px 0">${esc(u.email)} · ${esc(u.phone||"no phone yet")}</p>
  <p style="margin:6px 0 0"><b>${esc(pl.name)}</b> plan · ${K(pl.price)}/mo  · ${sub?`<span class="st">Paid until ${D(u.subPaidUntil)}</span>`:`<span class="st warn">${u.subPaidUntil?"Expired "+D(u.subPaidUntil):"Not paid yet"}</span>`}</p></div>
  <div class="btns"><button class="pill pill-green sm" id="paysub">${sub?"Pay next month":"Pay 1 month"} (${K(pl.price)})</button></div></div>
 <div class="seg" id="plan" style="margin-bottom:14px">${CFG.PLANS.map(p=>`<button class="${p.id===pl.id?"on":""}" data-p="${p.id}">${esc(p.name)} ${K(p.price)}</button>`).join("")}</div>
 <div class="kpis"><div class="card"><small>Total views</small><b>${tv}</b><em>${wk} this week</em></div><div class="card"><small>Enquiries</small><b>${enq.length}</b><em>WhatsApp taps</em></div><div class="card"><small>Applications</small><b>${apps.length}</b><em>${apps.filter(a=>a.status==="Accepted").length} accepted</em></div><div class="card"><small>Active listings</small><b>${act}/${pl.listings>99?"∞":pl.listings}</b><em>${tv?Math.round(100*(enq.length+apps.length)/tv):0}% view→contact</em></div></div>
 ${upgradeHTML(u,pl,mine,tv)}
 <div class="card box"><div class="sechead"><h3>My listings</h3><button class="pill pill-gold sm" id="addbtn">+ Add listing</button></div>
 <div class="mylist">${mine.map(l=>{const la=apps.filter(a=>a.listingId===l.id).length,le=enq.filter(e=>e.listingId===l.id).length;return`<div class="ml" data-id="${l.id}"><img src="${esc(l.photos?.[0]||"img/p1.jpg")}"><div class="mlb"><div class="sechead"><a href="#/l/${l.id}"><b>${esc(l.title)}</b></a><span class="st s-${l.status}">${esc(SLABEL[l.status])}</span></div>
  <small class="note">${esc(l.city)} · ${K(l.rent)}/mo${isFeat(l)?" · ★ Featured":""}${l.leavingDate?` · tenant leaving ${D(l.leavingDate)}`:""}</small>${vstepper(l)}
  <div class="mstats"><span><b>${l.views}</b> views</span><span><b>${le}</b> enquiries</span><span><b>${la}</b> applications</span><span><b>${daysListed(l)}</b> days listed</span><span>Verification: <b>${esc(vstatusLabel(l))}</b>${l.verifiedUntil&&!l.vexpired?` · until ${D(l.verifiedUntil)}`:""}</span>${isFeat(l)&&l.boostUntil?`<span>★ Boosted until <b>${D(l.boostUntil)}</b></span>`:""}<span>Fee due: <b>${l.vstatus==="awaiting_payment"&&!l.payConfirmed?`${K(CFG.VERIFICATION_FEE)} verification now`:["draft","verification","rejected"].includes(l.status)?"after verification":l.status==="occupied"?"paused while occupied":sub?D(u.subPaidUntil):`${K(pl.price)} now`}</b></span></div>
  ${l.vstatus==="rejected"&&l.inspection?.notes?`<p class="note" style="margin:6px 0">Inspector notes: ${esc(l.inspection.notes)}</p>`:""}${l.inspection?.scheduledFor&&l.vstatus==="inspection_scheduled"?`<p class="note" style="margin:6px 0">Inspection ${D(l.inspection.scheduledFor)} with ${esc(l.inspection.inspector)}</p>`:""}
  <div class="btns">${actionsFor(l,sub)}</div></div></div>`}).join("")||"<p class='note'>No listings yet. Add your first property below.</p>"}</div></div>
 <div class="card box hide" id="addbox"><h3>Add a property</h3>${listingForm()}</div>
 <div class="card box" id="recv"><div class="sechead"><h3>Received applications</h3><span class="note" style="margin:0">${apps.filter(a=>a.status==="Submitted").length} new</span></div><div class="appcards">${apps.slice().reverse().map(applicantCard).join("")||"<p class='note'>No applications yet.</p>"}</div></div>
 <div class="card box"><h3>Payment references</h3><div class="list">${payments.slice().reverse().map(p=>`<div class="it"><div><b>${p.ref}</b><br><small class="note">${esc(p.purpose)} · ${K(p.amount)} · ${esc(p.method)} · ${D(p.created)}</small></div><span class="st ${p.status==="pending"?"warn":""}">${p.status==="pending"?"Awaiting payment":"Recorded · Boaz to verify"}</span></div>`).join("")||"<p class='note'>None yet. Payment references appear here after you submit.</p>"}</div></div>
 ${careHTML()}
 ${pricingHTML()}</div>`;
 app.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{const np=CFG.PLANS.find(p=>p.id===b.dataset.up);DB.updateUser({plan:np.id});payFlow({purpose:"subscription",amount:np.price,label:`${np.name} plan, 1 month`,planId:np.id,onDone:rerender})});
 if(!mine.length)$("#addbox").classList.remove("hide");
 $("#addbtn").onclick=()=>{$("#addbox").classList.remove("hide");$("#addbox").scrollIntoView({behavior:"smooth"});setTimeout(()=>maps.forEach(m=>m.invalidateSize()),300)};
 $("#plan").onclick=e=>{const b=e.target.closest("button");if(!b)return;DB.updateUser({plan:b.dataset.p});toast("Plan set to "+b.textContent+" (applies from your next payment)");rerender()};
 $("#paysub").onclick=()=>payFlow({purpose:"subscription",amount:pl.price,label:`${pl.name} plan, 1 month`,planId:pl.id,onDone:rerender});
 bindListingForm(u);
 app.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>listingAction(b.dataset.act,DB.listing(b.closest(".ml").dataset.id),u));
 const A=id=>DB.applications().find(x=>x.id===id);
 app.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>acceptSheet(A(b.dataset.acc),rerender));
 app.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{if(!confirm("Decline this application? The applicant gets a polite notice."))return;DB.declineApplication(b.dataset.dec);toast("Declined · applicant notified");rerender()});
 app.querySelectorAll("[data-prev]").forEach(b=>b.onclick=e=>{e.preventDefault();const a=A(b.dataset.prev),n=DB.notifications(a.tenant).find(x=>x.appId===a.id&&x.key!=="application_declined");if(n)msgPreviewSheet(n,a)});
}
function upgradeHTML(u,pl,mine,tv){const live=Math.max(1,mine.filter(l=>["active","occupied","expired"].includes(l.status)).length),vpl=tv/live;
 const gain=(p)=>{if(p.listings>99)return"Upgrade to get unlimited listings, top spot on the homepage and a gold ★ Featured badge, so tenants see you first";const extra=p.listings-pl.listings;return vpl>0?`Upgrade to get about ${Math.round(vpl*extra)} more views: room for ${extra} more listings at your current ${Math.round(vpl)} views per listing (estimate)`:`Upgrade to get more views: room for ${extra} more listings, so more tenants find you`};
 return`<div class="card box"><div class="sechead"><h3>Grow with REZ</h3></div><p class="note" style="margin-top:0">Start small, upgrade when you're ready. Each step puts your properties in front of more tenants.</p>
 <div class="ladder">${CFG.PLANS.map((p,i)=>`<div class="rung${p.id===pl.id?" cur":""}${p.tier<pl.tier?" past":""}"><div class="sechead"><b>${i+1}. ${esc(p.name)}</b><span>${K(p.price)}/mo</span></div>${p.popular?'<span class="tag f" style="margin:4px 0">Most popular</span>':p.tag?`<span class="tag v" style="margin:4px 0">${esc(p.tag)}</span>`:""}<ul>${p.perks.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
  ${p.id===pl.id?'<p class="note" style="margin:6px 0 0"><b>Your plan</b></p>':p.tier>pl.tier?`<p class="gain">${esc(gain(p))}</p><button class="pill pill-green sm" data-up="${p.id}">Upgrade to ${esc(p.name)}</button>`:""}</div>${i<CFG.PLANS.length-1?'<div class="arrow">›</div>':""}`).join("")}</div></div>`}
const CARE=[["🧹","Keep it clean and fresh","First impressions count. Sweep, air out the rooms and clear the yard before every viewing. A tidy place rents faster and for a better price."],
 ["📸","Great photos sell","Shoot in daylight with doors and curtains open. Show every room, the bathroom, kitchen, yard and the street. Our inspectors check that photos match, so keep them honest and up to date."],
 ["⚡","Reply quickly","Tenants message several landlords at once. Answering on WhatsApp within an hour often decides who gets the tenant. Turn on notifications for REZ enquiries."],
 ["🔧","Fix small things early","A dripping tap, a broken lock or a loose socket puts tenants off and grows into a big bill. Check water, power, locks and the roof every few months."],
 ["🤝","Be clear about money","Put the rent, deposit and upfront months in your listing and stick to them. Give receipts. Clear terms build trust and bring referrals."],
 ["📅","Plan ahead for move-outs","When a tenant gives notice, tap \"Tenant leaving soon\" so new tenants can apply before the room goes empty."]];
const careHTML=()=>`<div class="card box"><h3>Property care tips from REZ</h3><p class="note" style="margin-top:0">A well-kept home earns more and fills faster. Here's what works for landlords across Zambia.</p><div class="care">${CARE.map(c=>`<div><i>${c[0]}</i><b>${esc(c[1])}</b><p>${esc(c[2])}</p></div>`).join("")}</div></div>`;
const rerender=()=>{const y=scrollY;clearMaps();route(true);scrollTo(0,y)};
/** Builds the action buttons for one landlord listing row. */
function actionsFor(l,sub){const b=(a,t,c="pill-ghost")=>`<button class="pill ${c} sm" data-act="${a}">${t}</button>`;const renewB=l=>l.vexpired&&!l.renewalPaid?b("renew",`Renew verification ${K(CFG.VERIFICATION_FEE)}/yr`,"pill-green"):"";
 switch(l.status){
  case"draft":return b("submit","Submit for verification","pill-green");
  case"verification":return l.vstatus==="awaiting_payment"&&!l.payConfirmed?b("payverify",`Pay verification fee ${K(CFG.VERIFICATION_FEE)}`,"pill-green"):`<span class="note">REZ staff will contact you to inspect the property.</span>`;
  case"rejected":return b("resubmit","Fix & resubmit");
  case"unpaid":return`<button class="pill pill-green sm" data-act="paysub">Pay 1 month to go live (${K(DB.plan(DB.user()).price)})</button>`;
  case"active":return b("occupied","Mark occupied (hide)")+b("boost",isFeat(l)?"★ Extend boost":`★ Boost from ${K(BOOST.week)}/wk`,"pill-gold")+renewB(l);
  case"occupied":return b("reactivate","Reactivate","pill-green")+b("leaving","Tenant leaving soon","pill-gold")+renewB(l);
  case"expired":return b("reactivate",`Reactivate (pay 1 month)`,"pill-green")+b("occupied","It's occupied")+renewB(l);
 }return""}
function listingAction(a,l,u){const pl=DB.plan(u);
 if(a==="submit"||a==="resubmit"){DB.submitForVerification(l.id);toast("Submitted for verification");return rerender()}
 if(a==="payverify")return payFlow({purpose:"verification",amount:CFG.VERIFICATION_FEE,listingId:l.id,label:`Verification: ${l.title}`,onDone:rerender});
 if(a==="boost")return boostSheet(l);
 if(a==="renew")return payFlow({purpose:"verification",amount:CFG.VERIFICATION_FEE,listingId:l.id,label:`Annual re-verification: ${l.title}`,onDone:rerender});
 if(a==="paysub")return payFlow({purpose:"subscription",amount:pl.price,label:`${pl.name} plan, 1 month`,planId:pl.id,onDone:rerender});
 if(a==="occupied"){DB.markOccupied(l.id,"landlord");toast("Hidden from search. It stays verified.");return rerender()}
 const after=r=>{if(r.limit)return toast(`Your ${pl.name} plan allows ${pl.listings} active listing(s). Upgrade or hide another.`);
  if(r.reverify){toast("REZ asked to re-inspect this property before it goes live");return rerender()}
  if(r.needPayment){rerender();return payFlow({purpose:"subscription",amount:pl.price,label:`${pl.name} plan, 1 month (reactivate)`,planId:pl.id,onDone:rerender})}
  toast("Live again");rerender()};
 if(a==="reactivate")return after(DB.reactivate(l.id));
 if(a==="leaving"){sheet(`<h3>Tenant leaving soon</h3><p class="note">Relist early so new tenants can apply before the move-out date. The listing shows "Available from" that date.</p><form class="f" id="lvf"><input type="date" name="d" required min="${new Date(DB.now()).toISOString().slice(0,10)}"><button class="pill pill-green">Relist now</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
  $("#cx").onclick=closeSheet;$("#lvf").onsubmit=e=>{e.preventDefault();const d=new FormData(e.target).get("d");closeSheet();after(DB.reactivate(l.id,{leavingDate:d}))}}
}
function listingForm(){return`<form class="f" id="lf"><input name="title" required placeholder="Title (e.g. 2 rooms near CBU)">
 <span class="lbl">Type</span><div class="fl" id="lt">${Object.entries(TYPES).map(([k,v],i)=>`<button type="button" class="chip t${i?"":" on"}" data-t="${k}">${v}</button>`).join("")}</div>
 <span class="lbl">City</span><div class="fl" id="lc">${CITIES.map((c,i)=>`<button type="button" class="chip t${i?"":" on"}" data-c="${c}">${c}</button>`).join("")}</div>
 <input name="address" required placeholder="Address / area"><span class="lbl">Drop a pin (tap the map)</span><div id="pinmap"></div><small class="note" id="pinl">No pin yet: defaults to the city centre.</small>
 <div class="row"><input name="rent" type="number" required min="0" placeholder="Monthly rent (K)"><input name="deposit" type="number" required min="0" placeholder="Security deposit (K)"></div>
 <div class="row"><input name="upfront" type="number" required min="0" max="12" placeholder="Upfront months"><input name="yard" placeholder="Yard / plot size (e.g. 30 × 40 m)"></div>
 <input name="criteria" placeholder="Criteria, comma separated (Student ID, Payslip, References)"><input name="amenities" placeholder="Amenities, comma separated (Wi-Fi, Borehole)">
 <span class="lbl">Photos (compressed and stored on this device)</span><input type="file" id="ph" accept="image/*" multiple><div class="thumbs" id="thumbs"></div>
 <div class="card box" style="background:var(--gold2);box-shadow:none;margin:4px 0"><b>Verification ${K(CFG.VERIFICATION_FEE)}/year </b><p class="note" style="margin:4px 0 0">${CFG.VERIFICATION_FEE_SCOPE==="property"?"Each property":"Your first listing"} pays a yearly verification fee. A REZ inspector visits to confirm the photos and details are true, then your listing goes live with the ✓ Verified badge (valid 12 months) once your monthly plan is paid.</p></div>
 <div class="verify-choice"><span class="lbl">Verification</span>
 <label class="ck"><input type="radio" name="vpay" value="now" checked> Pay for verification now</label>
 <label class="ck"><input type="radio" name="vpay" value="later"> Verify later</label></div>
 <div class="btns"><button class="pill pill-green" type="submit">List this property</button></div></form>`}
/** Wires the add-listing form: photos stay on-device; landlord picks pay-now or verify-later. */
function bindListingForm(u){let type="boarding",city=CITIES[0],pin=null,photos=[];
 const pick=(id,attr,set)=>$(id).onclick=e=>{const b=e.target.closest(".chip");if(!b)return;$(id).querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");set(b.dataset[attr])};
 const m=mkMap("pinmap",CITYLL[city],12);let mk;
 pick("#lt","t",v=>type=v);pick("#lc","c",v=>{city=v;if(!pin)m.setView(CITYLL[v],12)});
 m.on("click",e=>{pin=[+e.latlng.lat.toFixed(5),+e.latlng.lng.toFixed(5)];mk?mk.setLatLng(e.latlng):mk=L.marker(e.latlng).addTo(m);$("#pinl").textContent=`Pin: ${pin.join(", ")}`});
 $("#ph").onchange=async e=>{for(const f of [...e.target.files].slice(0,6))photos.push(await compress(f));$("#thumbs").innerHTML=photos.map(p=>`<img src="${p}">`).join("")};
 $("#lf").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const vpay=(document.querySelector('input[name=vpay]:checked')||{}).value||"now";
  const ll=pin||CITYLL[city];const sp=s=>(s||"").split(",").map(x=>x.trim()).filter(Boolean);
  try{
    const listing=DB.addListing({title:d.title,type,city,address:d.address,lat:ll[0],lng:ll[1],rent:+d.rent,deposit:+d.deposit,upfront:+d.upfront,yard:d.yard,criteria:sp(d.criteria),amenities:sp(d.amenities),photos:photos.slice(),owner:u.id},{draft:vpay==="later"});
    if(vpay==="now"){toast("Property saved — choose how to pay");rerender();return payFlow({purpose:"verification",amount:CFG.VERIFICATION_FEE,listingId:listing.id,label:`Verification: ${listing.title}`,onDone:rerender})}
    toast("Saved. Pay for verification later from your listings.");rerender();
  }catch(x){toast("Could not save — try fewer or smaller photos")}};
}
function compress(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const s=Math.min(1,900/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*s;c.height=i.height*s;c.getContext("2d").drawImage(i,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.7))};i.onerror=rej;i.src=r.result};r.readAsDataURL(f)})}


// ---------- Staff / admin (demo role) ----------
let ATAB="queue";
function admin(){const u=DB.user();
 if(!isStaff(u))return app.innerHTML=`<div class="card box" style="max-width:480px;margin:30px auto"><h3>REZ staff portal</h3><p class="note">For REZ staff and admins. Sign in with your staff account to continue.</p><button class="pill pill-green" id="sd">Continue as staff</button></div>`,$("#sd").onclick=()=>{DB.staffDemo();toast("Signed in as staff");route()};
 const all=DB.listings(),own=all.filter(l=>!l.sample),pays=DB.payments(),users=DB.users(),U=id=>users.find(x=>x.id===id)||{name:"(unknown)",phone:""};
 const queue=own.filter(l=>l.vstatus==="awaiting_payment"||l.vstatus==="inspection_scheduled");
 const overdue=own.filter(l=>l.status==="expired");
 const occ=own.filter(l=>l.status==="occupied");
 const pend=pays.filter(p=>p.status==="pending");
 const tasks=DB.tasks(),agents=DB.agents(),submitted=tasks.filter(t=>t.status==="submitted"),renewDue=own.filter(l=>l.vexpired);
 const T=[["queue","Verification queue",queue.length+renewDue.length],["tasks","Inspection tasks",submitted.length],["agents","Inspector applications",agents.filter(a=>a.agent.status==="pending").length],["listings","All listings",all.length],["payments","Payments",pend.length],["overdue","Overdue fees",overdue.length],["occupied","Occupied follow-up",occ.length],["tools","Tools",""]];
 const TLABEL={open:"Open · waiting for an agent",offered:"Offered to agent",accepted:"Agent accepted",submitted:"Report submitted · review it",approved:"Report approved",handled_by_staff:"Handled by staff"};
 const taskOf=lid=>tasks.filter(t=>t.listingId===lid).slice(-1)[0];
 const approved=agents.filter(a=>DB.canInspect(a));
 const assignSel=(t,l)=>approved.length?`<form class="f inl" data-assign="${t.id}"><select name="agent" required>${approved.map(a=>({a,d:DB.km(a.agent,l)})).sort((x,y)=>x.d-y.d).map(({a,d})=>`<option value="${a.id}">${esc(a.name)} · ${d.toFixed(1)} km</option>`).join("")}</select><button class="pill pill-ghost sm">Assign to agent</button></form>`:`<span class="note">No certified REZ inspectors yet.</span>`;
 const wal=(p,m)=>p?`<a class="pill pill-ghost sm" target="_blank" href="https://wa.me/${esc(String(p).replace(/\D/g,"").replace(/^0/,"260"))}?text=${encodeURIComponent(m)}">WhatsApp landlord</a>`:`<span class="note">no phone</span>`;
 const row=(l,extra)=>{const o=U(l.owner);return`<div class="ml" data-id="${l.id}"><img src="${esc(l.photos?.[0]||"img/p1.jpg")}"><div class="mlb"><div class="sechead"><a href="#/l/${l.id}"><b>${esc(l.title)}</b></a><span class="st s-${l.status}">${esc(SLABEL[l.status])}</span></div><small class="note">${esc(l.city)} · ${esc(l.address)} · landlord ${esc(o.name)} ${esc(o.phone||"")} · ${K(l.rent)}/mo · ${l.views} views</small>${extra}</div></div>`};
 let body="";
 if(ATAB==="queue")body=renewDue.map(l=>row(l,`<p class="note" style="margin:6px 0"><b>${esc(vstatusLabel(l))}</b> · verified until ${D(l.verifiedUntil)}. Badge hidden until re-inspected.</p>`)).join("")+queue.map(l=>{const vp=pays.filter(p=>p.listingId===l.id&&p.purpose==="verification"&&p.status==="pending");
  const tk=taskOf(l.id);return row(l,`<p class="note" style="margin:6px 0"><b>${esc(vstatusLabel(l))}</b>${l.flagReverify?" · re-verification requested":""}${tk&&["open","offered","accepted","submitted"].includes(tk.status)?` · task: <b>${esc(TLABEL[tk.status])}</b>${tk.agentId?` (${esc(U(tk.agentId).name)})`:""}`:""}</p>`+
  (l.vstatus==="awaiting_payment"&&!l.payConfirmed?(vp.length?`<div class="btns">${vp.map(p=>`<button class="pill pill-green sm" data-rec="${p.id}">Record payment ${p.ref}</button>`).join("")}</div>`:`<span class="note">Landlord hasn't started the ${K(CFG.VERIFICATION_FEE)} payment yet.</span>`):
   l.vstatus==="awaiting_payment"?`<form class="f inl" data-sched="${l.id}"><input type="date" name="date" required><input name="inspector" required placeholder="Inspector name"><button class="pill pill-green sm">Schedule inspection</button></form>`:
   `<p class="note" style="margin:0">Booked ${D(l.inspection?.scheduledFor)} · ${esc(l.inspection?.inspector)}</p><button class="pill pill-green sm" data-insp="${l.id}">Record inspection result</button>`))}).join("")||"<p class='note'>Queue is empty.</p>";
 if(ATAB==="tasks")body=`<p class="note">A task is created when a verification fee is recorded (or a re-verification is paid). Field agents near the property can accept it, or you can assign one. Approving a report sets the property's verification and credits the agent's commission (amount agreed with REZ).</p>`+(tasks.slice().reverse().filter(t=>DB.listing(t.listingId)).map(t=>{const l=DB.listing(t.listingId);return row(l,`<p class="note" style="margin:6px 0">${tkind(t)} · <b>${esc(TLABEL[t.status]||t.status)}</b>${t.agentId?` · ${esc(U(t.agentId).name)}`:""}${t.visitDate?` · visit ${D(t.visitDate)}`:""} · commission due</p><div class="btns">${t.status==="open"?assignSel(t,l):""}${t.status==="submitted"?`<button class="pill pill-green sm" data-review="${t.id}">Review report</button>`:""}</div>`)}).join("")||"<p class='note'>No inspection tasks yet.</p>");
 if(ATAB==="agents")body=`<p class="note">Estate agents and property people applying to inspect for REZ. Check their experience and documents (and their NRC/ID in person), then approve to issue a <b>REZ Certified Inspector</b> certificate, or reject with a reason. Licence numbers are self-declared until we verify them in person.</p>`+(agents.slice().sort((x,y)=>(y.agent.status==="pending")-(x.agent.status==="pending")).map(a=>{const g=a.agent,cm=DB.commissions(a.id),c=DB.certFor(a.id),cs=DB.certStatus(c),docs=g.docs||[];
  const stl={pending:"Pending review",approved:cs==="valid"?"Approved · certified":"Approved · certificate "+cs,rejected:"Rejected · waiting for resubmission",suspended:"Suspended"}[g.status]||g.status;
  return`<div class="ml insp" data-ag="${a.id}"><div class="av" style="width:56px;height:56px;flex:none">${esc(initials(a.name))}</div><div class="mlb"><div class="sechead"><b>${esc(a.name)}</b><span class="st ${g.status==="approved"&&cs==="valid"?"":g.status==="pending"?"warn":"bad"}">${esc(stl)}</span></div><small class="note">${esc(a.phone||"")} · ${esc(g.email||a.email)} · base ${esc(g.baseCity)} · covers ${esc((g.areas||[]).join(", "))}${g.areaText?` (${esc(g.areaText)})`:""} · ${esc((g.availability||[]).join(", ")||"availability not set")} · NRC/ID ${g.nrc?"given (check in person)":"not given"} · agreement ${esc(g.agreementVersion||"")} ticked ${D(g.agreementAt)}${g.submittedAt?` · applied ${D(g.submittedAt)}`:""}</small>
  <div class="facts"><span>🏠 ${g.experienceYears!=null?esc(g.experienceYears)+" yr"+(+g.experienceYears===1?"":"s")+" property experience":"Experience not given"}</span><span>🪪 ${g.licenceType&&g.licenceType!=="none"?`${esc(LICL[g.licenceType]||g.licenceType)} licence ${esc(g.licenceNo||"(no number)")} · self-declared, not checked`:"No licence declared"}</span><span>📎 ${docs.length} document${docs.length===1?"":"s"}</span></div>
  ${g.experience?`<p class="amsg">“${esc(g.experience)}”</p>`:""}${docList(docs)}
  ${g.status==="rejected"&&g.reviewNote?`<p class="note" style="margin:6px 0;color:#a33">Rejected by ${esc(g.reviewedBy||"REZ")}: ${esc(g.reviewNote)}</p>`:""}${c?`<p class="note" style="margin:6px 0">Certificate <b>${esc(c.no)}</b> · ${esc(cs)} · expires ${D(c.expires)}</p>`:""}
  <div class="btns">${g.status==="pending"?`<button class="pill pill-green sm" data-agok="${a.id}">Approve &amp; issue certificate</button><button class="pill pill-ghost sm" data-agrej="${a.id}">Reject</button>`:g.status==="suspended"?`<button class="pill pill-green sm" data-agok="${a.id}">Reinstate &amp; issue new certificate</button>`:g.status==="approved"?`${c?`<a class="pill pill-ghost sm" href="#/cert/${c.id}">View certificate</a>`:""}${cs!=="valid"?`<button class="pill pill-green sm" data-agcert="${a.id}">Issue new certificate</button>`:""}<button class="pill pill-ghost sm" data-agsus="${a.id}">Suspend</button>`:""}</div>
  ${cm.length?`<div class="list" style="margin-top:8px">${cm.map(c=>`<div class="it"><small>${esc((DB.listing(c.listingId)||{}).title||"")} · ${K(c.amount)}</small>${c.status==="pending"?`<button class="pill pill-ghost sm" data-cpay="${c.id}">Record payout (mock)</button>`:`<span class="st">Paid · ${esc(c.payoutRef)}</span>`}</div>`).join("")}</div>`:""}</div></div>`}).join("")||"<p class='note'>No inspector applications yet. Share the “Apply as a REZ inspector” page with local estate agents.</p>");
 if(ATAB==="listings")body=all.map(l=>row(l,`<p class="note" style="margin:6px 0">Verification: ${esc(vstatusLabel(l))}${l.inspection?.inspector?` · inspected by ${esc(l.inspection.inspector)} ${D(l.inspection.date)}`:""}</p>${l.sample?"":`<div class="btns">${l.status==="active"?`<button class="pill pill-ghost sm" data-occ="${l.id}">Mark occupied</button>`:""}${l.vstatus==="verified"&&!l.flagReverify?`<button class="pill pill-ghost sm" data-flag="${l.id}">Flag for re-verification</button>`:""}<button class="pill pill-ghost sm" data-hist="${l.id}">History</button></div>`}`)).join("");
 if(ATAB==="payments")body=`<p class="note">Payments arrive outside the site for now (mobile money etc.). Staff records the <b>transaction ID, amount and timestamp</b> against the reference, and Boaz verifies all three before anything counts as paid.</p><div class="list">${pays.slice().reverse().map(p=>`<div class="it"><div><b>${p.ref}</b> · ${esc(p.purpose)} · ${K(p.amount)} · ${esc(p.method)}<br><small class="note">${esc(U(p.landlord).name)} · created ${D(p.created)}${p.transaction_id?` · txn <b>${esc(p.transaction_id)}</b> · ${K(p.paid_amount)} · ${esc(p.paid_at)} · by ${esc(p.recorded_by)} · Boaz: not yet verified`:""}</small></div>${p.status==="pending"?`<button class="pill pill-green sm" data-rec="${p.id}">Record payment</button>`:`<span class="st">Recorded</span>`}</div>`).join("")||"<p class='note'>No payment references yet.</p>"}</div>`;
 if(ATAB==="overdue")body=`<p class="note">Fee unpaid, so these are hidden. Follow up by WhatsApp, email or a call. If the landlord says it's occupied, mark it occupied: it stays verified in the database.</p>`+(overdue.map(l=>{const o=U(l.owner);return row(l,`<p class="note" style="margin:6px 0">Plan expired ${D(o.subPaidUntil)}</p><div class="btns">${wal(o.phone,`Hi ${o.name}, this is REZ Homes. Your listing "${l.title}" is hidden because this month's fee is unpaid. Is it still available, or is it occupied?`)}<button class="pill pill-ghost sm" data-occ="${l.id}">Landlord says occupied</button><button class="pill pill-ghost sm" data-note="${l.id}">Log follow-up</button></div>`)}).join("")||"<p class='note'>No overdue listings.</p>");
 if(ATAB==="occupied")body=`<p class="note">Occupied listings stay verified but hidden. Check in about ${CFG.OCCUPIED_FOLLOWUP_DAYS} days after they were marked occupied, in case a tenant is leaving.</p>`+(occ.map(l=>{const o=U(l.owner),due=(l.occupiedSince||0)+CFG.OCCUPIED_FOLLOWUP_DAYS*DB.DAY;return row(l,`<p class="note" style="margin:6px 0">Occupied since ${D(l.occupiedSince)} (by ${esc(l.hiddenBy||"?")}) · check-in ${due<DB.now()?"<b style='color:#c33'>due now</b>":"due "+D(due)}</p><div class="btns">${wal(o.phone,`Hi ${o.name}, REZ Homes here. Is your tenant at "${l.title}" staying, or will it be available soon?`)}<button class="pill pill-ghost sm" data-note="${l.id}">Log check-in</button></div>`)}).join("")||"<p class='note'>No occupied listings.</p>");
 if(ATAB==="tools")body=`<p class="note">Clock offset: ${Math.round(DB.clockOffset()/DB.DAY)} days. Advance it to test fee expiry and follow-ups.</p><div class="btns"><button class="pill pill-gold sm" id="adv">Advance 31 days</button><button class="pill pill-ghost sm" id="rst">Reset clock</button><button class="pill pill-ghost sm" id="out">Leave staff mode</button></div>`;
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>REZ staff portal</h2></div>
 <div class="kpis"><div class="card"><small>To verify</small><b>${queue.length}</b><em>${submitted.length} report(s) to review</em></div><div class="card"><small>Live</small><b>${all.filter(l=>l.status==="active").length}</b></div><div class="card"><small>Overdue</small><b>${overdue.length}</b></div><div class="card"><small>Payments to record</small><b>${pend.length}</b></div></div>
 <div class="tabs">${T.map(t=>`<button class="${ATAB===t[0]?"on":""}" data-t="${t[0]}">${t[1]}${t[2]!==""?` <i>${t[2]}</i>`:""}</button>`).join("")}</div>
 <div class="card box"><div class="mylist">${body}</div></div></div>`;
 app.querySelector(".tabs").onclick=e=>{const b=e.target.closest("button");if(b){ATAB=b.dataset.t;admin()}};
 app.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>recordSheet(pays.find(p=>p.id===b.dataset.rec)));
 app.querySelectorAll("[data-assign]").forEach(f=>f.onsubmit=e=>{e.preventDefault();try{DB.assignTask(f.dataset.assign,new FormData(f).get("agent"),u.name);toast("Offered to agent · they get a notification");admin()}catch(x){toast(x.message)}});
 app.querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>reviewSheet(DB.task(b.dataset.review)));
 app.querySelectorAll("[data-agok]").forEach(b=>b.onclick=()=>{try{const c=DB.reviewAgent(b.dataset.agok,"approve");toast(`Approved · certificate ${c.no} issued`);admin()}catch(x){toast(x.message)}});
 app.querySelectorAll("[data-agcert]").forEach(b=>b.onclick=()=>{try{const c=DB.issueCertificate(b.dataset.agcert);toast(`Certificate ${c.no} issued`);admin()}catch(x){toast(x.message)}});
 app.querySelectorAll("[data-agrej]").forEach(b=>b.onclick=()=>{const a=DB.userById(b.dataset.agrej);sheet(`<h3>Reject ${esc(a.name)}</h3><p class="note" style="margin:0">Tell the applicant what to fix. They see this and can update their application and apply again.</p><form class="f" id="rjf"><textarea name="note" rows="3" required placeholder="Reason (e.g. the diploma scan is unreadable: please upload a clear PDF)"></textarea><p class="note" id="rjerr" style="color:#c33;margin:0"></p><button class="pill pill-green">Reject and notify</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
  $("#cx").onclick=closeSheet;$("#rjf").onsubmit=e=>{e.preventDefault();try{DB.reviewAgent(a.id,"reject",{note:new FormData(e.target).get("note")});closeSheet();toast("Rejected · applicant notified");admin()}catch(x){$("#rjerr").textContent=x.message}}});
 app.querySelectorAll("[data-agsus]").forEach(b=>b.onclick=()=>{DB.approveAgent(b.dataset.agsus,"suspended");toast("Agent suspended");admin()});
 app.querySelectorAll("[data-cpay]").forEach(b=>b.onclick=()=>{const r=prompt("Payout reference","PAY-"+Date.now().toString(36).toUpperCase());if(r){DB.markCommissionPaid(b.dataset.cpay,{ref:r,by:u.name});toast("Payout recorded");admin()}});
 app.querySelectorAll("[data-sched]").forEach(f=>f.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));DB.scheduleInspection(f.dataset.sched,d);toast("Inspection scheduled");admin()});
 app.querySelectorAll("[data-insp]").forEach(b=>b.onclick=()=>inspectSheet(DB.listing(b.dataset.insp)));
 app.querySelectorAll("[data-occ]").forEach(b=>b.onclick=()=>{DB.markOccupied(b.dataset.occ,"staff");toast("Marked occupied · stays verified");admin()});
 app.querySelectorAll("[data-flag]").forEach(b=>b.onclick=()=>{const r=prompt("Reason for re-verification?","Tenant report: photos don't match");if(r){DB.flagReverify(b.dataset.flag,r);toast("Flagged: next reactivation needs inspection");admin()}});
 app.querySelectorAll("[data-note]").forEach(b=>b.onclick=()=>{const r=prompt("Follow-up note");if(r){DB.updateListing(b.dataset.note,x=>({notes:[...(x.notes||[]),{at:DB.now(),text:"Follow-up: "+r,by:u.name}]}));toast("Logged");admin()}});
 app.querySelectorAll("[data-hist]").forEach(b=>b.onclick=()=>{const l=DB.listing(b.dataset.hist);sheet(`<h3>History: ${esc(l.title)}</h3><div class="list">${(l.notes||[]).map(n=>`<div class="it"><small>${D(n.at)} · ${esc(n.by)}</small><span>${esc(n.text)}</span></div>`).join("")||"<p class='note'>No history.</p>"}</div><button class="pill pill-ghost" id="cx">Close</button>`);$("#cx").onclick=closeSheet});
 const ad=$("#adv");if(ad){ad.onclick=()=>{DB.advanceClock(31);toast("Clock +31 days");admin()};$("#rst").onclick=()=>{DB.resetClock();admin()};$("#out").onclick=()=>{DB.signOut();location.hash="#/account"}}
}
function recordSheet(p){const u=DB.user();
 sheet(`<h3>Record payment ${p.ref}</h3><p class="note">${esc(p.purpose)} · ${K(p.amount)} due · ${esc(p.method)}. Enter the details from the mobile money / bank / Binance record. All three are required for Boaz to verify.</p>
 <form class="f" id="rf"><input name="transaction_id" required placeholder="Transaction ID (e.g. MP241017.1234.A12345)"><input name="amount" type="number" required step="0.01" placeholder="Amount received (K)" value=""><input name="paid_at" type="datetime-local" required><p class="note" id="rerr" style="color:#c33;margin:0"></p><button class="pill pill-green">Save payment record</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 $("#cx").onclick=closeSheet;
 $("#rf").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{DB.recordPayment(p.id,{...d,recorded_by:u.name});closeSheet();toast("Payment recorded · awaiting Boaz verification");admin()}catch(x){$("#rerr").textContent=x.message}};
}
function inspectSheet(l){const u=DB.user();let photos=[];
 sheet(`<h3>Inspection: ${esc(l.title)}</h3><p class="note">Confirm the photos and claims (rent, deposit, yard, amenities) match what you saw on site.</p>
 <form class="f" id="if"><div class="seg" id="res"><button type="button" class="on" data-r="verified">✓ Verified</button><button type="button" data-r="rejected">✕ Rejected</button></div>
 <input name="inspector" required placeholder="Inspector" value="${esc(l.inspection?.inspector||u.name)}"><input name="date" type="date" required value="${esc(l.inspection?.scheduledFor||"")}">
 <textarea name="notes" rows="3" required placeholder="Inspection notes (what matched, what didn't)"></textarea><span class="lbl">Inspection photos</span><input type="file" id="iph" accept="image/*" multiple><div class="thumbs" id="ith"></div>
 <button class="pill pill-green">Save result</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 let result="verified";$("#res").onclick=e=>{const b=e.target.closest("button");if(!b)return;$("#res").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");result=b.dataset.r};
 $("#iph").onchange=async e=>{for(const f of [...e.target.files].slice(0,4))photos.push(await compress(f));$("#ith").innerHTML=photos.map(p=>`<img src="${p}">`).join("")};
 $("#cx").onclick=closeSheet;
 $("#if").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));DB.completeInspection(l.id,{...d,result,photos});closeSheet();toast(result==="verified"?"Verified ✓":"Rejected");admin()};
}

// ---------- Notifications inbox ----------
function inbox(){const u=DB.user();if(!u)return authView("in");const ns=DB.notifications();
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>Notifications</h2>${ns.some(n=>!n.read)?`<button class="pill pill-ghost sm" id="mar">Mark all read</button>`:""}</div>
 <p class="note" style="margin:6px 0 14px">In-app now. Email, SMS and WhatsApp follow once delivery is on.</p>
 <div class="nlist">${ns.map(n=>{const d=n.data||{};const act=n.key==="application_accepted_viewing"?`<a class="pill pill-green sm" target="_blank" rel="noopener" href="${REZ_TPL.waLink(d.landlord_phone,`Hi ${d.landlord_name}, thank you for accepting my application for ${d.listing_title}. ${d.viewing_date} works for me to view it.`)}">Confirm viewing on WhatsApp</a><a class="pill pill-ghost sm" target="_blank" rel="noopener" href="${esc(d.directions_url)}">Directions</a>`
  :n.key==="application_accepted_pay"?`<button class="pill pill-green sm" data-pay="${n.id}">Confirm &amp; pay to secure it</button><a class="pill pill-ghost sm" target="_blank" rel="noopener" href="${REZ_TPL.waLink(d.landlord_phone,`Hi ${d.landlord_name}, I'd like to secure ${d.listing_title}. How do I pay the move-in cost of ${d.move_in_total}?`)}">WhatsApp landlord</a>`
  :n.key==="agent_task_assigned"||n.key==="inspector_approved"?`<a class="pill pill-green sm" href="#/agent">Open my tasks</a>`:n.key==="inspector_application_rejected"?`<a class="pill pill-green sm" href="#/agent">Update my application</a>`:n.link?`<a class="pill pill-ghost sm" href="${esc(n.link)}">Open</a>`:"";
  return`<div class="card notif${n.read?"":" unread"}" data-n="${n.id}"><div class="sechead"><b>${esc(n.title)}</b><small class="note" style="margin:0">${D(n.created)}</small></div><p>${esc(n.body)}</p>${n.key==="application_accepted_pay"?`<p class="note" style="margin:0 0 8px">First come, first served. Payments are not live yet: the button shows what's coming.</p>`:""}<div class="btns">${act}<button class="pill pill-ghost sm" data-ch="${n.id}">Email / SMS / WhatsApp versions</button></div></div>`}).join("")||"<div class='card box'><p class='note' style='margin:0'>No notifications yet. When a landlord accepts your application you'll see it here.</p></div>"}</div></div>`;
 const mar=$("#mar");if(mar)mar.onclick=()=>{DB.markAllRead();inbox();route2()};
 app.querySelectorAll(".notif").forEach(c=>c.addEventListener("click",()=>{DB.markRead(c.dataset.n);c.classList.remove("unread");route2()}));
 app.querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>{const n=ns.find(x=>x.id===b.dataset.ch);const a=DB.applications().find(x=>x.id===n.appId)||{name:u.name,phone:u.phone};msgPreviewSheet(n,{...a,tenantView:true})});
 app.querySelectorAll("[data-pay]").forEach(b=>b.onclick=()=>{const n=ns.find(x=>x.id===b.dataset.pay),d=n.data;
  sheet(`<div class="soon"><i style="background:var(--g)">🔒</i><h3>Secure ${esc(d.listing_title)}</h3><p class="note">Move-in cost ${esc(d.move_in_total)} (${esc(d.upfront)} month(s) rent + deposit).</p><p class="note">We'll send payment details after you submit. For now, confirm with the landlord directly. REZ never asks you to pay a stranger: only pay once you have seen the property and the landlord's details match.</p></div>
  <div class="paygrid">${CFG.PAY_METHODS.map(m=>`<button class="paybtn" disabled style="--pc:${m.color};opacity:.55"><i>${m.icon}</i>${esc(m.name)}</button>`).join("")}</div>
  <a class="pill pill-green" target="_blank" rel="noopener" href="${REZ_TPL.waLink(d.landlord_phone,`Hi ${d.landlord_name}, I'd like to secure ${d.listing_title}.`)}">Confirm with the landlord on WhatsApp</a><button class="pill pill-ghost" id="cx">Close</button>`);$("#cx").onclick=closeSheet})}
const route2=()=>{const u=DB.user(),n=u?DB.unread():0,bn=$("#bellN"),bl=$("#bell");if(bl)bl.style.display=u?"":"none";if(bn){bn.textContent=n||"";bn.style.display=n?"":"none"}};

// ---------- Field agents (existing estate agents inspecting for REZ) ----------
const AVAIL=["Weekday mornings","Weekday afternoons","Evenings","Saturdays","Sundays"];
// ----- v5: REZ inspector application helpers -----
const LIC=[["none","None"],["estate_agent","Estate agent"],["valuer","Valuer"],["other","Other"]],LICL=Object.fromEntries(LIC);
const DOCKINDS=[["qualification","Qualification"],["licence","Licence"],["cv","CV"],["reference","Reference letter"],["id_document","ID document"],["other","Other"]],DOCKL=Object.fromEntries(DOCKINDS);
const fsize=n=>n>=1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";
// Only the file name is saved on this device for now. At launch the file goes to the private bucket at this path.
const docMeta=(f,kind,folder)=>({id:"d"+Math.random().toString(36).slice(2,9),name:f.name,type:f.type||"application/octet-stream",size:f.size,kind,uploadedAt:DB.now(),path:`${folder}/${f.name.replace(/[^\w.\-]+/g,"_")}`});
const docList=(docs,rm)=>docs&&docs.length?`<div class="doclist">${docs.map(d=>`<div class="doc" data-doc="${d.id}"><i>${/^image\//.test(d.type)?"🖼":"📄"}</i><span><b>${esc(d.name)}</b><small>${esc(DOCKL[d.kind]||d.kind||"Document")} · ${fsize(d.size||0)}${rm?"":` · ${D(d.uploadedAt)}`}</small></span>${rm?`<button type="button" class="x" data-rmdoc="${d.id}" aria-label="Remove ${esc(d.name)}">✕</button>`:""}</div>`).join("")}</div>`:"";
const CERTSTL={valid:"Valid",expired:"Expired",revoked:"Revoked",suspended:"Suspended",none:"None"};
let AGTAB="feed",AGUSER=null;
const tkind=t=>t.kind==="renewal"?"Annual re-verification":"New verification";
function agentView(){const u=DB.user();
 if(!u){AUTHROLE="agent";authView("up");app.insertAdjacentHTML("afterbegin",agentIntro());return}
 if(isStaff(u))return location.hash="#/admin";
 if(AGUSER!==u.id){AGUSER=u.id;if(AGTAB!=="profile")AGTAB="feed"}
 if(u.role!=="agent"||!u.agent||AGTAB==="profile")return agentProfile(u);
 const me=u.agent,ok=DB.canInspect(u),cert=DB.certFor(u.id),cst=DB.certStatus(cert),ts=DB.tasks(),L=id=>DB.listing(id);
 const feed=ts.filter(t=>t.status==="open"||(t.status==="offered"&&t.agentId===u.id)).map(t=>({t,l:L(t.listingId),d:DB.km(me,L(t.listingId))})).filter(x=>x.l).sort((a,b)=>(b.t.status==="offered")-(a.t.status==="offered")||a.d-b.d);
 const mine=ts.filter(t=>t.agentId===u.id&&!["open","offered"].includes(t.status)).map(t=>({t,l:L(t.listingId),d:DB.km(me,L(t.listingId))})).filter(x=>x.l).sort((a,b)=>(b.t.acceptedAt||0)-(a.t.acceptedAt||0));
 const cm=DB.commissions(u.id),pend=cm.filter(c=>c.status==="pending").reduce((a,c)=>a+c.amount,0),paid=cm.filter(c=>c.status==="paid").reduce((a,c)=>a+c.amount,0);
 const tcard=({t,l,d},extra)=>`<div class="ml task" data-t="${t.id}"><img src="${esc(l.photos?.[0]||"img/p1.jpg")}"><div class="mlb"><div class="sechead"><b>${esc(l.title)}</b><span class="dist">${d<9999?d.toFixed(1)+" km":"?"}</span></div>
  <small class="note">${esc(l.address)}, ${esc(l.city)} · ${tkind(t)} · posted ${D(t.created)}${(me.areas||[]).includes(l.city)?' · <b style="color:var(--g)">in your area</b>':""}</small>
  <div class="mstats"><span>Commission <b>${K(t.commission)}</b> </span>${t.visitDate?`<span>Visit <b>${esc(D(t.visitDate))}</b></span>`:""}<span>Status <b>${esc({open:"Open",offered:"Offered to you",accepted:"Accepted · visit and report",submitted:"Report submitted · awaiting REZ review",approved:"Approved",handled_by_staff:"Handled by REZ staff"}[t.status]||t.status)}</b></span></div>
  ${t.staffNote&&t.status==="accepted"?`<p class="note" style="margin:6px 0;color:#b45309">REZ sent this back: ${esc(t.staffNote)}</p>`:""}<div class="btns">${extra}<a class="pill pill-ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}">Directions</a></div></div></div>`;
 let body="";
 const gate=ok?"":`<div class="gate" id="gate"><b>Only approved REZ inspectors can take tasks.</b> ${me.status==="rejected"?`REZ couldn't approve your application yet${me.reviewNote?`: <i>${esc(me.reviewNote)}</i>`:""}. <a href="#" id="resub" style="color:var(--g);font-weight:700">Update and resubmit</a>`:me.status==="suspended"?"Your inspector account is suspended. Contact REZ on WhatsApp.":me.status==="approved"?`Your certificate is ${esc(cst)}. Ask REZ to issue a new one.`:"Your application is waiting for REZ review. You can see nearby tasks, and accepting unlocks once REZ approves you and issues your certificate."}</div>`;
 if(AGTAB==="feed")body=gate+`<p class="note">Properties waiting for inspection, nearest first (from ${me.locSource==="device"?"your current location":esc(me.baseCity)+" centre"}). Accept one, visit, and submit your report.</p>`+(feed.map(x=>tcard(x,ok?`<button class="pill pill-green sm" data-acc="${x.t.id}">Accept task</button>${x.t.status==="offered"?`<button class="pill pill-ghost sm" data-decl="${x.t.id}">Decline</button>`:""}`:`<span class="note">Accepting unlocks once REZ approves your application.</span>`)).join("")||"<p class='note'>No open inspections right now. New ones appear here as landlords pay for verification.</p>");
 if(AGTAB==="mine")body=mine.map(x=>tcard(x,x.t.status==="accepted"?`<button class="pill pill-green sm" data-rep="${x.t.id}">Submit inspection report</button>`:"")).join("")||"<p class='note'>No tasks yet. Accept one from Tasks near me.</p>";
 if(AGTAB==="earn")body=`<div class="kpis"><div class="card"><small>Pending inspections</small><b>${cm.filter(c=>c.status==="pending").length}</b><em>awaiting payout</em></div><div class="card"><small>Paid out</small><b>${cm.filter(c=>c.status==="paid").length}</b><em>inspections</em></div></div>
  <p class="note" style="margin:0 0 10px">Commission varies with property size, distance and time on site. Payouts are confirmed by the REZ team.</p>
  <div class="list">${cm.slice().reverse().map(c=>{const l=L(c.listingId)||{title:"(listing)"};return`<div class="it"><div><b>${esc(l.title)}</b><br><small class="note">Approved ${D(c.created)}${c.payoutRef?` · payout ref ${esc(c.payoutRef)} (mock)`:""}</small></div><span class="st ${c.status==="pending"?"warn":""}">${K(c.amount)} · ${c.status==="pending"?"Pending":"Paid"}</span></div>`}).join("")||"<p class='note'>No earnings yet. Each approved inspection report adds a commission here.</p>"}</div>`;
 app.innerHTML=`<div class="fade" style="padding-top:20px"><div class="sechead"><h2>REZ Inspector portal</h2></div>
 <div class="card box profile"><div class="av">${esc(initials(u.name))}</div><div style="flex:1"><h3 style="margin:0">${esc(u.name)}</h3><p class="note" style="margin:2px 0">${esc(u.phone||"no phone")} · ${esc((me.areas||[]).join(", ")||me.baseCity)}${me.areaText?` · ${esc(me.areaText)}`:""}</p><p style="margin:4px 0 0">${ok?'<span class="st">✓ REZ Certified Inspector</span>':me.status==="suspended"?'<span class="st bad">Suspended</span>':me.status==="rejected"?'<span class="st bad">Changes needed</span>':me.status==="approved"?`<span class="st bad">Certificate ${esc(cst)}</span>`:'<span class="st warn">Waiting for REZ approval</span>'} <small class="note">Agreement ${esc(me.agreementVersion||"")} ticked ${D(me.agreementAt)}</small></p>
 ${cert&&cst!=="none"?`<p class="note" style="margin:4px 0 0">Inspector ID <b>${esc(cert.no)}</b> · ${esc(CERTSTL[cst])} until ${D(cert.expires)}</p>`:""}</div>
 <div class="btns">${cert?`<a class="pill pill-gold sm" id="mycert" href="#/cert/${cert.id}">My certificate</a>`:""}<button class="pill pill-ghost sm" id="loc">📍 Use my location</button><button class="pill pill-ghost sm" id="edit">${me.status==="rejected"?"Update application":"Edit profile"}</button></div></div>
 <div class="tabs">${[["feed","Tasks near me",feed.length],["mine","My tasks",mine.filter(x=>x.t.status==="accepted").length],["earn","Earnings",""]].map(t=>`<button class="${AGTAB===t[0]?"on":""}" data-t="${t[0]}">${t[1]}${t[2]?` <i>${t[2]}</i>`:""}</button>`).join("")}</div>
 <div class="card box"><div class="mylist">${body}</div></div></div>`;
 app.querySelector(".tabs").onclick=e=>{const b=e.target.closest("button");if(b){AGTAB=b.dataset.t;agentView()}};
 $("#edit").onclick=()=>{AGTAB="profile";agentView()};const rs=$("#resub");if(rs)rs.onclick=e=>{e.preventDefault();AGTAB="profile";agentView()};
 $("#loc").onclick=()=>{if(!navigator.geolocation)return toast("Location not available on this device");navigator.geolocation.getCurrentPosition(p=>{DB.setAgentLocation(+p.coords.latitude.toFixed(5),+p.coords.longitude.toFixed(5));toast("Sorted by distance from you");agentView()},()=>toast("Location permission denied: using your base town"),{timeout:8000})};
 app.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>{const t=DB.task(b.dataset.acc),l=L(t.listingId);
  sheet(`<h3>Accept inspection</h3><p class="note" style="margin:0"><b>${esc(l.title)}</b><br>${esc(l.address)}, ${esc(l.city)}</p><form class="f" id="acf"><span class="lbl">When will you visit?</span><input type="date" name="d" required min="${new Date(DB.now()).toISOString().slice(0,10)}"><p class="note" style="margin:0">REZ tells the landlord your visit date. Commission ${K(t.commission)} once REZ approves your report.</p><p class="note" id="acerr" style="color:#c33;margin:0"></p><button class="pill pill-green">Accept task</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
  $("#cx").onclick=closeSheet;$("#acf").onsubmit=e=>{e.preventDefault();try{DB.acceptTask(t.id,new FormData(e.target).get("d"));closeSheet();toast("Task accepted");AGTAB="mine";agentView()}catch(x){$("#acerr").textContent=x.message}}});
 app.querySelectorAll("[data-decl]").forEach(b=>b.onclick=()=>{DB.declineTask(b.dataset.decl);toast("Declined");agentView()});
 app.querySelectorAll("[data-rep]").forEach(b=>b.onclick=()=>reportSheet(DB.task(b.dataset.rep)));
}

/** Public page explaining how REZ agents work — no commission amounts. */
function agentInfoPage(){
 app.innerHTML=`<div class="fade" style="padding-top:20px;max-width:720px;margin:0 auto">
 <a href="#/" class="note">← Back</a>
 <h1 style="margin-top:12px">REZ agents</h1>
 <p class="lead">Approved agents inspect listings so tenants can trust what they see.</p>
 <div class="card box"><h3>What you get</h3>
  <ul class="tier" style="list-style:none;padding:0;margin:0">
   <li>A unique REZ agent ID</li>
   <li>A physical ID card — carry it on every visit</li>
   <li>Branded gear: reflector vest, t-shirt and cap</li>
   <li>A handbook covering how inspections work</li>
  </ul></div>
 <div class="card box"><h3>Commission</h3>
  <p class="note" style="margin:0">Pay depends on the property's size, how far you travel and how long the inspection takes. A large farm is not the same job as a small flat. Rates are agreed with REZ — we don't publish fixed amounts here.</p></div>
 <div class="card box"><h3>How to join</h3>
  <p class="note">Create an account (you're a tenant by default), open Account, then Apply as agent. We review and approve or decline.</p>
  <a class="pill pill-gold" href="#/account">Go to Account</a></div></div>`;
}
const agentIntro=()=>`<div class="card box agentcta" style="max-width:640px;margin:20px auto 0"><div><h2>Inspect for REZ</h2><p class="note">For people who know property across Zambia. Apply with your ID and experience. Once approved you get a REZ agent ID, a physical ID card and branded gear (vest, t-shirt, cap). Carry your ID on every visit. Commission varies with property size, travel distance and how long the inspection takes — we don't publish fixed rates here. A handbook comes with your kit.</p></div></div>`;
const CHECKS=[["photosMatch","Photos match the property"],["claimsTrue","Rent, deposit, upfront and yard claims are true"],["addressCorrect","Address and map pin are correct"],["amenitiesPresent","Listed amenities are present"],["habitable","Safe and habitable (water, power, locks, roof)"]];
function agentProfile(u){const a=u.agent||{},first=!a.agreementAt,rej=a.status==="rejected";let city=a.baseCity||"Lusaka",areas=[...(a.areas||[])],av=[...(a.availability||[])],lic=a.licenceType||"none",docs=[...(a.docs||[])];
 app.innerHTML=`<div class="fade" style="max-width:640px;margin:20px auto"><div class="card box"><div class="sechead"><h2 style="font-size:24px">${first?"Apply to be a REZ inspector":rej?"Update your inspector application":"Edit inspector profile"}</h2></div>
 <p class="note">Real estate agents don't lose out on REZ: you inspect and verify properties for us, on your own time, and earn a commission for each approved report. REZ reviews every application before you can take tasks.</p>
 ${rej?`<div class="gate"><b>REZ couldn't approve your application yet.</b> ${a.reviewNote?`Reason: <i>${esc(a.reviewNote)}</i>`:""} Fix it below and resubmit.</div>`:""}
 <form class="f" id="agf"><input name="name" required placeholder="Full name" value="${esc(u.name)}"><input name="phone" required placeholder="Phone / WhatsApp (e.g. 097...)" value="${esc(u.phone||"")}">
 <input name="email" type="email" required placeholder="Email" value="${esc(a.email||u.email||"")}">
 <input name="nrc" placeholder="NRC / ID number" value="${esc(a.nrc||"")}"><small class="note" style="margin:-4px 0 0">We verify your ID in person. Documents stay private and are not stored in this app.</small>
 <span class="lbl">Town (base, for distance)</span><div class="fl" id="agc">${CITIES.map(c=>`<button type="button" class="chip t${c===city?" on":""}" data-c="${c}">${c}</button>`).join("")}</div>
 <span class="lbl">Areas you cover</span><div class="fl" id="aga">${CITIES.map(c=>`<button type="button" class="chip t${areas.includes(c)?" on":""}" data-c="${c}">${c}</button>`).join("")}</div>
 <input name="areaText" placeholder="Neighbourhoods (optional), e.g. Northrise, Kansenshi, Itawa" value="${esc(a.areaText||"")}">
 <span class="lbl">Availability</span><div class="fl" id="agv">${AVAIL.map(x=>`<button type="button" class="chip t${av.includes(x)?" on":""}" data-c="${x}">${x}</button>`).join("")}</div>
 <span class="lbl">Property experience</span><label class="mini-l">Years in property work (0 is fine)<input name="experienceYears" type="number" min="0" max="70" required value="${esc(a.experienceYears??"")}"></label>
 <textarea name="experience" rows="2" placeholder="What have you done? e.g. letting rooms in Kitwe since 2021, caretaker for 3 landlords (optional)">${esc(a.experience||"")}</textarea>
 <span class="lbl">Estate agent or valuer licence (optional)</span>${segH("lic",LIC,lic)}<input name="licenceNo" id="licno" placeholder="Licence / registration number (optional)" value="${esc(a.licenceNo||"")}" style="${lic==="none"?"display:none":""}">
 <small class="note" style="margin:-4px 0 0">You don't need a licence to inspect for REZ. If you have one, we record it and confirm it in person. The REZ certificate is not a licence.</small>
 <span class="lbl">Qualification documents (at least 1)</span><div class="row"><select id="qkind" aria-label="Document type">${DOCKINDS.map(([k,t])=>`<option value="${k}">${t}</option>`).join("")}</select><input type="file" id="qdocs" multiple accept=".pdf,.doc,.docx,image/*"></div>
 <div id="qlist">${docList(docs,true)}</div><small class="note" style="margin:-4px 0 0">Certificates, CV, licence or a reference letter. Only the file name is saved on this device for now — the file isn't uploaded yet.</small>
 <label class="ck agree"><input type="checkbox" name="agreement" ${a.agreementAt?"checked disabled":""}><span>I have read and agree to the <a href="#" id="agrd" style="color:var(--g);font-weight:700">REZ Field Agent Agreement</a> (${esc(CFG.AGENT_AGREEMENT_VERSION)}). The real agreement comes after a lawyer reviews it.</span></label>
 <p class="note" id="agerr" style="color:#c33;margin:0"></p><button class="pill pill-green">${first?"Submit application":rej?"Resubmit application":"Save profile"}</button>${first?"":`<button type="button" class="pill pill-ghost" id="cx">Back to tasks</button>`}</form></div></div>`;
 const multi=(id,arr)=>$(id).onclick=e=>{const b=e.target.closest(".chip");if(!b)return;const v=b.dataset.c,i=arr.indexOf(v);i<0?arr.push(v):arr.splice(i,1);b.classList.toggle("on")};
 $("#agc").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;$("#agc").querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");city=b.dataset.c;if(!areas.includes(city)){areas.push(city);$(`#aga [data-c="${city}"]`).classList.add("on")}};
 multi("#aga",areas);multi("#agv",av);segBind("lic",v=>{lic=v;$("#licno").style.display=v==="none"?"none":""});
 const paintDocs=()=>{$("#qlist").innerHTML=docList(docs,true);$("#qlist").querySelectorAll("[data-rmdoc]").forEach(b=>b.onclick=()=>{docs=docs.filter(d=>d.id!==b.dataset.rmdoc);paintDocs()})};paintDocs();
 $("#qdocs").onchange=e=>{for(const f of [...e.target.files].slice(0,8)){if(f.size>10485760){$("#agerr").textContent=`${f.name} is over 10 MB.`;continue}docs.push(docMeta(f,$("#qkind").value,`rez-inspector-docs/${u.id}`))}e.target.value="";if(docs.length&&/document/.test($("#agerr").textContent))$("#agerr").textContent="";paintDocs()};
 $("#agrd").onclick=e=>{e.preventDefault();sheet(`<h3>REZ Field Agent Agreement</h3><p class="note" style="margin-top:0">Version ${esc(CFG.AGENT_AGREEMENT_VERSION)}. Covers independent-contractor status, commission per approved inspection, honest reporting (no fake or copied photos), conflicts of interest (don't inspect your own listings), data protection for landlord and tenant details, what the REZ inspector certificate does and doesn't allow, and whether Estate Agents Act or Valuation Surveyors Act registration applies. We confirm the signed copy with you when you're approved.</p><button class="pill pill-ghost" id="cx2">Close</button>`);$("#cx2").onclick=closeSheet};
 const cx=$("#cx");if(cx)cx.onclick=()=>{AGTAB="feed";agentView()};
 $("#agf").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(!areas.length)return $("#agerr").textContent="Pick at least one area you cover.";
  try{DB.saveAgentProfile({...d,agreement:!!d.agreement,baseCity:city,areas,availability:av,licenceType:lic,licenceNo:lic==="none"?"":d.licenceNo,docs});toast(first?"Application sent. REZ will review it.":rej?"Resubmitted. REZ will review it again.":"Profile saved");AGTAB="feed";agentView();route2()}catch(x){$("#agerr").textContent=x.message}};
}
function reportSheet(t){const l=DB.listing(t.listingId),u=DB.user();let rec="pass",photos=[],pmeta=[],docs=[];const folder=`evidence/REZ/inspections/${t.id}`;
 sheet(`<h3>Inspection report</h3><p class="note" style="margin:0"><b>${esc(l.title)}</b> · ${esc(l.address)}, ${esc(l.city)}<br>Listing says: rent ${K(l.rent)}, deposit ${K(l.deposit)}, ${l.upfront} month(s) upfront, yard ${esc(l.yard||"—")}, amenities ${esc((l.amenities||[]).join(", ")||"none")}</p>
 <form class="f" id="rpf"><span class="lbl">Checklist</span>${CHECKS.map(([k,t])=>`<label class="ck"><input type="checkbox" name="${k}">${t}</label>`).join("")}
 <span class="lbl">Your recommendation</span><div class="seg" id="rrec"><button type="button" class="on" data-r="pass">✓ Verify it</button><button type="button" data-r="fail">✕ Doesn't match</button></div>
 <span class="lbl">Date visited</span><input type="date" name="visitedAt" required value="${esc(t.visitDate||"")}"><textarea name="notes" rows="3" required placeholder="Notes: what matched, what didn't, who you met"></textarea>
 <span class="lbl">Evidence photos from your visit (at least 1)</span><input type="file" id="rph" accept="image/*" multiple><div class="thumbs" id="rth"></div>
 <span class="lbl">Evidence documents (optional)</span><input type="file" id="rdocs" accept=".pdf,.doc,.docx,image/*" multiple><div id="rdl"></div><small class="note" style="margin:-4px 0 0">e.g. the lease, a caretaker letter or a utility bill the landlord showed you. Only the file name is saved on this device for now.</small>
 <p class="note" style="margin:0">Submitting as ${esc(u.name)} · inspector ID <b>${esc(DB.certFor(u.id)?.no||"none")}</b></p>
 <p class="note" id="rperr" style="color:#c33;margin:0"></p><button class="pill pill-green">Submit report</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 $("#rrec").onclick=e=>{const b=e.target.closest("button");if(!b)return;$("#rrec").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");rec=b.dataset.r};
 $("#rph").onchange=async e=>{for(const f of [...e.target.files].slice(0,4)){photos.push(await compress(f));pmeta.push(docMeta(f,"photo",folder))}$("#rth").innerHTML=photos.map(p=>`<img src="${p}">`).join("")};
 const pd=()=>{$("#rdl").innerHTML=docList(docs,true);$("#rdl").querySelectorAll("[data-rmdoc]").forEach(b=>b.onclick=()=>{docs=docs.filter(d=>d.id!==b.dataset.rmdoc);pd()})};
 $("#rdocs").onchange=e=>{for(const f of [...e.target.files].slice(0,6))docs.push(docMeta(f,"other",folder));e.target.value="";pd()};
 $("#cx").onclick=closeSheet;
 $("#rpf").onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(!photos.length)return $("#rperr").textContent="Add at least one photo from your visit.";
  const checks=Object.fromEntries(CHECKS.map(([k])=>[k,!!d[k]]));if(rec==="pass"&&!Object.values(checks).every(Boolean))return $("#rperr").textContent="To recommend verifying, every checklist item must be ticked. Otherwise choose “Doesn't match”.";
  try{DB.submitReport(t.id,{checks,recommendation:rec,visitedAt:d.visitedAt,notes:d.notes,photos,photoFiles:pmeta,docs});closeSheet();toast("Report submitted to REZ");agentView()}catch(x){$("#rperr").textContent=x.message}}}
function reviewSheet(t){const l=DB.listing(t.listingId),a=DB.userById(t.agentId),r=t.report,u=DB.user();
 sheet(`<h3>Review report: ${esc(l.title)}</h3><p class="note" style="margin:0">By ${esc(a.name)} (field agent) · visited ${esc(D(r.visitedAt))} · recommends <b>${r.recommendation==="pass"?"✓ Verify":"✕ Reject"}</b></p>
 <div class="list">${CHECKS.map(([k,tx])=>`<div class="it"><span>${tx}</span><b style="color:${r.checks[k]?"var(--g)":"#c33"}">${r.checks[k]?"✓ Yes":"✕ No"}</b></div>`).join("")}</div>
 <p class="amsg">${esc(r.notes)}</p><div class="thumbs">${(r.photos||[]).map(p=>`<img src="${p}">`).join("")}</div>${r.docs&&r.docs.length?`<span class="lbl">Evidence documents</span>${docList(r.docs)}`:""}
 <p class="note" style="margin:0">Inspector certificate: <b>${esc(r.certNo||"none (v4 report)")}</b>${r.certNo?` · ${esc(CERTSTL[DB.certStatus(DB.certificate(r.certNo))])}`:""}</p>
 <form class="f" id="rvf"><input name="note" placeholder="Note (required if sending back)"><p class="note" style="margin:0">Approving ${r.recommendation==="pass"?"sets the property to <b>Verified</b> for 12 months":"marks the property <b>Rejected</b>"} and adds ${K(t.commission)} to ${esc(a.name)}'s pending earnings.</p><p class="note" id="rverr" style="color:#c33;margin:0"></p>
 <button class="pill pill-green" data-d="approve">Approve report</button><button class="pill pill-ghost" data-d="return">Send back to agent</button><button type="button" class="pill pill-ghost" id="cx">Cancel</button></form>`);
 let dec="approve";$("#rvf").querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>dec=b.dataset.d);$("#cx").onclick=closeSheet;
 $("#rvf").onsubmit=e=>{e.preventDefault();const note=new FormData(e.target).get("note");if(dec==="return"&&!note)return $("#rverr").textContent="Say what the agent should fix.";
  try{DB.reviewReport(t.id,dec,{by:u.name,note});closeSheet();toast(dec==="approve"?(r.recommendation==="pass"?"Approved · property Verified":"Approved · property rejected"):"Sent back to agent");admin()}catch(x){$("#rverr").textContent=x.message}}}

// ---------- v5: REZ Certified Inspector certificate (HTML print view) ----------
const LOGO_SVG=`<svg class="cert-logo" viewBox="0 0 120 80" width="120" height="80" role="img" aria-label="REZ"><path d="M8 36 L60 6 L112 36" fill="none" stroke="#F2B705" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><rect x="84" y="10" width="9" height="16" rx="2" fill="#F2B705"/><text x="60" y="74" text-anchor="middle" font-family="Inter,Arial,Helvetica,sans-serif" font-weight="900" font-size="38" letter-spacing="1" fill="#0B8A4A">REZ</text></svg>`;
const CERT_CSS=`.cert{background:#fff;border-radius:18px;box-shadow:0 10px 40px rgba(14,26,20,.12);padding:14px;max-width:900px;margin:0 auto 24px;font-family:Inter,Arial,Helvetica,sans-serif;color:#0E1A14;position:relative;overflow:hidden}
.cert-in{border:3px solid #0B8A4A;outline:2px solid #F2B705;outline-offset:-10px;border-radius:12px;padding:34px 36px 22px;text-align:center;position:relative}
.cert-top{display:flex;align-items:center;justify-content:center;gap:14px}.cert-logo{width:96px;height:64px}.cert-org{text-align:left;font-weight:800;font-size:15px;line-height:1.2}.cert-org small{display:block;font-weight:500;color:#6B7A72;font-size:12px}
.cert-kicker{margin:18px 0 0;letter-spacing:.32em;text-transform:uppercase;font-size:12px;font-weight:800;color:#b38600}
.cert-title{margin:4px 0 0;font-size:40px;line-height:1.1;font-weight:900;color:#0B8A4A;letter-spacing:-1px}
.cert-lead{margin:18px 0 2px;color:#6B7A72;font-size:14px}.cert-name{margin:0;font-size:32px;font-weight:800;border-bottom:2px solid #F2B705;display:inline-block;padding:0 18px 4px}
.cert-body{max-width:620px;margin:14px auto 0;font-size:15px;line-height:1.55}
.cert-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0 0;text-align:left}.cert-grid div{background:#F6F8F7;border-radius:10px;padding:10px 12px}.cert-grid small{display:block;font-size:11px;color:#6B7A72;text-transform:uppercase;letter-spacing:.06em}.cert-grid b{font-size:15px}
.cert-grid .s-valid{color:#0B8A4A}.cert-grid .s-bad{color:#b42318}
.cert-sign{display:flex;justify-content:space-between;align-items:flex-end;margin-top:22px;text-align:left}.sigline{display:block;width:220px;border-bottom:1.5px solid #0E1A14;height:30px}.cert-sign small{color:#6B7A72;font-size:12px}
.seal{width:74px;height:74px;border-radius:50%;background:#0B8A4A;color:#fff;border:4px solid #F2B705;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:26px;font-weight:900;line-height:1}.seal small{font-size:11px;letter-spacing:.1em;color:#F2B705;font-weight:800}
.cert-note{margin:18px 0 0;font-size:11.5px;color:#4a5a52;line-height:1.45}.cert-draft{margin:6px 0 0;font-size:10.5px;color:#8a6400}
.cert-void{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:84px;font-weight:900;color:rgba(180,35,24,.18);transform:rotate(-18deg);pointer-events:none;letter-spacing:.08em}
@media(max-width:640px){.cert-in{padding:24px 14px 16px}.cert-title{font-size:28px}.cert-name{font-size:24px}.cert-grid{grid-template-columns:1fr 1fr}.cert-logo{width:72px;height:48px}.cert-void{font-size:52px}}
@media print{@page{size:A4 landscape;margin:10mm}.cert{box-shadow:none;margin:0;max-width:none}}`;
function certHTML(c,st){const ok=st==="valid",url=location.origin+location.pathname+"#/cert/"+c.id;
 return`<div class="cert" id="cert"><div class="cert-in">${ok?"":`<div class="cert-void">${esc(CERTSTL[st]||st).toUpperCase()}</div>`}
 <div class="cert-top">${LOGO_SVG}<div class="cert-org">Real Estate Zambia (REZ)<small>REZ Homes · a Vidmar Holdings company</small></div></div>
 <p class="cert-kicker">Certificate</p><h1 class="cert-title">REZ Certified Inspector</h1>
 <p class="cert-lead">This certifies that</p><p class="cert-name">${esc(c.holder)}</p>
 <p class="cert-body">has been approved by Real Estate Zambia (REZ) to carry out <b>REZ listing inspections</b>: visiting properties advertised on REZ Homes and checking that the photos, rent, deposit and other details match the listing.</p>
 <div class="cert-grid"><div><small>Inspector ID</small><b class="cert-no">${esc(c.no)}</b></div><div><small>Issued</small><b class="cert-iss">${D(c.issued)}</b></div><div><small>Expires</small><b class="cert-exp">${D(c.expires)}</b></div><div><small>Status</small><b class="${ok?"s-valid":"s-bad"}">${esc(CERTSTL[st]||st)}</b></div></div>
 <div class="cert-sign"><div><span class="sigline"></span><small>For REZ · issued by ${esc(c.issuedBy||"REZ staff")}</small></div><div class="seal">✓<small>REZ</small></div></div>
 <p class="cert-note">Not a professional licence. Valid only for REZ listing inspections on the REZ Homes platform. It does not authorise property valuation or estate agency work.</p>
 <p class="cert-draft">Wording ${esc(c.wording||"")} · Check this certificate: ${esc(url)}</p></div></div>`}
function certView(id){const c=DB.certificate(id);
 if(!c){app.innerHTML="<div class='card box' style='margin-top:20px'><h3>Certificate not found</h3><p class='note'>Check the inspector ID, or ask REZ staff if your certificate has been issued.</p></div>";return}
 const st=DB.certStatus(c);if(!$("#certcss")){const t=document.createElement("style");t.id="certcss";t.textContent=CERT_CSS;document.head.appendChild(t)}
 app.innerHTML=`<div class="fade certpage"><div class="btns noprint" style="margin:18px 0 12px"><button class="pill pill-green" id="prt">Print / Save as PDF</button><button class="pill pill-ghost" id="dlc">Download (HTML)</button><a class="pill pill-ghost" href="${isStaff(DB.user())?"#/admin":"#/agent"}">Back</a></div>${certHTML(c,st)}<p class="note noprint">Official wording is confirmed with each inspector when their certificate is issued.</p></div>`;
 $("#prt").onclick=()=>print();
 $("#dlc").onclick=()=>{const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>REZ Certified Inspector · ${esc(c.holder)} · ${esc(c.no)}</title><style>body{margin:0;padding:20px;background:#F6F8F7}${CERT_CSS}</style></head><body>${certHTML(c,st)}</body></html>`;
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([html],{type:"text/html"}));a.download=`REZ-Certified-Inspector-${c.no}.html`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}}


/** Hides the WhatsApp float while scrolling down so it does not cover listings or CTAs. */
function setupWhatsAppFloatBehaviour(){
  const button=document.getElementById("wafloat");
  if(!button||button.dataset.scrollBound)return;
  button.dataset.scrollBound="1";
  let lastY=window.scrollY, ticking=false;
  const update=()=>{
    const y=window.scrollY;
    const goingDown=y>lastY+8;
    const goingUp=y<lastY-8;
    if(y<24)button.classList.remove("scroll-hide");
    else if(goingDown)button.classList.add("scroll-hide");
    else if(goingUp)button.classList.remove("scroll-hide");
    lastY=y; ticking=false;
  };
  addEventListener("scroll",()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
}
setupWhatsAppFloatBehaviour();

// ---------- Router ----------
function route(keep){if(keep!==true)closeSheet();const h=location.hash.replace(/^#\/?/,""),[r,id]=h.split("/");
 if(h==="search"||h==="listings"||h==="pricing"||h==="contact"||h==="agents"){if(!$("#car")){clearMaps();home()}document.getElementById(h==="search"?"search":h)?.scrollIntoView();return}
 clearMaps();if(keep!==true)scrollTo(0,0);({"":home,map:mapView,saved:savedView,account,landlord,admin,inbox,agent:agentView,"agent-info":agentInfoPage,cert:()=>certView(id),l:()=>detail(id)}[r]||home)();
 document.querySelectorAll(".bnav a,.dnav a").forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#/"+(r||"")));
 const u=DB.user(),pb=$("#pbtn");if(pb){pb.textContent=u?(u.name||"?")[0].toUpperCase():"☺";pb.href=u?(isStaff(u)?"#/admin":u.role==="landlord"?"#/landlord":u.role==="agent"?"#/agent":"#/account"):"#/account";pb.title=u?"My profile":"Sign in"}
 route2();
}
addEventListener("hashchange",()=>route());route();
