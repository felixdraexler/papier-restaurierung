// Lists the row bands (with x-extent) where a pixelmatch diff image has differing pixels.
const fs=require('fs'),{PNG}=require('pngjs');
for(const f of process.argv.slice(2)){
  const p=PNG.sync.read(fs.readFileSync(f));const bands=[];let cur=null;
  for(let y=0;y<p.height;y++){let x0=-1,x1=-1,n=0;
    for(let x=0;x<p.width;x++){const i=(y*p.width+x)*4;if(p.data[i]===255&&p.data[i+1]===0&&p.data[i+2]===0){n++;if(x0<0)x0=x;x1=x;}}
    if(n){if(cur&&y-cur.y1<=20){cur.y1=y;cur.x0=Math.min(cur.x0,x0);cur.x1=Math.max(cur.x1,x1);cur.n+=n}else{cur={y0:y,y1:y,x0,x1,n};bands.push(cur)}}}
  console.log(f.split('/').pop(), bands.map(b=>`y${b.y0}-${b.y1} x${b.x0}-${b.x1} n${b.n}`).join(' | '));
}
