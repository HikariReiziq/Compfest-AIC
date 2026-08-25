from PIL import Image
import colorsys

def convert_blue_to_pink(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            # RGB to HSV (0.0 - 1.0)
            h_val, s_val, v_val = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            h_deg = h_val * 360.0
            
            # Blue range is approx 170° to 270°
            # We want to convert this into vibrant pink/rose (around 325° - 345°)
            if 165 <= h_deg <= 275 and s_val > 0.12:
                # Shift blue (~215) to pink (~335)
                # Offset by +120° (or +0.333 in 0-1 range)
                new_h = (h_deg + 120.0) % 360.0
                # Give a tiny boost to vibrancy for luxury pink
                new_s = min(1.0, s_val * 1.05)
                new_v = v_val
                
                nr, ng, nb = colorsys.hsv_to_rgb(new_h / 360.0, new_s, new_v)
                pixels[x, y] = (int(round(nr * 255)), int(round(ng * 255)), int(round(nb * 255)), a)
                
    img.save(out_path, "PNG")
    print(f"Successfully generated: {out_path}")

convert_blue_to_pink("client/public/images/mascot.png", "client/public/images/mascot-pink.png")
convert_blue_to_pink("client/public/images/logo.png", "client/public/images/logo-pink.png")
