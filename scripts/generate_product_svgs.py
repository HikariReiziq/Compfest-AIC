import os

def generate_svg(product_id, name, category, hex_color, subtitle):
    # Determine icon / silhouette shape based on category
    if category == "glasses":
        art = f'''
        <g stroke="{hex_color}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="70" y="110" width="105" height="75" rx="20" fill="{hex_color}" fill-opacity="0.15" />
            <rect x="225" y="110" width="105" height="75" rx="20" fill="{hex_color}" fill-opacity="0.15" />
            <path d="M175 140 Q200 130 225 140" />
            <path d="M70 125 L35 115" />
            <path d="M330 125 L365 115" />
            <circle cx="122" cy="147" r="18" fill="white" fill-opacity="0.25" stroke="none" />
            <circle cx="277" cy="147" r="18" fill="white" fill-opacity="0.25" stroke="none" />
        </g>
        '''
    elif category == "hats":
        art = f'''
        <g fill="{hex_color}" stroke="#0f172a" stroke-width="2">
            <!-- Crown -->
            <path d="M120 170 Q110 80 200 75 Q290 80 280 170 Z" fill="{hex_color}" />
            <!-- Hat Band -->
            <path d="M115 160 Q200 150 285 160 L283 175 Q200 165 117 175 Z" fill="#0f172a" fill-opacity="0.75" />
            <!-- Brim -->
            <ellipse cx="200" cy="175" rx="140" ry="32" fill="{hex_color}" fill-opacity="0.9" />
            <ellipse cx="200" cy="175" rx="85" ry="18" fill="#0f172a" fill-opacity="0.2" />
        </g>
        '''
    else: # shirts
        art = f'''
        <g fill="{hex_color}" stroke="#0f172a" stroke-width="2">
            <!-- Torso & Sleeves -->
            <path d="M140 85 L100 120 L50 160 L85 200 L120 170 L120 280 L280 280 L280 170 L315 200 L350 160 L300 120 L260 85 Z" fill="{hex_color}" />
            <!-- Collar cutout -->
            <path d="M155 85 Q200 130 245 85 Z" fill="#0f172a" fill-opacity="0.8" />
            <!-- Fabric folds -->
            <path d="M140 210 Q200 220 260 210" stroke="white" stroke-opacity="0.2" stroke-width="3" fill="none" />
            <path d="M150 245 Q200 255 250 245" stroke="white" stroke-opacity="0.2" stroke-width="3" fill="none" />
        </g>
        '''

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad_{product_id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <radialGradient id="glow_{product_id}" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="{hex_color}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="{hex_color}" stop-opacity="0.0" />
    </radialGradient>
  </defs>

  <rect width="400" height="320" rx="28" fill="url(#bgGrad_{product_id})" />
  <circle cx="200" cy="150" r="130" fill="url(#glow_{product_id})" />

  {art}

  <!-- Badge / Subtitle -->
  <g transform="translate(20, 20)">
    <rect width="90" height="24" rx="12" fill="#1e293b" fill-opacity="0.85" stroke="white" stroke-opacity="0.1" />
    <text x="45" y="16" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="11" font-weight="700" text-anchor="middle">{category.upper()}</text>
  </g>

  <!-- 3D GLB indicator -->
  <g transform="translate(315, 20)">
    <rect width="65" height="24" rx="12" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.4" />
    <text x="347" y="16" fill="#34d399" font-family="system-ui, sans-serif" font-size="10" font-weight="700" text-anchor="middle">3D GLB</text>
  </g>
</svg>'''
    return svg_content

def main():
    preview_dir = "client/public/images/products/preview"
    os.makedirs(preview_dir, exist_ok=True)

    # 1. 20 Glasses
    glasses = [
        ("glass-01", "AeroClassic Wayfarer Black Gold", "#0f172a", "glasses-1-.glb"),
        ("glass-02", "Geometric Minimalist Titanium Frame", "#64748b", "glasses-6.glb"),
        ("glass-03", "Retro Double-Bridge Aviator Rose Gold", "#e11d48", "glasses-7.glb"),
        ("glass-04", "Urban Rectangular Matte Charcoal", "#334155", "glasses-8b.glb"),
        ("glass-05", "Clubmaster Browline Havana Amber", "#d97706", "glasses-9b.glb"),
        ("glass-06", "Vintage Circular Wireframe Antique Gold", "#b45309", "glasses-10.glb"),
        ("glass-07", "Winged Cat-Eye Acetate Burgundy", "#881337", "glasses-11b.glb"),
        ("glass-08", "Bold Square Horn-Rimmed Matte Black", "#18181b", "glasses-12.glb"),
        ("glass-09", "Sport Wrap Aerodynamic Polarized", "#2563eb", "glasses-5b.glb"),
        ("glass-10", "Matrix Oval Metal Ultra-Slim", "#475569", "glasses-5c.glb"),
        ("glass-11", "Aviator Titanium Brushed Chrome", "#94a3b8", "glasses-7b.glb"),
        ("glass-12", "Aviator Gold Amber Gradient", "#f59e0b", "glasses-7c.glb"),
        ("glass-13", "Executive Rectangular Gunmetal", "#1e293b", "glasses-8c.glb"),
        ("glass-14", "Retro Browline Tortoise Emerald", "#059669", "glasses-9c.glb"),
        ("glass-15", "Cat-Eye Glamour Crystal Blush", "#f43f5e", "glasses-11c.glb"),
        ("glass-16", "Minimalist Titanium Rimless Optical", "#64748b", "glasses-13_rimless.glb"),
        ("glass-17", "Statement Oversized Acetate Frame", "#b91c1c", "glasses-14_oversized.glb"),
        ("glass-18", "Architectural Octagonal Wireframe", "#d97706", "glasses-15_octagonal.glb"),
        ("glass-19", "Futuristic Monolens Shield Glass", "#4338ca", "glasses-16_shield.glb"),
        ("glass-20", "Victorian Steampunk Double-Lens", "#78350f", "glasses-17_steampunk.glb"),
    ]

    # 2. 20 Hats
    hats = [
        ("hat-01", "AeroFedora Classic Midnight Charcoal", "#1e293b", "hat_01_fedora.glb"),
        ("hat-02", "StreetBucket Urban Cotton Olive", "#475569", "hat_02_bucket.glb"),
        ("hat-03", "NordicKnit Ribbed Thermal Beanie", "#0f172a", "hat_03_beanie.glb"),
        ("hat-04", "ProAthletic Structured 6-Panel Cap", "#2563eb", "hat_04_baseball_cap.glb"),
        ("hat-05", "Streetwear Flat-Brim Snapback Red", "#dc2626", "hat_05_snapback.glb"),
        ("hat-06", "Parisian Wool Felt Beret Royal", "#4c1d95", "hat_06_beret.glb"),
        ("hat-07", "Heritage Herringbone Ivy Flat Cap", "#78350f", "hat_07_flat_cap.glb"),
        ("hat-08", "Riviera Wide-Brim UV Sun Straw Hat", "#d97706", "hat_08_sun_hat.glb"),
        ("hat-09", "Outback Leather Cattleman Western Hat", "#b45309", "hat_09_cowboy.glb"),
        ("hat-10", "Montecristi Fine Toquilla Panama Hat", "#fef3c7", "hat_10_panama.glb"),
        ("hat-11", "Performance Tennis Court Visor Emerald", "#059669", "hat_11_visor.glb"),
        ("hat-12", "Vintage 8-Panel Gatsby Newsboy Cap", "#334155", "hat_12_newsboy.glb"),
        ("hat-13", "JazzClub Narrow-Brim Wool Trilby", "#1e1b4b", "hat_13_trilby.glb"),
        ("hat-14", "Retro Diamond Crown Porkpie Black", "#18181b", "hat_14_porkpie.glb"),
        ("hat-15", "Arctic Aviator Shearling Trapper", "#854d0e", "hat_15_trapper.glb"),
        ("hat-16", "Harajuku Reversible Tie-Dye Bucket", "#0284c7", "hat_16_bucket_street.glb"),
        ("hat-17", "Collegiate Washed Canvas Dad Hat", "#065f46", "hat_17_vintage_cap.glb"),
        ("hat-18", "Venetian Striped Ribbon Straw Boater", "#fde68a", "hat_18_straw_boater.glb"),
        ("hat-19", "Explorer Expedition Breathable Safari", "#a16207", "hat_19_safari_hat.glb"),
        ("hat-20", "Victorian Hard-Felt Bowler Derby Hat", "#09090b", "hat_20_bowler.glb"),
    ]

    # 3. 20 Shirts
    shirts = [
        ("shirt-01", "Essential Supima Heavyweight Crewneck", "#0284c7", "shirt_01_crewneck_tee.glb"),
        ("shirt-02", "Tailored Luxe Modal V-Neck Tee", "#334155", "shirt_02_vneck_tee.glb"),
        ("shirt-03", "Pique Cotton Oxford Classic Polo", "#059669", "shirt_03_polo_classic.glb"),
        ("shirt-04", "Royal Oxford Pinpoint Dress Shirt", "#f8fafc", "shirt_04_oxford_formal.glb"),
        ("shirt-05", "Mediterranean Pure French Linen Shirt", "#fef08a", "shirt_05_linen_casual.glb"),
        ("shirt-06", "Northwest Brushed Buffalo Plaid Flannel", "#dc2626", "shirt_06_flannel_plaid.glb"),
        ("shirt-07", "Boxy Heavyweight 480GSM Street Hoodie", "#18181b", "shirt_07_hoodie_streetwear.glb"),
        ("shirt-08", "Merino Wool Cable-Knit Crew Sweater", "#c2410c", "shirt_08_sweater_knit.glb"),
        ("shirt-09", "Fine Gauge Ribbed Silk Turtleneck", "#3b0764", "shirt_09_turtleneck.glb"),
        ("shirt-10", "Vintage Waffle Thermal Button Henley", "#475569", "shirt_10_henley_longsleeve.glb"),
        ("shirt-11", "Minimalist Dropped-Shoulder Tee Chalk", "#e2e8f0", "shirt_11_oversized_tee.glb"),
        ("shirt-12", "Cyberpunk Neo-Tokyo Screenprint Tee", "#0f172a", "shirt_12_graphic_tee.glb"),
        ("shirt-13", "Selvedge Indigo Western Denim Shirt", "#1d4ed8", "shirt_13_denim_shirt.glb"),
        ("shirt-14", "Havana Camp-Collar Resort Silk Shirt", "#0d9488", "shirt_14_cuban_collar.glb"),
        ("shirt-15", "Zen Grandad Banded Collar Linen Shirt", "#f1f5f9", "shirt_15_mandarin_collar.glb"),
        ("shirt-16", "Seamless AeroVent Pro Athletic Top", "#4f46e5", "shirt_16_athletic_dryfit.glb"),
        ("shirt-17", "Nautical Breton Striped Longsleeve", "#1e3a8a", "shirt_17_striped_breton.glb"),
        ("shirt-18", "Tropical Botanical Aloha Camp Shirt", "#ea580c", "shirt_18_hawaiian_resort.glb"),
        ("shirt-19", "Alpaca V-Neck Ribbed Button Cardigan", "#57534e", "shirt_19_cardigan_button.glb"),
        ("shirt-20", "Workwear Double-Pocket Chambray Shirt", "#2563eb", "shirt_20_chambray_utility.glb"),
    ]

    all_items = [(g[0], g[1], "glasses", g[2], "GLB 3D") for g in glasses] + \
                [(h[0], h[1], "hats", h[2], "GLB 3D") for h in hats] + \
                [(s[0], s[1], "shirts", s[2], "GLB 3D") for s in shirts]

    for pid, name, cat, hex_col, sub in all_items:
        svg_code = generate_svg(pid, name, cat, hex_col, sub)
        with open(os.path.join(preview_dir, f"{pid}.svg"), "w", encoding="utf-8") as f:
            f.write(svg_code)

    print(f"Generated {len(all_items)} SVG previews in {preview_dir}")

if __name__ == "__main__":
    main()
