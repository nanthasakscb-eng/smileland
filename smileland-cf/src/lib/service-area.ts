/** จังหวัดที่เปิดให้บริการในภาคอีสาน */
export const SERVICE_PROVINCES = [30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49];
export const inServiceArea = (code: number) => SERVICE_PROVINCES.includes(code);
