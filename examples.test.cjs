const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function load(search) {
 const store = new Map([['rez_listings', JSON.stringify([{id:'keep-me',vstatus:'draft',owner:'local-owner',title:'My saved draft'}])]]);
 const context = vm.createContext({URLSearchParams,Date,Math,window:{REZ_CONFIG:{}},location:{search},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},sessionStorage:{getItem:()=>null,setItem:()=>{}}});
 for(const file of ['examples.js','data.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),context);
 return {context,store};
}
test('example properties are opt-in and never replace saved local listings',()=>{
 const normal = load('');
 assert.equal(vm.runInContext('DB.publicListings().length',normal.context),0);
 const {context,store} = load('?examples=1');
 const rows = vm.runInContext('DB.listings().filter(l=>l.sample)',context);
 assert.equal(rows.length,7);
 assert.equal(new Set(rows.map(l=>l.id)).size,7);
 assert.equal(rows.filter(l=>l.purpose==='rent').length,7);
 const app = fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
 const cities = JSON.parse(app.match(/const CITIES=(\[[^;]+\]);/)[1]);
 assert.deepEqual([...new Set(rows.map(l=>l.city))].sort(), cities.sort());
 for (const city of cities) assert.ok(rows.some(l=>l.city===city && l.purpose==='rent'));
 assert.ok(rows.every(l=>l.purpose==='rent' && l.rent>0 && !Object.hasOwn(l,'salePrice')));
 assert.ok(!app.includes('salePrice') && !app.includes('For sale') && !app.includes('Asking price'));
 assert.ok(rows.every(l=>!l.verified && l.owner==='example-owner' && l.disclosure.includes('not real')));
 assert.equal(JSON.parse(store.get('rez_listings'))[0].id,'keep-me');
 assert.equal(vm.runInContext('DB.publicListings().length',context),7);
 assert.ok(vm.runInContext('DB.publicListings().every(l=>l.purpose==="rent")',context));
 assert.throws(()=>vm.runInContext('DB.apply({listingId:"ex-rent-kasama"})',context),/Example properties/);
 assert.throws(()=>vm.runInContext('DB.addEnquiry({listingId:"ex-rent-chalala"})',context),/Example properties/);
 assert.throws(()=>vm.runInContext('DB.createPayment({purpose:"verification",listingId:"ex-rent-kasama"})',context),/Example properties/);
 const draft = vm.runInContext('DB.addListing({title:"Landlord sets own rent",owner:"local-owner",city:"Lusaka",rent:4321,deposit:2000,upfront:1},{draft:true})',context);
 assert.equal(draft.rent,4321);
 assert.equal(vm.runInContext('DB.listings().find(l=>l.title==="Landlord sets own rent").rent',context),4321);
 assert.ok(app.includes('placeholder="Monthly rent (K)"') && app.includes('rent:+d.rent'));
 for(const row of rows) for(const photo of row.photos) assert.ok(fs.existsSync(path.join(__dirname,photo)),photo);
});
