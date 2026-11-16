// Mean/max absolute channel difference between ref and copy in a region: node regiondiff.js <name> x y w h
const fs=require('fs'),{PNG}=require('pngjs');const D=process.env.HOME+'/data/papier-restaurierung';
const [name,x,y,w,h]=process.argv.slice(2);const [X,Y,W,H]=[x,y,w,h].map(Number);
const a=PNG.sync.read(fs.readFileSync(`${D}/ref/${name}.png`)),b=PNG.sync.read(fs.readFileSync(`${D}/copy/${name}.png`));
let sum=0,max=0,n=0;for(let j=Y;j<Y+H;j++)for(let i=X;i<X+W;i++)for(let c=0;c<3;c++){const k=(j*a.width+i)*4+c,d=Math.abs(a.data[k]-b.data[k]);sum+=d;max=Math.max(max,d);n++}
console.log(name,'mean',(sum/n).toFixed(3),'max',max);
