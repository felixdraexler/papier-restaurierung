// Puts the same region of the reference and the copy side by side: node crop.js <name> x y w h <out.png>
const fs=require('fs'),{PNG}=require('pngjs');const D=process.env.HOME+'/data/papier-restaurierung';
const [name,x,y,w,h,out]=process.argv.slice(2);const [X,Y,W,H]=[x,y,w,h].map(Number);
const o=new PNG({width:W*2+10,height:H});o.data.fill(255);
['ref','copy'].forEach((d,k)=>{const p=PNG.sync.read(fs.readFileSync(`${D}/${d}/${name}.png`));
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const s=((Y+j)*p.width+X+i)*4,t=(j*o.width+k*(W+10)+i)*4;for(let c=0;c<4;c++)o.data[t+c]=p.data[s+c];}});
fs.writeFileSync(out,PNG.sync.write(o));
