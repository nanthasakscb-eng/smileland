export const travelProvinces = [
  ['กาฬสินธุ์', 'kalasin'], ['ขอนแก่น', 'khon-kaen'], ['ชัยภูมิ', 'chaiyaphum'],
  ['นครพนม', 'nakhon-phanom'], ['นครราชสีมา', 'nakhon-ratchasima'], ['บึงกาฬ', 'bueng-kan'],
  ['บุรีรัมย์', 'buri-ram'], ['มหาสารคาม', 'maha-sarakham'], ['มุกดาหาร', 'mukdahan'],
  ['ยโสธร', 'yasothon'], ['ร้อยเอ็ด', 'roi-et'], ['เลย', 'loei'], ['ศรีสะเกษ', 'si-sa-ket'],
  ['สกลนคร', 'sakon-nakhon'], ['สุรินทร์', 'surin'], ['หนองคาย', 'nong-khai'],
  ['หนองบัวลำภู', 'nong-bua-lam-phu'], ['อำนาจเจริญ', 'amnat-charoen'],
  ['อุดรธานี', 'udon-thani'], ['อุบลราชธานี', 'ubon-ratchathani'],
] as const;

export const provinceTravelHref = (slug: string) => `/travel/${slug}/`;
