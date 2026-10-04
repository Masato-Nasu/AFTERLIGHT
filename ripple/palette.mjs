export function writePixels(gray,data){for(let i=0;i<gray.length;i++){const g=gray[i];data[i*4]=g*.45+4;data[i*4+1]=g*.78+7;data[i*4+2]=g*.95+10;data[i*4+3]=255;}}
