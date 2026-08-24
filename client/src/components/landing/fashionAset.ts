/**
 * 9 Aset Busana & Aksesori Terpilih yang Ditampilkan pada Homepage COBA.
 *
 * 1. glass01: Khronos PBR Designer Eyewear (Paling Awal)
 * 2. glass04: FaceFit Vintage Browline Classic
 * 3. glass06: FaceFit Horn-Rimmed Retro
 * 4. hat09: Noble Renaissance Velvet Bonnet
 * 5. hat10: Sahara Safari Weathered Pith Helmet
 * 6. hat01: Imperial Bicorn Admiral Hat
 * 7. shirt wanita 01: Boho Off-The-Shoulder Chic Blouse
 * 8. shirt pria 11: Premium Supima Regular Fit T-Shirt
 * 9. shirt pria 05: Resort Breathable Linen Casual Shirt
 */

export interface FashionAset {
  id: string;
  nama: string;
  kategori: string;
  subkategori: 'glasses' | 'hats' | 'shirts';
  status: string;
  warna: string;
  image: string;
  glbPath: string;
  posisi?: [number, number];
  utama: { nilai: number; satuan: string; label: string };
  detail: string;
}

export const FASHION_ASET: FashionAset[] = [
  {
    id: 'hat-09',
    nama: 'Elizabethan Pearl White Beret',
    kategori: 'Topi • Headwear',
    subkategori: 'hats',
    status: 'KOMPATIBILITAS 99.4%',
    warna: '#FDA4AF',
    image: '/images/products/preview/hat-09.png',
    glbPath: '/images/products/hats/renaissance_hat.glb',
    posisi: [0, -12],
    utama: { nilai: 99, satuan: '%', label: 'SKOR PROPORSI KEPALA' },
    detail:
      'Baret beludru putih mutiara khas bangsawan Renaisans dengan hiasan bulu halus dan bros permata elegan.',
  },
  {
    id: 'glass-01',
    nama: 'Khronos Aviator Pilot Sunglasses',
    kategori: 'Kacamata • Eyewear',
    subkategori: 'glasses',
    status: 'KOMPATIBILITAS 99.2%',
    warna: '#38BDF8',
    image: '/images/products/preview/glass-01.png',
    glbPath: '/images/products/glasses/glasses_01_khronos_pbr.glb',
    posisi: [18, -12],
    utama: { nilai: 99, satuan: '%', label: 'SKOR BENTUK WAJAH' },
    detail:
      'Bingkai double-bridge silver chrome dengan lensa hitam pekat menyeimbangkan proporsi wajah bulat dan oval secara presisi.',
  },
  {
    id: 'glass-04',
    nama: 'Vintage Round Bronze Metal',
    kategori: 'Kacamata • Eyewear',
    subkategori: 'glasses',
    status: 'KOMPATIBILITAS 98.6%',
    warna: '#FB7185',
    image: '/images/products/preview/glass-04.png',
    glbPath: '/images/products/glasses/glasses_04_facefit_browline.glb',
    posisi: [12, -12],
    utama: { nilai: 99, satuan: '%', label: 'SKOR BENTUK WAJAH' },
    detail:
      'Bingkai bulat klasik logam perunggu retro dengan lensa gelap yang menonjolkan karakter artistik dan proporsi wajah bersiku.',
  },
  {
    id: 'glass-06',
    nama: 'Steampunk Flip-Up Chrome',
    kategori: 'Kacamata • Eyewear',
    subkategori: 'glasses',
    status: 'KOMPATIBILITAS 96.8%',
    warna: '#F43F5E',
    image: '/images/products/preview/glass-06.png',
    glbPath: '/images/products/glasses/glasses_06_facefit_hornrimmed.glb',
    posisi: [6, -12],
    utama: { nilai: 97, satuan: '%', label: 'SKOR PROPORSI RAHANG' },
    detail:
      'Kacamata steampunk dengan mekanisme flip-up dobel dan bingkai silver metalik unik bernuansa futuristik industrial.',
  },
  {
    id: 'hat-10',
    nama: 'Safari Expedition Pith Helmet',
    kategori: 'Topi • Headwear',
    subkategori: 'hats',
    status: 'KOMPATIBILITAS 94.2%',
    warna: '#FB7185',
    image: '/images/products/preview/hat-10.png',
    glbPath: '/images/products/hats/weathered_pith_hat.glb',
    posisi: [-6, -12],
    utama: { nilai: 94, satuan: '%', label: 'SKOR OUTDOOR SHIELD' },
    detail:
      'Topi safari penjelajah bernuansa khaki gurun yang dilengkapi kacamata goggle pilot kulit untuk petualangan alam.',
  },
  {
    id: 'hat-01',
    nama: 'Napoleonic Officer Bicorne Hat',
    kategori: 'Topi • Headwear',
    subkategori: 'hats',
    status: 'KOMPATIBILITAS 97.1%',
    warna: '#F43F5E',
    image: '/images/products/preview/hat-01.png',
    glbPath: '/images/products/hats/bicorn_hat.glb',
    posisi: [-12, -12],
    utama: { nilai: 97, satuan: '%', label: 'SKOR STATEMENT FIT' },
    detail:
      'Topi perwira era Napoleon klasik berbalut beludru hitam dengan aksen pita kokade merah-putih-biru autentik.',
  },
  {
    id: 'shirt-wanita-01',
    nama: 'Sky Blue Ruffle Off-Shoulder Top',
    kategori: 'Baju • Apparel',
    subkategori: 'shirts',
    status: 'KOMPATIBILITAS 98.9%',
    warna: '#93C5FD',
    image: '/images/products/preview/shirt-wanita-01.png',
    glbPath: '/images/products/shirts/Wanita/off_the_shoulder_shirt_-_ngchipv.glb',
    posisi: [-12, 12],
    utama: { nilai: 99, satuan: '%', label: 'SKOR RONA KULIT' },
    detail:
      'Atasan crop off-shoulder beraksen ruffle lembut dengan rajutan smocked elastis berwarna biru langit feminin.',
  },
  {
    id: 'shirt-pria-11',
    nama: 'Nautical Breton Striped Polo',
    kategori: 'Baju • Apparel',
    subkategori: 'shirts',
    status: 'KOMPATIBILITAS 99.1%',
    warna: '#38BDF8',
    image: '/images/products/preview/shirt-pria-11.png',
    glbPath: '/images/products/shirts/Pria/t-shirt.glb',
    posisi: [0, 12],
    utama: { nilai: 44, satuan: 'cm', label: 'LEBAR BAHU (SPAN)' },
    detail:
      'Kaus polo berkerah dengan motif garis horizontal biru dongker dan putih khas gaya pelaut maritim klasik.',
  },
  {
    id: 'shirt-pria-05',
    nama: 'Heritage Tartan Flannel Shirt',
    kategori: 'Baju • Apparel',
    subkategori: 'shirts',
    status: 'KOMPATIBILITAS 98.2%',
    warna: '#F43F5E',
    image: '/images/products/preview/shirt-pria-05.png',
    glbPath: '/images/products/shirts/Pria/mens_casual_shirt.glb',
    posisi: [12, 12],
    utama: { nilai: 44, satuan: 'cm', label: 'LEBAR BAHU (SPAN)' },
    detail:
      'Kemeja flanel tebal bermotif tartan klasik hitam-putih dengan aksen garis merah tajam yang maskulin dan hangat.',
  },
];
