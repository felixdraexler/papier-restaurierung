// Compares reference and copy screenshots: node diff.js <refdir> <copydir> <diffdir>
const fs=require('fs'),{PNG}=require('pngjs'),pixelmatch=require('pixelmatch');
const [ref,copy,out]=process.argv.slice(2);
for(const f of fs.readdirSync(ref).filter(f=>f.endsWith('.png'))){
  const a=PNG.sync.read(fs.readFileSync(`${ref}/${f}`)),b=PNG.sync.read(fs.readFileSync(`${copy}/${f}`));
  if(a.width!==b.width||a.height!==b.height){console.log(f,'SIZE',a.width+'x'+a.height,'vs',b.width+'x'+b.height);continue;}
  const d=new PNG({width:a.width,height:a.height});
  const n=pixelmatch(a.data,b.data,d.data,a.width,a.height,{threshold:0});
  fs.writeFileSync(`${out}/${f}`,PNG.sync.write(d));
  console.log(f,n,'px differ');
}
