// First differing row between ref and copy (works for different heights): node firstdiff.js <name>
const fs=require('fs'),{PNG}=require('pngjs');const D=process.env.HOME+'/data/papier-restaurierung';const n=process.argv[2];
const a=PNG.sync.read(fs.readFileSync(`${D}/ref/${n}.png`)),b=PNG.sync.read(fs.readFileSync(`${D}/copy/${n}.png`));
const row=(p,y)=>p.data.subarray(y*p.width*4,(y+1)*p.width*4);
for(let y=0;y<Math.min(a.height,b.height);y++){if(Buffer.compare(row(a,y),row(b,y))){console.log(n,'first diff row',y);break;}}
// from bottom
for(let k=1;k<Math.min(a.height,b.height);k++){if(Buffer.compare(row(a,a.height-k),row(b,b.height-k))){console.log(n,'last equal-from-bottom offset',k,'ref y',a.height-k,'copy y',b.height-k);break;}}
