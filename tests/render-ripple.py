# Usage: python tests/render-ripple.py <directory of .gray> <frames per second> <output.mp4>
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import subprocess, sys
folder, fps, output=sys.argv[1:]
proc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','760x760','-framerate',fps,'-i','pipe:0','-vf','scale=360:360','-r','30','-c:v','libx264','-crf','28','-pix_fmt','yuv420p',output],stdin=subprocess.PIPE)
try:
 for f in sorted(Path(folder).glob('*.gray')):
  gray=np.frombuffer(f.read_bytes(),dtype=np.uint8).reshape(512,512)
  rgb=np.stack([gray*.45+4,gray*.78+7,gray*.95+10],axis=-1).round().astype('uint8')
  im=Image.new('RGB',(760,760),(5,11,21));im.paste(Image.fromarray(rgb).resize((640,640),Image.Resampling.BILINEAR),(60,60));draw=ImageDraw.Draw(im)
  for x,y,c in [(30,30,(245,45,220)),(730,30,(245,230,35)),(730,730,(35,235,65)),(30,730,(25,230,245))]:
   draw.rectangle((x-24,y-24,x+23,y+23),fill=c);draw.rectangle((x-8,y-8,x+7,y+7),fill=(5,5,5))
  proc.stdin.write(im.tobytes())
finally:
 proc.stdin.close()
if proc.wait()!=0:raise RuntimeError('FFmpeg encoding failed')
