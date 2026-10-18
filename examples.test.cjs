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
 assert.equal(rows.length,10);
 assert.equal(new Set(rows.map(l=>l.id)).size,10);
 assert.equal(rows.filter(l=>l.purpose==='rent').length,7);
 const app = fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
 const cities = JSON.parse(app.match(/const CITIES=(\[[^;]+\]);/)[1]);
 assert.deepEqual([...new Set(rows.map(l=>l.city))].sort(), cities.sort());
 for (const city of cities) assert.ok(rows.some(l=>l.city===city && l.purpose==='rent'));
 assert.equal(rows.filter(l=>l.purpose==='sale').length,3);
 assert.ok(rows.every(l=>!l.verified && l.owner==='example-owner' && l.disclosure.includes('not real')));
 assert.equal(JSON.parse(store.get('rez_listings'))[0].id,'keep-me');
 assert.equal(vm.runInContext('DB.publicListings("sale").length',context),3);
 assert.ok(vm.runInContext('DB.publicListings().every(l=>l.purpose==="rent")',context));
 assert.throws(()=>vm.runInContext('DB.apply({listingId:"ex-rent-kasama"})',context),/Example properties/);
 assert.throws(()=>vm.runInContext('DB.addEnquiry({listingId:"ex-sale-silverest"})',context),/Example properties/);
 assert.throws(()=>vm.runInContext('DB.createPayment({purpose:"verification",listingId:"ex-rent-kasama"})',context),/Example properties/);
 for(const row of rows) for(const photo of row.photos) assert.ok(fs.existsSync(path.join(__dirname,photo)),photo);
});
